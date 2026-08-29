import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { DateWizard } from "@/features/date-wizard/date-wizard";
import {
  datingApi,
  type DatePlace,
  type DatingSummary,
} from "@/lib/dating-api";

export const Route = createFileRoute("/_auth/date/new")({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>
  ): { placeId?: string; placeName?: string } => ({
    placeId: typeof search.placeId === "string" ? search.placeId : undefined,
    placeName:
      typeof search.placeName === "string" ? search.placeName : undefined,
  }),
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const { placeId, placeName } = Route.useSearch();
  const [readiness, setReadiness] = useState<DatingSummary["readiness"] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isCurrent = true;
    const loadReadiness = async () => {
      try {
        const summary = await datingApi.getSummary();
        if (isCurrent) setReadiness(summary.readiness);
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not check dating readiness."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadReadiness();
    return () => {
      isCurrent = false;
    };
  }, []);

  const startDating = async () => {
    setIsStarting(true);
    try {
      const result = await datingApi.setDatingAvailability(true);
      setReadiness(result.readiness);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not start dating."
      );
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return <DateGateMessage description="Checking your dating readiness…" />;
  }

  if (error) {
    return <DateGateMessage description={error} />;
  }

  if (!readiness?.onboarded) {
    return (
      <DateGateMessage
        action={
          <Link className={buttonVariants()} to="/onboarding">
            Finish onboarding
          </Link>
        }
        description="Complete your dating profile before opening a new date request."
        title="Finish onboarding first"
      />
    );
  }

  if (readiness.pendingReviews > 0) {
    return (
      <DateGateMessage
        action={
          <Link className={buttonVariants()} to="/me">
            Go to your dates
          </Link>
        }
        description="Complete your pending date review before planning another date."
        title="Review needed first"
      />
    );
  }

  if (!readiness.canDate) {
    return (
      <DateGateMessage
        action={
          <Button disabled={isStarting} onClick={() => void startDating()}>
            {isStarting ? "Starting…" : "Start dating"}
          </Button>
        }
        description="Your profile is ready. Turn dating on when you want to receive date requests and plan a date."
        title="Ready when you are"
      />
    );
  }

  const presetPlace: DatePlace | undefined =
    placeId && placeName ? { name: placeName, placeId, types: [] } : undefined;

  return (
    <DateWizard
      membershipTier={session.data?.user.membershipTier ?? "social"}
      presetPlace={presetPlace}
    />
  );
}

function DateGateMessage({
  action,
  description,
  title = "Date planning unavailable",
}: {
  action?: ReactNode;
  description: string;
  title?: string;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {action ? <CardContent>{action}</CardContent> : null}
      </Card>
    </main>
  );
}
