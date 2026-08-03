import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
} from "amazon-chime-sdk-js";
import { useEffect, useRef, useState } from "react";

import { chimeApi } from "@/lib/dating-api";

export function StreamMatchRoom({ matchId }: { matchId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;
    let meetingSession: DefaultMeetingSession | undefined;

    const connect = async () => {
      try {
        const credentials = await chimeApi.getMeeting(matchId);
        const logger = new ConsoleLogger("chewbuu-chime", LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        meetingSession = new DefaultMeetingSession(
          new MeetingSessionConfiguration(
            credentials.meeting,
            credentials.attendee
          ),
          logger,
          deviceController
        );

        if (audioRef.current) {
          meetingSession.audioVideo.bindAudioElement(audioRef.current);
        }

        meetingSession.audioVideo.addObserver({
          audioVideoDidStart: () => {
            if (!stopped) setConnected(true);
          },
          videoTileDidUpdate: (tile) => {
            if (!tile.boundAttendeeId || tile.isContent) return;
            const target = tile.localTile
              ? localVideoRef.current
              : remoteVideoRef.current;
            if (target && tile.tileId !== null)
              meetingSession?.audioVideo.bindVideoElement(tile.tileId, target);
          },
        });

        const audioInputs =
          await meetingSession.audioVideo.listAudioInputDevices();
        if (audioInputs[0]) {
          await meetingSession.audioVideo.startAudioInput(
            audioInputs[0].deviceId
          );
        }
        const videoInputs =
          await meetingSession.audioVideo.listVideoInputDevices();
        if (videoInputs[0]) {
          await meetingSession.audioVideo.startVideoInput(
            videoInputs[0].deviceId
          );
        }
        meetingSession.audioVideo.start();
        meetingSession.audioVideo.startLocalVideoTile();
      } catch (error) {
        if (!stopped) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to join video call."
          );
        }
      }
    };

    void connect();
    return () => {
      stopped = true;
      meetingSession?.audioVideo.stop();
    };
  }, [matchId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {error
            ? "Video call unavailable"
            : connected
              ? "Live date"
              : "Joining live date"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="aspect-video rounded-lg bg-muted object-cover"
        >
          <track kind="captions" src="data:text/vtt,WEBVTT" />
        </video>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="aspect-video rounded-lg bg-muted object-cover"
        >
          <track kind="captions" src="data:text/vtt,WEBVTT" />
        </video>
        <audio ref={audioRef} autoPlay aria-label="Date call audio">
          <track kind="captions" src="data:text/vtt,WEBVTT" />
        </audio>
      </CardContent>
    </Card>
  );
}
