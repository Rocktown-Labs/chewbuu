import { api as blocksApi } from "@chewbuu/aws-blocks";
import type {
  SpotCaptureOffer,
  SpotContributionKind,
} from "@chewbuu/aws-blocks";
import { Avatar, AvatarFallback } from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Field, FieldLabel } from "@chewbuu/ui/components/field";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ImagePlus,
  MapPin,
  Plus,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import { NavigationBlocker } from "@/components/navigation-blocker";
import { dateMediaApi, reviewsApi, spotCaptureApi } from "@/lib/dating-api";
import type { DateReviewPayload, ReviewPrompt } from "@/lib/dating-api";

export const Route = createFileRoute("/_auth/reviews/$requestid")({
  component: RouteComponent,
});

const defaultPersonCriteria = [
  { key: "hygiene", label: "Hygiene" },
  { key: "style", label: "Style" },
  { key: "conversation", label: "Conversation" },
  { key: "respect", label: "Respect" },
  { key: "chemistry", label: "Chemistry" },
  { key: "reliability", label: "Reliability" },
];

const defaultPlaceCriteria = [
  { key: "food_drink", label: "Food & drink" },
  { key: "atmosphere", label: "Atmosphere" },
  { key: "service", label: "Service" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "date_fit", label: "Date fit" },
  { key: "value", label: "Value" },
];

type ReviewStep = "people" | "spots";
type UploadedSpotMedia = {
  id: string;
  kind: SpotContributionKind;
  url: string;
};

const criteriaAverage = (criteria: Record<string, number>) => {
  const values = Object.values(criteria);
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length
  );
};

