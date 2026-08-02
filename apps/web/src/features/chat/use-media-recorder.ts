import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderMode = "video" | "voice";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "recording"
  | "stopped"
  | "error";

export interface RecordedClip {
  blob: Blob;
  durationSec: number;
  kind: RecorderMode;
  objectUrl: string;
  thumbUrl?: string;
}

interface UseMediaRecorderOptions {
  maxSeconds?: number;
  mode: RecorderMode;
}

export function useMediaRecorder({
  maxSeconds = 120,
  mode,
}: UseMediaRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [clip, setClip] = useState<RecordedClip | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopTracks = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    setPreviewStream(null);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
    setClip((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
      return null;
    });
    setElapsedSec(0);
    setError(null);
    setStatus("idle");
  }, [stopTracks]);

  useEffect(() => () => reset(), [reset]);

  const requestStream = useCallback(async () => {
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      streamRef.current = stream;
      setPreviewStream(stream);
      setStatus("ready");
      return stream;
    } catch {
      setError(
        mode === "video"
          ? "Camera/mic permission denied. You can still skip demo replies."
          : "Microphone permission denied. You can still send text."
      );
      setStatus("error");
      return null;
    }
  }, [mode]);

  const start = useCallback(async () => {
    reset();
    const stream = streamRef.current ?? (await requestStream());
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? mode === "video"
        ? "video/webm;codecs=vp9"
        : "audio/webm"
      : mode === "video"
        ? "video/webm"
        : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      clearTimer();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      const durationSec = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );
      setClip({
        blob,
        durationSec,
        kind: mode,
        objectUrl,
        thumbUrl: mode === "video" ? objectUrl : undefined,
      });
      setStatus("stopped");
      stopTracks();
    };

    recorder.start(250);
    startedAtRef.current = Date.now();
    setElapsedSec(0);
    setStatus("recording");
    timerRef.current = window.setInterval(() => {
      const next = Math.round((Date.now() - startedAtRef.current) / 1000);
      setElapsedSec(next);
      if (next >= maxSeconds) {
        recorder.stop();
      }
    }, 250);
  }, [maxSeconds, mode, requestStream, reset, stopTracks]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  return {
    cancel,
    clip,
    elapsedSec,
    error,
    previewStream,
    requestStream,
    reset,
    start,
    status,
    stop,
  };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
