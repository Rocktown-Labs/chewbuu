const TERMINAL_DATE_STATUSES = new Set([
  "cancelled",
  "completed",
  "declined",
  "expired",
]);

export const DATE_REQUEST_ACTION_WINDOW_MS = 2 * 60 * 1000;

export const isDateRequestActionable = (
  createdAt: string,
  now = Date.now()
) => {
  const createdTimestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTimestamp)) return true;
  return now - createdTimestamp < DATE_REQUEST_ACTION_WINDOW_MS;
};

export interface DateRequestSummary {
  createdAt?: string;
  id: string;
  isRequester?: boolean;
  scheduledAt: string;
  status: string;
}

export const getUpcomingRequests = <T extends DateRequestSummary>(
  requests: T[],
  now = Date.now()
) =>
  requests
    .filter(
      (request) =>
        new Date(request.scheduledAt).getTime() >= now &&
        !TERMINAL_DATE_STATUSES.has(request.status)
    )
    .toSorted((first, second) =>
      first.scheduledAt.localeCompare(second.scheduledAt)
    );

export const getPastRequests = <T extends DateRequestSummary>(requests: T[]) =>
  requests.filter((request) => TERMINAL_DATE_STATUSES.has(request.status));

export const isRecapEligible = (status: string) =>
  status === "completed" || status === "review_due";
