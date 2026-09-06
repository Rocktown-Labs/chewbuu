import { api } from "@chewbuu/aws-blocks";
import type {
  DateSafetyAction,
  DateSafetyActionResponse,
  DateSafetyStatusResponse,
} from "@chewbuu/aws-blocks";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import {
  Building2,
  LifeBuoy,
  Loader2,
  MapPin,
  PhoneCall,
  ShieldAlert,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { dateSafetyApi } from "@/lib/date-safety-api";

const requestCurrentPosition = (
  onError: (error: Error) => void,
  onSuccess: (position: GeolocationPosition) => void
) => {
  if (!navigator.geolocation) {
    onError(new Error("Location services are not available."));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (error) => onError(new Error(error.message)),
    {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 10_000,
    }
  );
};

const actionLabels: Record<DateSafetyAction, string> = {
  call_authorities: "Call emergency services",
  contact_emergency_contact: "Contact my emergency person",
  contact_venue: "Ask the restaurant for help",
  start_recording: "Start a safety recording",
};

export function DateSafetyHelp({
  dateRequestId,
  compact = false,
}: {
  compact?: boolean;
  dateRequestId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="rounded-full"
        onClick={() => setOpen(true)}
        size={compact ? "sm" : "default"}
        type="button"
        variant={compact ? "outline" : "destructive"}
      >
        <LifeBuoy data-icon="inline-start" />
        Help
      </Button>
      <DateSafetyDialog
        dateRequestId={dateRequestId}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  );
}

function DateSafetyDialog({
  dateRequestId,
  onOpenChange,
  open,
}: {
  dateRequestId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DateSafetyStatusResponse | null>(null);
  const [result, setResult] = useState<DateSafetyActionResponse | null>(null);
  const [pendingAction, setPendingAction] = useState<DateSafetyAction | null>(
    null
  );
  const [confirmAuthorities, setConfirmAuthorities] = useState(false);
  const [confirmRecording, setConfirmRecording] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus(null);
    setResult(null);
    setError(null);
    setRecordingDone(false);
    setRecordingError(null);
    setConfirmAuthorities(false);
    setConfirmRecording(false);

    const loadStatus = async (position: GeolocationPosition) => {
      const nextCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      try {
        const nextStatus = await dateSafetyApi.getStatus({
          dateRequestId,
          ...nextCoordinates,
        });
        if (cancelled) return;
        setCoordinates(nextCoordinates);
        setStatus(nextStatus);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not verify your location."
        );
      }
    };

    requestCurrentPosition(
      (positionError) => {
        if (!cancelled) setError(positionError.message);
      },
      (position) => {
        void loadStatus(position);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [dateRequestId, open]);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      for (const track of streamRef.current?.getTracks() ?? []) {
        track.stop();
      }
    },
    []
  );

  const executeAction = async (action: DateSafetyAction) => {
    if (!coordinates) return null;
    setPendingAction(action);
    setError(null);
    try {
      const response = await dateSafetyApi.requestAction({
        action,
        confirmed: true,
        dateRequestId,
        ...coordinates,
      });
      setResult(response);
      return response;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not start this safety action."
      );
      return null;
    } finally {
      setPendingAction(null);
    }
  };

  const startLocalRecording = async () => {
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error("This browser cannot record safety video.");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const response = await executeAction("start_recording");
      if (!response) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }
      const recordingStream = stream;
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(recordingStream, { mimeType });
      const chunks: Blob[] = [];
      const startedAt = new Date().toISOString();
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        for (const track of recordingStream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        void uploadRecording(blob, response.incidentId, startedAt);
      };
      recorder.start();
      setRecording(true);
      toast.success("Safety recording started on this device.");
    } catch (recordingStartError) {
      for (const track of streamRef.current?.getTracks() ??
        stream?.getTracks() ??
        []) {
        track.stop();
      }
      streamRef.current = null;
      setRecordingError(
        recordingStartError instanceof Error
          ? recordingStartError.message
          : "Could not start recording."
      );
    }
  };

  const uploadRecording = async (
    blob: Blob,
    incidentId: string,
    startedAt: string
  ) => {
    try {
      const upload = await api.createMediaUpload({
        contentType: blob.type || "video/webm",
        fileName: `safety-${Date.now()}.webm`,
        slot: "safety_recording",
      });
      const response = await fetch(upload.uploadUrl, {
        body: blob,
        headers: { "content-type": blob.type || "video/webm" },
        method: "PUT",
      });
      if (!response.ok) throw new Error("Safety recording upload failed.");
      await dateSafetyApi.completeRecording({
        contentType: blob.type || "video/webm",
        dateRequestId,
        incidentId,
        startedAt,
        url: upload.pathname,
      });
      setRecordingDone(true);
      toast.success("Safety recording saved securely.");
    } catch (uploadError) {
      setRecordingError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not save safety recording."
      );
    }
  };

  const handleRecording = async () => {
    setConfirmRecording(false);
    await startLocalRecording();
  };

  const handleAuthorityCall = async () => {
    const response = await executeAction("call_authorities");
    if (response?.authorityPhone) {
      window.location.assign(`tel:${response.authorityPhone}`);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && recording) {
      toast.message("Stop the recording before closing safety help.");
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LifeBuoy className="size-5 text-destructive" />
            Date safety help
          </DialogTitle>
          <DialogDescription>
            Opening this menu does not contact anyone or start recording. We use
            one location check to confirm you are at the selected venue.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        {!status && !error ? (
          <div className="flex items-center gap-2 rounded-xl border p-4 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" /> Checking the venue
            safety area…
          </div>
        ) : null}

        {status ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {status.venue?.name ?? "Selected venue"}
                </p>
                <p className="text-muted-foreground">{status.message}</p>
                {status.distanceMiles !== null ? (
                  <Badge variant="secondary">
                    {status.distanceMiles} miles from venue
                  </Badge>
                ) : null}
              </div>
            </div>

            {status.eligible ? (
              <div className="grid gap-2">
                <SafetyActionButton
                  disabled={status.trustedContactCount === 0}
                  icon={Users}
                  label={actionLabels.contact_emergency_contact}
                  onClick={() =>
                    void executeAction("contact_emergency_contact")
                  }
                  pending={pendingAction === "contact_emergency_contact"}
                />
                <SafetyActionButton
                  icon={Building2}
                  label={actionLabels.contact_venue}
                  onClick={() => void executeAction("contact_venue")}
                  pending={pendingAction === "contact_venue"}
                />
                <SafetyActionButton
                  icon={Video}
                  label={
                    recording
                      ? "Stop safety recording"
                      : actionLabels.start_recording
                  }
                  onClick={() => {
                    if (recording) {
                      recorderRef.current?.stop();
                    } else {
                      setConfirmRecording(true);
                    }
                  }}
                  pending={pendingAction === "start_recording"}
                />
                <SafetyActionButton
                  danger
                  icon={PhoneCall}
                  label={actionLabels.call_authorities}
                  onClick={() => setConfirmAuthorities(true)}
                  pending={pendingAction === "call_authorities"}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                Chewbuu assistance activates only within the venue safety area.
                If you are in immediate danger, call emergency services
                directly.
              </div>
            )}

            {status.eligible && (
              <p className="text-muted-foreground text-xs">
                {status.recordingNotice} We do not continuously track your
                location.
              </p>
            )}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <p className="font-semibold">{result.message}</p>
            {result.recordingNotice ? (
              <p className="text-muted-foreground text-xs">
                {result.recordingNotice}
              </p>
            ) : null}
            {recordingDone ? (
              <p className="text-emerald-700 text-xs">
                This device’s recording has been saved.
              </p>
            ) : null}
            {result.phoneNumbers?.map((phone) => (
              <a
                className="inline-flex items-center gap-2 font-semibold text-primary underline"
                href={`tel:${phone}`}
                key={phone}
              >
                <PhoneCall className="size-3.5" /> Call {phone}
              </a>
            ))}
            {result.venuePhone ? (
              <a
                className="inline-flex items-center gap-2 font-semibold text-primary underline"
                href={`tel:${result.venuePhone}`}
              >
                <PhoneCall className="size-3.5" /> Call restaurant
              </a>
            ) : null}
          </div>
        ) : null}

        {recordingError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
            {recordingError}
          </div>
        ) : null}

        {confirmRecording ? (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
            <div className="flex items-start gap-3">
              <Video className="mt-0.5 size-5 shrink-0 text-sky-700" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Confirm recording consent</p>
                <p className="text-muted-foreground">
                  Only record when everyone being recorded has agreed and local
                  law allows it. The recording stays on this device until you
                  stop it, then is uploaded securely to this date incident.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => setConfirmRecording(false)}
                type="button"
                variant="outline"
              >
                Go back
              </Button>
              <Button onClick={() => void handleRecording()} type="button">
                I have consent
              </Button>
            </div>
          </div>
        ) : null}

        {confirmAuthorities ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Call emergency services now?</p>
                <p className="text-muted-foreground">
                  Chewbuu will record the safety request and open your phone’s
                  emergency dialer. For immediate danger, calling 911 directly
                  is always appropriate.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => setConfirmAuthorities(false)}
                type="button"
                variant="outline"
              >
                Go back
              </Button>
              <Button
                onClick={() => {
                  setConfirmAuthorities(false);
                  void handleAuthorityCall();
                }}
                type="button"
                variant="destructive"
              >
                Call 911
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function SafetyActionButton({
  danger = false,
  disabled = false,
  icon: Icon,
  label,
  onClick,
  pending,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: typeof Building2;
  label: string;
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <Button
      className="h-auto justify-start gap-3 rounded-xl px-4 py-3 text-left"
      disabled={disabled || pending}
      onClick={onClick}
      type="button"
      variant={danger ? "destructive" : "outline"}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Icon className="size-4" />
      )}
      <span>{label}</span>
    </Button>
  );
}
