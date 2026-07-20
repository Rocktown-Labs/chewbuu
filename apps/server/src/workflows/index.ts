import { env } from "@chewbuu/env/server";
import { Redis } from "@upstash/redis";
import { FatalError, sleep } from "workflow";

const getRedis = () => {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    token: env.UPSTASH_REDIS_REST_TOKEN,
    url: env.UPSTASH_REDIS_REST_URL,
  });
};

export interface RecapInput {
  caption: string;
  friendCount: number;
  friendIds: string[];
  personName: string;
  photos: string[];
  placeAddress: string;
  placeName: string;
  recapId: string;
  userId: string;
  userName: string;
}

export interface DateMatchInput {
  candidateCount?: number;
  paymentMode: "covered" | "dutch";
  places: { address: string; name: string; placeId: string }[];
  requestId: string;
  scheduledAt: string;
  searchArea: string;
  userId: string;
  what: string[];
}

export interface OnboardingWorkflowInput {
  email?: string;
  friendInvites: { email?: string; name: string; phone?: string }[];
  introVideoUrl?: string;
  name: string;
  phone?: string;
  profilePhotoUrl?: string;
  trustedContacts: { email?: string; name: string; phone?: string }[];
  userId: string;
  username?: string;
}

export interface ReviewWorkflowInput {
  personComment?: string;
  personCriteria: Record<string, number>;
  personRating: number;
  placeComment?: string;
  placeCriteria: Record<string, number>;
  placeRating: number;
  requestId: string;
  reviewerUserId: string;
}

// ---------------------------------------------------------------------------
// Step Functions ("use step" for full Node.js / I/O access and retries)
// ---------------------------------------------------------------------------

export async function fanOutRecapStep(
  recapId: string,
  friendIds: string[],
  friendCount: number
) {
  "use step";

  const redis = getRedis();
  if (!redis) {
    return { count: 0, status: "skipped_no_redis" };
  }

  const now = Date.now();

  if (friendCount > 2000) {
    // Power users: Fan-out on Read flag in Redis
    await redis.set(`recap:fanout_read:${recapId}`, true, {
      ex: 60 * 60 * 24 * 30,
    });
    return { count: friendIds.length, mode: "read", status: "success" };
  }

  // Standard users: Fan-out on Write to friend Sorted Sets
  const pipeline = redis.pipeline();
  for (const friendId of friendIds) {
    pipeline.zadd(`feed:${friendId}`, { member: recapId, score: now });
    pipeline.expire(`feed:${friendId}`, 60 * 60 * 24 * 30);
  }
  await pipeline.exec();

  return { count: friendIds.length, mode: "write", status: "success" };
}

export async function vectorSearchCandidatesStep(
  _userId: string,
  _searchArea: string,
  _what: string[]
) {
  "use step";

  // Mock / Upstash Vector query computation
  const candidates = [
    {
      compatibility: 94,
      distanceMiles: 2.1,
      userId: "cand-maya-101",
      username: "maya_v",
    },
    {
      compatibility: 88,
      distanceMiles: 3.8,
      userId: "cand-alex-102",
      username: "alex_j",
    },
  ];

  return candidates;
}

export async function notifyMatchCandidatesStep(
  requestId: string,
  candidates: { userId: string }[],
  requestDetails: any
) {
  "use step";

  const redis = getRedis();
  if (!redis) {
    return { notified: 0 };
  }

  let notified = 0;
  for (const candidate of candidates) {
    await redis.publish(
      `flash_feed:${candidate.userId}`,
      JSON.stringify({
        payload: requestDetails,
        requestId,
        type: "NEW_DATE_MATCH_REQUEST",
      })
    );
    notified += 1;
  }

  return { notified };
}

export async function processOnboardingInvitesStep(
  _userId: string,
  friendInvites: { email?: string; name: string; phone?: string }[]
) {
  "use step";

  if (!friendInvites || friendInvites.length === 0) {
    return { dispatched: 0 };
  }

  // Simulating async dispatch of invite SMS / emails
  return { dispatched: friendInvites.length };
}

export async function aggregateReviewScoresStep(
  _requestId: string,
  _personRating: number,
  _placeRating: number
) {
  "use step";

  // Async aggregation of reliability scores and place rating centroids
  return { updated: true };
}

// ---------------------------------------------------------------------------
// Workflows ("use workflow" orchestration)
// ---------------------------------------------------------------------------

export async function recapProcessingWorkflow(recap: RecapInput) {
  "use workflow";

  if (!recap.recapId) {
    throw new FatalError("Recap ID is required.");
  }

  const result = await fanOutRecapStep(
    recap.recapId,
    recap.friendIds,
    recap.friendCount
  );

  return { recapId: recap.recapId, result, status: "completed" };
}

export async function dateMatchingWorkflow(input: DateMatchInput) {
  "use workflow";

  if (!input.requestId) {
    throw new FatalError("Request ID is required.");
  }

  const candidates = await vectorSearchCandidatesStep(
    input.userId,
    input.searchArea,
    input.what
  );

  await notifyMatchCandidatesStep(input.requestId, candidates, input);

  // Sleep for 24 hours to handle match request expiration
  await sleep("24h");

  return {
    candidatesMatched: candidates.length,
    requestId: input.requestId,
    status: "expired_or_completed",
  };
}

export async function onboardingWorkflow(input: OnboardingWorkflowInput) {
  "use workflow";

  if (!input.userId) {
    throw new FatalError("User ID is required.");
  }

  const invitesResult = await processOnboardingInvitesStep(
    input.userId,
    input.friendInvites
  );

  return {
    invitesDispatched: invitesResult.dispatched,
    status: "completed",
    userId: input.userId,
  };
}

export async function reviewProcessingWorkflow(input: ReviewWorkflowInput) {
  "use workflow";

  if (!input.requestId) {
    throw new FatalError("Request ID is required.");
  }

  const result = await aggregateReviewScoresStep(
    input.requestId,
    input.personRating,
    input.placeRating
  );

  return { requestId: input.requestId, result, status: "completed" };
}
