import { Ratelimit } from "@upstash/ratelimit";

import { getRedisClient } from "./index";

export const createRateLimiter = (requests = 10, windowInSeconds = 60) => {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  return new Ratelimit({
    limiter: Ratelimit.slidingWindow(requests, `${windowInSeconds} s`),
    redis,
  });
};
