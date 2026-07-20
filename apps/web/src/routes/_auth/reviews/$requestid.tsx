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
import { ArrowLeft, Check, ChevronRight, MapPin, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import { NavigationBlocker } from "@/components/navigation-blocker";
import { reviewsApi } from "@/lib/dating-api";
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

const demoReviewPrompt: ReviewPrompt = {
  criteria: {
    person: defaultPersonCriteria,
    place: defaultPlaceCriteria,
  },
  existingReview: null,
  places: [
    {
      address: "East Nashville",
      name: "The Golden Booth",
      placeId: "demo-place-golden-booth",
      rating: "4.7",
      types: ["restaurant", "bar", "date_fit"],
    },
    {
      address: "Main Street",
      name: "Cue & Co.",
      placeId: "demo-place-cue",
      rating: "4.6",
      types: ["pool", "play", "combo"],
    },
  ],
  request: {
    id: "demo-date-123456",
    searchArea: "Nashville, TN",
    status: "review_due",
  },
};

type ReviewStep = "person" | "place";

const criteriaAverage = (criteria: Record<string, number>) => {
  const values = Object.values(criteria);
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length
  );
};

function RouteComponent() {
  const { requestid } = Route.useParams();
  const navigate = useNavigate();
  const isDemoReview = requestid.startsWith("demo-date-");
  const [prompt, setPrompt] = useState<ReviewPrompt | null>(null);
  const [step, setStep] = useState<ReviewStep>("person");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [personCriteria, setPersonCriteria] = useState<Record<string, number>>(
    {}
  );
  const [placeCriteria, setPlaceCriteria] = useState<Record<string, number>>(
    {}
  );
  const [personComment, setPersonComment] = useState("");
  const [placeComment, setPlaceComment] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const nextPrompt = isDemoReview
          ? demoReviewPrompt
          : await reviewsApi.getPrompt(requestid);
        setPrompt(nextPrompt);
        if (nextPrompt.existingReview) {
          setPersonCriteria(nextPrompt.existingReview.personCriteria);
          setPlaceCriteria(nextPrompt.existingReview.placeCriteria);
          setPersonComment(nextPrompt.existingReview.personComment ?? "");
          setPlaceComment(nextPrompt.existingReview.placeComment ?? "");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load review."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [isDemoReview, requestid]);

  const criteria = useMemo(
    () => ({
      person: prompt?.criteria.person ?? defaultPersonCriteria,
      place: prompt?.criteria.place ?? defaultPlaceCriteria,
    }),
    [prompt]
  );

  const missingPersonCriteria = criteria.person.some(
    (item) => !personCriteria[item.key]
  );
  const missingPlaceCriteria = criteria.place.some(
    (item) => !placeCriteria[item.key]
  );

  const submitReview = async () => {
    if (missingPlaceCriteria) {
      toast.error("Finish every place rating before submitting.");
      return;
    }

    const body: DateReviewPayload = {
      personComment: personComment.trim() || undefined,
      personCriteria,
      personRating: criteriaAverage(personCriteria),
      placeComment: placeComment.trim() || undefined,
      placeCriteria,
      placeRating: criteriaAverage(placeCriteria),
    };

    setIsSubmitting(true);
    try {
      if (!isDemoReview) {
        await reviewsApi.submit(requestid, body);
      }
      toast.success("Review submitted. Thanks for keeping matches honest.");
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
        <p className="text-sm text-muted-foreground">Loading review...</p>
      </main>
    );
  }

  const isDirty =
    !isSubmitting &&
    (Object.keys(personCriteria).length > 0 ||
      Object.keys(placeCriteria).length > 0 ||
      personComment.trim().length > 0 ||
      placeComment.trim().length > 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <NavigationBlocker
        description="Your review ratings haven't been submitted yet and will be lost if you navigate away."
        shouldBlock={isDirty}
        title="Leave Date Review?"
      />
      <header className="flex flex-col gap-3">
        <Button
          className="w-fit"
          onClick={() => history.back()}
          type="button"
          variant="ghost"
        >
          <ArrowLeft data-icon="inline-start" />
          Back
        </Button>
        <div className="flex flex-col gap-2">
          <Badge className="w-fit" variant="secondary">
            {step === "person" ? "Person review" : "Place review"}
          </Badge>
          <h1 className="text-2xl font-semibold">Rate the date</h1>
          <p className="text-sm text-muted-foreground">
            These ratings improve future matches, spot recommendations, and
            reliability scoring.
          </p>
        </div>
      </header>

      {step === "person" ? (
        <ReviewPanel
          comment={personComment}
          criteria={criteria.person}
          ratings={personCriteria}
          setComment={setPersonComment}
          setRatings={setPersonCriteria}
          subtitle="Rate how the match showed up, treated you, and fit the plan."
          title="How was the person?"
        />
      ) : (
        <ReviewPanel
          comment={placeComment}
          criteria={criteria.place}
          ratings={placeCriteria}
          setComment={setPlaceComment}
          setRatings={setPlaceCriteria}
          subtitle={
            prompt?.places.length
              ? `Review the date spot experience around ${prompt.places
                  .map((place) => place.name)
                  .join(", ")}.`
              : "Review the spot experience and whether it worked for a date."
          }
          title="How was the place?"
        />
      )}

      {prompt?.places.length ? (
        <div className="flex flex-wrap gap-2">
          {prompt.places.map((place) => (
            <Badge className="gap-1" key={place.placeId} variant="outline">
              <MapPin className="size-3" />
              {place.name}
            </Badge>
          ))}
        </div>
      ) : null}

      <footer className="flex justify-between gap-3">
        <Button
          disabled={step === "person"}
          onClick={() => setStep("person")}
          type="button"
          variant="outline"
        >
          Person
        </Button>
        {step === "person" ? (
          <Button
            disabled={missingPersonCriteria}
            onClick={() => setStep("place")}
            type="button"
          >
            Continue
            <ChevronRight data-icon="inline-end" />
          </Button>
        ) : (
          <Button disabled={isSubmitting} onClick={submitReview} type="button">
            <Check data-icon="inline-start" />
            {isSubmitting ? "Submitting..." : "Submit review"}
          </Button>
        )}
      </footer>
    </main>
  );
}

function ReviewPanel({
  comment,
  criteria,
  ratings,
  setComment,
  setRatings,
  subtitle,
  title,
}: {
  comment: string;
  criteria: { key: string; label: string }[];
  ratings: Record<string, number>;
  setComment: (value: string) => void;
  setRatings: Dispatch<SetStateAction<Record<string, number>>>;
  subtitle: string;
  title: string;
}) {
  return (
    <Card className="border-border bg-card/45 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col divide-y divide-border">
          {criteria.map((item) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 py-3"
              key={item.key}
            >
              <span className="text-sm font-medium">{item.label}</span>
              <StarRating
                label={item.label}
                onChange={(value) =>
                  setRatings((current) => ({ ...current, [item.key]: value }))
                }
                value={ratings[item.key] ?? 0}
              />
            </div>
          ))}
        </div>
        <Field>
          <FieldLabel>Comment</FieldLabel>
          <Textarea
            onChange={(event) => setComment(event.target.value)}
            placeholder="What should future recommendations learn from this?"
            value={comment}
          />
        </Field>
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
      className="flex gap-1"
      role="radiogroup"
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= value;
        return (
          <button
            aria-checked={value === rating}
            aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
            className="grid size-9 place-items-center rounded-full text-amber-500 transition hover:bg-amber-500/10"
            key={rating}
            onClick={() => onChange(rating)}
            role="radio"
            type="button"
          >
            <Star className={selected ? "size-5 fill-amber-500" : "size-5"} />
          </button>
        );
      })}
    </div>
  );
}
