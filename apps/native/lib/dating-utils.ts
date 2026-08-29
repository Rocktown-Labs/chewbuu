const TERMINAL_DATE_STATUSES = new Set([
  "cancelled",
  "completed",
  "declined",
  "expired",
]);

export interface DateRequestSummary {
  id: string;
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
