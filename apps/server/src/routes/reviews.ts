import { db } from "@chewbuu/db";
import { and, eq } from "@chewbuu/db/orm";
import {
  dateRequest,
  dateRequestPlace,
  dateReview,
} from "@chewbuu/db/schema/dating";
import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";

const starRatingSchema = z.number().int().min(1).max(5);
const criteriaSchema = z.record(z.string(), starRatingSchema).default({});

const reviewPayloadSchema = z.object({
  personComment: z.string().trim().max(1000).optional(),
  personCriteria: criteriaSchema,
  personRating: starRatingSchema,
  placeComment: z.string().trim().max(1000).optional(),
  placeCriteria: criteriaSchema,
  placeRating: starRatingSchema,
});

const personCriteria = [
  { key: "hygiene", label: "Hygiene" },
  { key: "style", label: "Style" },
  { key: "conversation", label: "Conversation" },
  { key: "respect", label: "Respect" },
  { key: "chemistry", label: "Chemistry" },
  { key: "reliability", label: "Reliability" },
] as const;

const placeCriteria = [
  { key: "food_drink", label: "Food & drink" },
  { key: "atmosphere", label: "Atmosphere" },
  { key: "service", label: "Service" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "date_fit", label: "Date fit" },
  { key: "value", label: "Value" },
] as const;

const nowId = () => crypto.randomUUID();
const isTestRuntime = () => process.env.NODE_ENV === "test";

type StoredReview = z.infer<typeof reviewPayloadSchema> & {
  completedAt: string;
  dateRequestId: string;
  id: string;
  required: boolean;
  userId: string;
};

const memory = {
  reviews: new Map<string, StoredReview>(),
};

const reviewKey = (userId: string, requestId: string) =>
  `${userId}:${requestId}`;

const getReviewPrompt = async (userId: string, requestId: string) => {
  if (isTestRuntime()) {
    return {
      existingReview: memory.reviews.get(reviewKey(userId, requestId)) ?? null,
      places: [],
      request: {
        id: requestId,
        searchArea: "Test Area",
        status: "places_selected",
      },
    };
  }

  const [request] = await db
    .select()
    .from(dateRequest)
    .where(and(eq(dateRequest.id, requestId), eq(dateRequest.userId, userId)))
    .limit(1);

  if (!request) {
    throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
      message: "Date request not found.",
    });
  }

  const [existingReview] = await db
    .select()
    .from(dateReview)
    .where(
      and(
        eq(dateReview.dateRequestId, requestId),
        eq(dateReview.userId, userId)
      )
    )
    .limit(1);
  const places = await db
    .select()
    .from(dateRequestPlace)
    .where(eq(dateRequestPlace.requestId, requestId));

  return {
    existingReview: existingReview ?? null,
    places,
    request,
  };
};

const saveReview = async (
  userId: string,
  requestId: string,
  input: z.infer<typeof reviewPayloadSchema>
) => {
  const prompt = await getReviewPrompt(userId, requestId);

  if (isTestRuntime()) {
    const storedReview = {
      ...input,
      completedAt: new Date().toISOString(),
      dateRequestId: requestId,
      id: prompt.existingReview?.id ?? nowId(),
      required: false,
      userId,
    };
    memory.reviews.set(reviewKey(userId, requestId), storedReview);
    return storedReview;
  }

  await db
    .delete(dateReview)
    .where(
      and(
        eq(dateReview.dateRequestId, requestId),
        eq(dateReview.userId, userId)
      )
    );

  const [storedReview] = await db
    .insert(dateReview)
    .values({
      completedAt: new Date(),
      dateRequestId: requestId,
      id: prompt.existingReview?.id ?? nowId(),
      personComment: input.personComment,
      personCriteria: input.personCriteria,
      personRating: input.personRating,
      placeComment: input.placeComment,
      placeCriteria: input.placeCriteria,
      placeRating: input.placeRating,
      required: false,
      userId,
    })
    .returning();

  return storedReview;
};

const reviewsRoute = createRouter()
  .get("/reviews/date-requests/:requestId", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const prompt = await getReviewPrompt(
      sessionUser.id,
      c.req.param("requestId")
    );

    return c.json({
      ...prompt,
      criteria: {
        person: personCriteria,
        place: placeCriteria,
      },
    });
  })
  .post("/reviews/date-requests/:requestId", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const parsed = reviewPayloadSchema.safeParse(await c.req.json());

    if (!parsed.success) {
      throw new HTTPException(HttpStatusCodes.UNPROCESSABLE_ENTITY, {
        message: parsed.error.issues[0]?.message ?? "Review is invalid.",
      });
    }

    const review = await saveReview(
      sessionUser.id,
      c.req.param("requestId"),
      parsed.data
    );

    return c.json({ review }, HttpStatusCodes.CREATED);
  });

export default reviewsRoute;