const formatCredit = (cents: number) =>
  new Intl.NumberFormat(undefined, {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);

export function RouteComponent() {
  const { requestid } = Route.useParams();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<ReviewPrompt | null>(null);
  const [step, setStep] = useState<ReviewStep>("people");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-person ratings, comments & attachments
  const [personRatings, setPersonRatings] = useState<
    Record<string, Record<string, number>>
  >({});
  const [personComments, setPersonComments] = useState<Record<string, string>>(
    {}
  );
  const [personMedia, setPersonMedia] = useState<Record<string, string[]>>({});
  const [expandedPersonId, setExpandedPersonId] = useState<string>("");

  // Multi-spot ratings, comments & attachments
  const [spotRatings, setSpotRatings] = useState<
    Record<string, Record<string, number>>
  >({});
  const [spotComments, setSpotComments] = useState<Record<string, string>>({});
  const [spotMedia, setSpotMedia] = useState<Record<string, string[]>>({});
  const [spotUploads, setSpotUploads] = useState<
    Record<string, UploadedSpotMedia[]>
  >({});
  const [spotOffers, setSpotOffers] = useState<
    Record<string, SpotCaptureOffer>
  >({});
  const [uploadingSpot, setUploadingSpot] = useState<string | null>(null);
  const [expandedSpotId, setExpandedSpotId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const nextPrompt = await reviewsApi.getPrompt(requestid);
        setPrompt(nextPrompt);
        if (nextPrompt.existingReview) {
          const personId = nextPrompt.existingReview.userId;
          setPersonRatings({
            [personId]: nextPrompt.existingReview.personCriteria,
          });
          setPersonComments({
            [personId]: nextPrompt.existingReview.personComment ?? "",
          });
          const spotId = nextPrompt.places[0]?.placeId;
          if (spotId) {
            setSpotRatings({
              [spotId]: nextPrompt.existingReview.placeCriteria,
            });
            setSpotComments({
              [spotId]: nextPrompt.existingReview.placeComment ?? "",
            });
          }
        }
        const offerResults = await Promise.allSettled(
          nextPrompt.places.map(async (spot) => ({
            offer: await spotCaptureApi.getOffer({
              dateRequestId: requestid,
              googlePlaceId: spot.placeId,
            }),
            placeId: spot.placeId,
          }))
        );
        const offers = Object.fromEntries(
          offerResults.flatMap((result) =>
            result.status === "fulfilled"
              ? [[result.value.placeId, result.value.offer.offer] as const]
              : []
          )
        );
        setSpotOffers(offers);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load review prompt."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [requestid]);

  const criteria = useMemo(
    () => ({
      person: prompt?.criteria.person ?? defaultPersonCriteria,
      place: prompt?.criteria.place ?? defaultPlaceCriteria,
    }),
    [prompt]
  );

  const peopleList = useMemo(
    () =>
      prompt?.people.map((person) => ({
        ...person,
        role: "Date match",
      })) ?? [],
    [prompt]
  );
  const spotsList = useMemo(() => prompt?.places ?? [], [prompt]);

  // Validation checks for required reviews
  const isPersonComplete = (personId: string) => {
    const ratings = personRatings[personId] ?? {};
    return criteria.person.every((item) => Boolean(ratings[item.key]));
  };

  const isSpotComplete = (spotId: string) => {
    const ratings = spotRatings[spotId] ?? {};
    return criteria.place.every((item) => Boolean(ratings[item.key]));
  };

  const allPeopleComplete = peopleList.every((p) => isPersonComplete(p.id));
  const allSpotsComplete = spotsList.every((s) => isSpotComplete(s.placeId));

  const handleMediaUpload = (
    targetId: string,
    setMediaFn: Dispatch<SetStateAction<Record<string, string[]>>>,
    file: File
  ) => {
    const reader = new FileReader();
    reader.addEventListener("load", (e) => {
      const url = e.target?.result as string;
      if (url) {
        setMediaFn((prev) => ({
          ...prev,
          [targetId]: [...(prev[targetId] ?? []), url],
        }));
        toast.success(`Attached photo/video to review.`);
      }
    });
    reader.readAsDataURL(file);
  };

  const removeMedia = (
    targetId: string,
    setMediaFn: Dispatch<SetStateAction<Record<string, string[]>>>,
    index: number
  ) => {
    setMediaFn((prev) => ({
      ...prev,
      [targetId]: (prev[targetId] ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSpotCaptureUpload = async (
    googlePlaceId: string,
    kind: SpotContributionKind,
    file: File | undefined
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Spot capture currently accepts images only.");
      return;
    }

    const uploadKey = `${googlePlaceId}:${kind}`;
    setUploadingSpot(uploadKey);
    try {
      const upload = await blocksApi.createMediaUpload({
        contentType: file.type,
        fileName: file.name,
        slot: "photo",
      });
      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: { "content-type": file.type },
        method: "PUT",
      });
      if (!response.ok) throw new Error("Media upload failed.");

      const media = await dateMediaApi.upload({
        dateRequestId: requestid,
        kind,
        url: upload.mediaUrl,
      });
      const result = await spotCaptureApi.submit({
        dateMediaId: media.media.id,
        dateRequestId: requestid,
        googlePlaceId,
        kind,
      });
      setSpotUploads((current) => ({
        ...current,
        [googlePlaceId]: [
          ...(current[googlePlaceId] ?? []),
          { id: media.media.id, kind, url: media.media.url },
        ],
      }));
      setSpotOffers((current) => {
        const offer = current[googlePlaceId];
        if (!offer) return current;
        const pending = Array.from(new Set([...offer.pending, kind]));
        const available = offer.missing.filter(
          (missingKind) => !pending.includes(missingKind)
        );
        return {
          ...current,
          [googlePlaceId]: {
            ...offer,
            pending,
            status: available.length === 0 ? "pending_review" : "available",
          },
        };
      });
      toast.success(
        `${kind === "menu_photo" ? "Menu" : "Spot"} capture submitted for review. ${formatCredit(result.contribution.rewardCents)} credit is pending approval.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit capture."
      );
    } finally {
      setUploadingSpot(null);
    }
  };

  const submitReview = async () => {
    if (!allPeopleComplete) {
      toast.error(
        "Reviews are required. Please rate every person before submitting."
      );
      setStep("people");
      return;
    }

    if (!allSpotsComplete) {
      toast.error(
        "Reviews are required. Please rate every spot visited before submitting."
      );
      setStep("spots");
      return;
    }

    const firstPersonRatings =
      personRatings[peopleList[0]?.id ?? "person-1"] ?? {};
    const firstSpotRatings = spotRatings[spotsList[0]?.placeId ?? ""] ?? {};

    const body: DateReviewPayload = {
      mediaIds: Object.values(spotUploads)
        .flat()
        .map((media) => media.id),
      personComment:
        personComments[peopleList[0]?.id ?? "person-1"]?.trim() || undefined,
      personCriteria: firstPersonRatings,
      personRating: criteriaAverage(firstPersonRatings),
      placeComment:
        spotComments[spotsList[0]?.placeId ?? ""]?.trim() || undefined,
      placeCriteria: firstSpotRatings,
      placeRating: criteriaAverage(firstSpotRatings),
    };

    setIsSubmitting(true);
    try {
      await reviewsApi.submit(requestid, body);
      toast.success(
        "All date reviews submitted! Thanks for keeping Chewbuu honest."
      );
      await navigate({ to: "/me" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-10">
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading review details...
        </p>
      </main>
    );
  }

  const isDirty =
    !isSubmitting &&
    (Object.keys(personRatings).length > 0 ||
      Object.keys(spotRatings).length > 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <NavigationBlocker
        description="Your review ratings haven't been submitted yet and will be lost if you navigate away."
        shouldBlock={isDirty}
        title="Leave Date Review?"
      />

      <header className="flex flex-col gap-3">
        <Button
          className="w-fit rounded-full"
          onClick={() => history.back()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft data-icon="inline-start" className="size-4" />
          Back to Dates
        </Button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge
              className="rounded-full px-3 py-1 text-xs font-bold"
              variant="secondary"
            >
              Date Recap & Required Reviews
            </Badge>
            <Badge
              className="rounded-full bg-primary/10 text-primary border-primary/20 text-xs"
              variant="outline"
            >
              Multi-Spot & Multi-Person
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Rate the Date
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete reviews for every spot visited and every match on your date
            to earn your recap badge and improve match accuracy.
          </p>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep("people")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition duration-200 cursor-pointer ${
              step === "people"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <User className="size-4" />
            1. Rate People (
            {peopleList.filter((p) => isPersonComplete(p.id)).length}/
            {peopleList.length})
          </button>
          <button
            type="button"
            onClick={() => setStep("spots")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition duration-200 cursor-pointer ${
              step === "spots"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <MapPin className="size-4" />
            2. Rate Spots (
            {spotsList.filter((s) => isSpotComplete(s.placeId)).length}/
            {spotsList.length})
          </button>
        </div>
      </header>

      {/* PEOPLE ACCORDION REVIEWS */}
      {step === "people" && (
        <div className="flex flex-col gap-4">
          <Card className="rounded-3xl border-border bg-card/60 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center justify-between">
                <span>People Reviews</span>
                <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                  Required *
                </span>
              </CardTitle>
              <CardDescription>
                Rate how each person showed up, treated you, and fit the plan.
                You can also attach photos/videos.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {peopleList.map((person) => {
                const isExpanded = expandedPersonId === person.id;
                const complete = isPersonComplete(person.id);
                const currentRatings = personRatings[person.id] ?? {};
                const currentComment = personComments[person.id] ?? "";
                const currentMedia = personMedia[person.id] ?? [];

                return (
                  <div
                    key={person.id}
                    className="rounded-2xl border border-border/80 bg-background/50 overflow-hidden transition-all duration-200"
                  >
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPersonId(isExpanded ? "" : person.id)
                      }
                      className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border">
                          <AvatarFallback className="font-bold text-xs bg-primary/20 text-primary">
                            {person.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm">{person.name}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {person.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {complete ? (
                          <Badge className="rounded-full bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                            <Check className="size-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-amber-500/15 text-amber-500 border-amber-500/20 text-[10px] font-bold">
                            Incomplete
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="p-4 flex flex-col gap-5 border-t border-border/60">
                        <div className="flex flex-col divide-y divide-border/60">
                          {criteria.person.map((item) => (
                            <div
                              className="flex flex-wrap items-center justify-between gap-3 py-3"
                              key={item.key}
                            >
                              <span className="text-sm font-semibold">
                                {item.label}
                              </span>
                              <StarRating
                                label={item.label}
                                onChange={(val) =>
                                  setPersonRatings((prev) => ({
                                    ...prev,
                                    [person.id]: {
                                      ...prev[person.id],
                                      [item.key]: val,
                                    },
                                  }))
                                }
                                value={currentRatings[item.key] ?? 0}
                              />
                            </div>
                          ))}
                        </div>

                        <Field className="gap-1.5">
                          <FieldLabel className="text-xs font-bold">
                            Person Comment
                          </FieldLabel>
                          <Textarea
                            className="rounded-2xl bg-background/80 border-border"
                            onChange={(e) =>
                              setPersonComments((prev) => ({
                                ...prev,
                                [person.id]: e.target.value,
                              }))
                            }
                            placeholder={`How was your interaction with ${person.name}?`}
                            value={currentComment}
                          />
                        </Field>

                        {/* Attach Photos/Videos */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <ImagePlus className="size-4 text-primary" />
                              Attach Media to Review
                            </span>
                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                              <Plus className="size-3.5" />
                              Add Photo/Video
                              <input
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleMediaUpload(
                                      person.id,
                                      setPersonMedia,
                                      file
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {currentMedia.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {currentMedia.map((url, index) => (
                                <div
                                  key={index}
                                  className="relative size-16 rounded-2xl overflow-hidden border border-border group"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeMedia(
                                        person.id,
                                        setPersonMedia,
                                        index
                                      )
                                    }
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">
                              No photos or video recaps attached yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SPOTS ACCORDION REVIEWS */}
      {step === "spots" && (
        <div className="flex flex-col gap-4">
          <Card className="rounded-3xl border-border bg-card/60 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center justify-between">
                <span>Spot Reviews</span>
                <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                  Required *
                </span>
              </CardTitle>
              <CardDescription>
                Rate each venue/spot visited on your date. Attach photos or
                video reviews to help others discover great spots.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {spotsList.map((spot) => {
                const isExpanded = expandedSpotId === spot.placeId;
                const complete = isSpotComplete(spot.placeId);
                const currentRatings = spotRatings[spot.placeId] ?? {};
                const currentComment = spotComments[spot.placeId] ?? "";
                const currentMedia = spotMedia[spot.placeId] ?? [];

                return (
                  <div
                    key={spot.placeId}
                    className="rounded-2xl border border-border/80 bg-background/50 overflow-hidden transition-all duration-200"
                  >
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSpotId(isExpanded ? "" : spot.placeId)
                      }
                      className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                          <MapPin className="size-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{spot.name}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {spot.address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {complete ? (
                          <Badge className="rounded-full bg-emerald-500/15 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                            <Check className="size-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge className="rounded-full bg-amber-500/15 text-amber-500 border-amber-500/20 text-[10px] font-bold">
                            Incomplete
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="p-4 flex flex-col gap-5 border-t border-border/60">
                        <div className="flex flex-col divide-y divide-border/60">
                          {criteria.place.map((item) => (
                            <div
                              className="flex flex-wrap items-center justify-between gap-3 py-3"
                              key={item.key}
                            >
                              <span className="text-sm font-semibold">
                                {item.label}
                              </span>
                              <StarRating
                                label={item.label}
                                onChange={(val) =>
                                  setSpotRatings((prev) => ({
                                    ...prev,
                                    [spot.placeId]: {
                                      ...prev[spot.placeId],
                                      [item.key]: val,
                                    },
                                  }))
                                }
                                value={currentRatings[item.key] ?? 0}
                              />
                            </div>
                          ))}
                        </div>

                        <Field className="gap-1.5">
                          <FieldLabel className="text-xs font-bold">
                            Spot Review & Feedback
                          </FieldLabel>
                          <Textarea
                            className="rounded-2xl bg-background/80 border-border"
                            onChange={(e) =>
                              setSpotComments((prev) => ({
                                ...prev,
                                [spot.placeId]: e.target.value,
                              }))
                            }
                            placeholder={`What was the atmosphere, food, or date vibe like at ${spot.name}?`}
                            value={currentComment}
                          />
                        </Field>

                        {/* Attach Spot Photos/Videos */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <Camera className="size-4 text-primary" />
                              Attach Spot Photos / Video Recap
                            </span>
                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                              <Plus className="size-3.5" />
                              Upload Spot Media
                              <input
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleMediaUpload(
                                      spot.placeId,
                                      setSpotMedia,
                                      file
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                          {currentMedia.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {currentMedia.map((url, index) => (
                                <div
                                  key={index}
                                  className="relative size-16 rounded-2xl overflow-hidden border border-border group"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeMedia(
                                        spot.placeId,
                                        setSpotMedia,
                                        index
                                      )
                                    }
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">
                              No spot photos or video recaps attached yet.
                            </p>
                          )}
                        </div>
                        {spotOffers[spot.placeId] ? (
                          <SpotCaptureCard
                            offer={spotOffers[spot.placeId]}
                            onUpload={(kind, file) =>
                              void handleSpotCaptureUpload(
                                spot.placeId,
                                kind,
                                file
                              )
                            }
                            spot={spot}
                            uploadingSpot={uploadingSpot}
                            uploads={spotUploads[spot.placeId] ?? []}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FOOTER ACTIONS */}
      <footer className="flex items-center justify-between gap-3 pt-2">
        <Button
          className="rounded-full font-bold px-6"
          disabled={step === "people"}
          onClick={() => setStep("people")}
          type="button"
          variant="outline"
        >
          Back to People
        </Button>
        {step === "people" ? (
          <Button
            className="rounded-full font-bold px-6"
            onClick={() => setStep("spots")}
            type="button"
          >
            Continue to Spots
            <ChevronRight data-icon="inline-end" className="size-4" />
          </Button>
        ) : (
          <Button
            className="rounded-full font-bold px-8 shadow-lg shadow-primary/20"
            disabled={isSubmitting}
            onClick={submitReview}
            type="button"
          >
            <Check data-icon="inline-start" className="size-4" />
            {isSubmitting ? "Submitting Reviews..." : "Submit All Reviews"}
          </Button>
        )}
      </footer>
    </main>
  );
}

function SpotCaptureCard({
  offer,
  onUpload,
  spot,
  uploadingSpot,
  uploads,
}: {
  offer: SpotCaptureOffer;
  onUpload: (kind: SpotContributionKind, file: File | undefined) => void;
  spot: ReviewPrompt["places"][number];
  uploadingSpot: string | null;
  uploads: UploadedSpotMedia[];
}) {
  if (offer.status === "complete") return null;

  const availableKinds = offer.missing.filter(
    (kind) => !offer.pending.includes(kind)
  );
  const isUploading = (kind: SpotContributionKind) =>
    uploadingSpot === `${spot.placeId}:${kind}`;
  const kindLabel = (kind: SpotContributionKind) =>
    kind === "menu_photo" ? "Menu photo" : "Spot photo";

  return (
    <Card className="rounded-2xl border-emerald-500/25 bg-emerald-500/5 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="size-4 text-emerald-600" />
              Help fill in {spot.name}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Capture what the next dater needs. Each approved photo earns a
              pending {formatCredit(offer.rewardCents)} Chewbuu credit.
            </CardDescription>
          </div>
          <Badge
            className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
            variant="outline"
          >
            {formatCredit(offer.rewardCents)} / capture
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {offer.status === "pending_review" ? (
          <p className="rounded-xl bg-background/60 p-3 text-xs text-muted-foreground">
            Thanks — your captures are pending review. Credit is added after
            approval.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableKinds.map((kind) => (
              <label
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-background/50 px-3 py-3 text-xs font-semibold text-foreground transition hover:border-emerald-500/50 hover:bg-background"
                key={kind}
              >
                {isUploading(kind) ? "Uploading…" : kindLabel(kind)}
                <input
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={uploadingSpot !== null}
                  onChange={(event) => {
                    onUpload(kind, event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </label>
            ))}
          </div>
        )}
        {offer.pending.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {offer.pending.map((kind) => (
              <Badge className="rounded-full" key={kind} variant="secondary">
                {kindLabel(kind)} under review
              </Badge>
            ))}
          </div>
        ) : null}
        {uploads.length > 0 ? (
          <div
            aria-label="Submitted spot captures"
            className="flex flex-wrap gap-2"
          >
            {uploads.map((upload) => (
              <div
                className="relative size-16 overflow-hidden rounded-xl border border-emerald-500/20"
                key={upload.id}
              >
                <img
                  alt={kindLabel(upload.kind)}
                  className="size-full object-cover"
                  src={upload.url}
                />
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Only upload photos you took or have permission to share. Captures are
          reviewed before appearing in Spot results; online menu previews stay
          marked as unverified.
        </p>
      </CardContent>
    </Card>
  );
}

function StarRating({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div
      aria-label={`${label} rating`}
      className="flex items-center gap-1 rounded-full bg-muted/40 p-1 border border-border/50"
      role="radiogroup"
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= value;
        return (
          <button
            aria-checked={value === rating}
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
            className="grid size-8 place-items-center rounded-full text-amber-500 transition hover:bg-amber-500/20"
            key={rating}
            onClick={() => onChange(rating)}
            role="radio"
            type="button"
          >
            <Star
              className={
                selected
                  ? "size-4 fill-amber-500 text-amber-500"
                  : "size-4 text-muted-foreground/50"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
