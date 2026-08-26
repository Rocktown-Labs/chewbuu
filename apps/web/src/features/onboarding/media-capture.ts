export interface MediaCaptureSession {
  errorPromise: Promise<void>;
  mimeType: string;
  stop: () => Promise<Blob>;
}

const getExtension = (mimeType: string) =>
  mimeType.includes("mp4") ? "mp4" : "webm";

/**
 * Creates a synchronized audio/video capture session using MediaBunny. The
 * dynamic import keeps the media processing bundle out of the onboarding
 * route until the user actually opens the recorder.
 */
export async function createMediaCaptureSession(
  stream: MediaStream
): Promise<MediaCaptureSession> {
  const {
    BufferTarget,
    getFirstEncodableAudioCodec,
    getFirstEncodableVideoCodec,
    MediaStreamAudioTrackSource,
    MediaStreamVideoTrackSource,
    Mp4OutputFormat,
    Output,
    Quality,
    WebMOutputFormat,
  } = await import("mediabunny");

  const [videoTrack] = stream.getVideoTracks();
  const [audioTrack] = stream.getAudioTracks();
  if (!videoTrack || !audioTrack) {
    throw new Error("A camera and microphone track are required.");
  }

  const mp4Format = new Mp4OutputFormat();
  const mp4VideoCodec = await getFirstEncodableVideoCodec(["avc"], {
    width: 1280,
    height: 720,
  });
  const mp4AudioCodec = await getFirstEncodableAudioCodec(["aac"]);

  const useMp4 = Boolean(mp4VideoCodec && mp4AudioCodec);
  const format = useMp4 ? mp4Format : new WebMOutputFormat();
  const videoCodec = useMp4
    ? mp4VideoCodec
    : await getFirstEncodableVideoCodec(["vp9", "vp8"]);
  const audioCodec = useMp4
    ? mp4AudioCodec
    : await getFirstEncodableAudioCodec(["opus"]);

  if (!videoCodec || !audioCodec) {
    throw new Error("This browser cannot encode synchronized video and audio.");
  }

  const target = new BufferTarget();
  const output = new Output({ format, target });
  const videoSource = new MediaStreamVideoTrackSource(videoTrack, {
    codec: videoCodec,
    quality: new Quality("medium"),
  });
  const audioSource = new MediaStreamAudioTrackSource(audioTrack, {
    codec: audioCodec,
    quality: new Quality("medium"),
  });

  output.addVideoTrack(videoSource);
  output.addAudioTrack(audioSource);
  await output.start();

  let isStopped = false;
  return {
    errorPromise: Promise.race([
      videoSource.errorPromise,
      audioSource.errorPromise,
    ]),
    mimeType: format.mimeType,
    stop: async () => {
      if (!isStopped) {
        isStopped = true;
        await output.finalize();
      }
      const { buffer } = target;
      if (!buffer) throw new Error("The recording did not produce a file.");
      return new Blob([buffer], { type: format.mimeType });
    },
  };
}

export const createMediaFile = (blob: Blob) =>
  new File([blob], `intro-video.${getExtension(blob.type)}`, {
    type: blob.type,
  });

export async function hasAudioTrack(blob: Blob): Promise<boolean> {
  const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(blob),
  });
  const tracks = await input.getTracks();
  return tracks.some((track) => track.isAudioTrack());
}
