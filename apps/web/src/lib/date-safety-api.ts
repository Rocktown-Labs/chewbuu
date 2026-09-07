import { api } from "@chewbuu/aws-blocks";
import type {
  CompleteDateSafetyRecordingInput,
  DateSafetyAction,
  DateSafetyActionResponse,
  DateSafetyStatusResponse,
} from "@chewbuu/aws-blocks";

export const dateSafetyApi = {
  completeRecording: (
    input: CompleteDateSafetyRecordingInput
  ): Promise<{ recordingId: string }> => api.completeDateSafetyRecording(input),
  getStatus: (input: {
    dateRequestId: string;
    latitude: number;
    longitude: number;
  }): Promise<DateSafetyStatusResponse> => api.getDateSafetyStatus(input),
  requestAction: (input: {
    action: DateSafetyAction;
    confirmed: true;
    dateRequestId: string;
    latitude: number;
    longitude: number;
  }): Promise<DateSafetyActionResponse> => api.requestDateSafetyAction(input),
};
