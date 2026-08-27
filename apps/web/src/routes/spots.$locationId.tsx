import { Badge } from "@chewbuu/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Clock, DollarSign, Tag } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { venueApi, type VenuePublicSummary } from "@/lib/dating-api";

export const Route = createFileRoute("/spots/$locationId")({
  component: PublicVenuePage,
  ssr: false,
});

function PublicVenuePage() {
  const { locationId } = Route.useParams();
  const [summary, setSummary] = useState<VenuePublicSummary | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setSummary(await venueApi.getPublicSummary(locationId));
      } catch {
        setSummary(null);
      }
    };
    void loadSummary();
  }, [locationId]);

  if (!summary) {
    return (
      <main className="mx-auto max-w-3xl p-8">Venue details unavailable.</main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          to="/specials"
        >
          <ArrowLeft className="size-4" /> All specials
        </Link>
        <div className="mt-8">
          <Badge variant="secondary">Chewbuu spot</Badge>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {summary.name}
          </h1>
          {summary.address ? (
            <p className="mt-2 text-muted-foreground">{summary.address}</p>
          ) : null}
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <PublicMetric
            icon={<Clock className="size-5" />}
            label="Average food wait"
            value={
              summary.averageFoodWaitMinutes === null
                ? "Not enough data"
                : `${summary.averageFoodWaitMinutes} minutes`
            }
          />
          <PublicMetric
            icon={<DollarSign className="size-5" />}
            label="Average completed order"
            value={
              summary.averageCostCents === null
                ? "Not enough data"
                : `$${(summary.averageCostCents / 100).toFixed(2)}`
            }
          />
        </section>
        <p className="mt-3 text-xs text-muted-foreground">
          Based on {summary.sampleSize} paid, completed orders. Venue-published
          metrics are aggregated for privacy.
        </p>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <Tag className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold">Current specials</h2>
          </div>
          <div className="mt-4 space-y-3">
            {summary.specials.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active specials right now.
              </p>
            ) : (
              summary.specials.map((special) => (
                <Card key={special.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary">
                          {special.category}
                        </p>
                        <CardTitle className="mt-1">{special.title}</CardTitle>
                      </div>
                      {special.priceText ? (
                        <Badge variant="secondary">{special.priceText}</Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  {special.description ? (
                    <CardContent className="text-sm text-muted-foreground">
                      {special.description}
                    </CardContent>
                  ) : null}
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PublicMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
