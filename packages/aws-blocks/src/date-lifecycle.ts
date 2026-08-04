export type DateLifecycleStatus =
  | "checked_in"
  | "completed"
  | "match_pending"
  | "matched"
  | "no_match"
  | "review_due";

export interface DateLifecycleState {
  hasPendingReviews: boolean;
  now: Date;
  scheduledAt: Date;
  status: DateLifecycleStatus;
}

export const nextDateLifecycleStatus = ({
  hasPendingReviews,
  now,
  scheduledAt,
  status,
}: DateLifecycleState): DateLifecycleStatus => {
  if (status === "checked_in" && now >= scheduledAt) return "review_due";
  if (status === "review_due" && !hasPendingReviews) return "completed";
  return status;
};

export interface DateLifecycleSchedulerBoundary {
  run: (input: { at?: string }) => Promise<{ processed: number }>;
}
