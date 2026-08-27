import { Badge } from "@chewbuu/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Globe2,
  Tag,
  Utensils,
} from "lucide-react";
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
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
        <Card className="w-full border-dashed">
          <CardHeader>
            <CardTitle>This spot is not public yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chewbuu only publishes locations that Sync has verified and
              activated. Join the app to discover places while they’re being set
              up.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              className="text-sm font-semibold text-primary underline"
              to="/auth/sign-up"
            >
              Join Chewbuu
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          to="/spots"
        >
          <ArrowLeft className="size-4" /> All specials
        </Link>
        <div className="mt-8">
          <Badge variant="secondary">Sync verified</Badge>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {summary.name}
          </h1>
          {summary.address ? (
            <p className="mt-2 text-muted-foreground">{summary.address}</p>
          ) : null}
          {summary.websiteUrl ? (
            <a
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
              href={summary.websiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Globe2 className="size-4" /> Visit official website
            </a>
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
            <Utensils className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold">Menu</h2>
          </div>
          <div className="mt-4 space-y-3">
            {summary.menuItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The venue is still building its verified Chewbuu menu.
              </p>
            ) : (
              summary.menuItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">
                        {item.section ?? "Menu"}
                      </p>
                      <p className="mt-1 font-semibold">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="font-semibold">
                      ${(item.priceCents / 100).toFixed(2)}
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>

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
