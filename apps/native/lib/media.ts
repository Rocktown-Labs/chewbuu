import * as Camera from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { datingApi } from "@/lib/dating-api";

export interface CapturedAsset {
  duration?: number;
  fileName: string;
  mimeType: string;
  uri: string;
}

const pickAsset = async (
  launcher: () => Promise<ImagePicker.ImagePickerResult>
): Promise<CapturedAsset | null> => {
  const result = await launcher();
  const [asset] = result.assets ?? [];
  if (result.canceled || !asset) {
    return null;
  }
  return {
    duration: asset.duration ?? undefined,
    fileName: asset.fileName ?? `chewbuu-${Date.now()}`,
    mimeType: asset.mimeType ?? "application/octet-stream",
    uri: asset.uri,
  };
};

export const captureImage = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission is required to capture a photo.");
  }
  return pickAsset(() =>
    ImagePicker.launchCameraAsync({
      allowsEditing: true,
      mediaTypes: "images",
      quality: 0.85,
    })
  );
};

export const chooseImage = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to choose a photo.");
  }
  return pickAsset(() =>
    ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: "images",
      quality: 0.85,
    })
  );
};

export const captureVideo = async () => {
  const [camera, microphone] = await Promise.all([
    Camera.Camera.requestCameraPermissionsAsync(),
    Camera.Camera.requestMicrophonePermissionsAsync(),
  ]);
  if (!camera.granted || !microphone.granted) {
    throw new Error(
      "Camera and microphone permissions are required for video."
    );
  }
  return pickAsset(() =>
    ImagePicker.launchCameraAsync({
      mediaTypes: "videos",
      videoMaxDuration: 60,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    })
  );
};

const uploadAsset = async (input: {
  asset: CapturedAsset;
  slot: "intro_video" | "photo" | "profile_photo";
}) => {
  const upload = await datingApi.createMediaUpload({
    contentType: input.asset.mimeType,
    fileName: input.asset.fileName,
    slot: input.slot,
  });
  const result = await FileSystem.uploadAsync(
    upload.uploadUrl,
    input.asset.uri,
    {
      headers: { "Content-Type": input.asset.mimeType },
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    }
  );
  if (result.status < 200 || result.status >= 300) {
    throw new Error("The media upload was rejected.");
  }
  return upload;
};

export const uploadProfileImage = async (asset: CapturedAsset) =>
  uploadAsset({ asset, slot: "profile_photo" });

export const uploadIntroVideo = async (asset: CapturedAsset) =>
  uploadAsset({ asset, slot: "intro_video" });

export const uploadDateImage = async (input: {
  dateRequestId: string;
  image: CapturedAsset;
  kind: string;
}) => {
  const upload = await uploadAsset({ asset: input.image, slot: "photo" });
  return datingApi.uploadDateMedia({
    dateRequestId: input.dateRequestId,
    kind: input.kind,
    url: upload.mediaUrl,
  });
};
