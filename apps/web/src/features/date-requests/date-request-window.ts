export const DATE_REQUEST_ACTION_WINDOW_MS = 2 * 60 * 1000;

const toTimestamp = (createdAt: string) => {
  const timestamp = new Date(createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getDateRequestWindowRemaining = (
  createdAt: string,
  now = Date.now()
) => {
  const timestamp = toTimestamp(createdAt);
  if (timestamp === null) return DATE_REQUEST_ACTION_WINDOW_MS;
  return Math.max(0, timestamp + DATE_REQUEST_ACTION_WINDOW_MS - now);
};

export const isDateRequestActionable = (createdAt: string, now = Date.now()) =>
  getDateRequestWindowRemaining(createdAt, now) > 0;
