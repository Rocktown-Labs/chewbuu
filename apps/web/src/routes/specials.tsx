import { Badge } from "@chewbuu/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { venueApi, type VenueSpecial } from "@/lib/dating-api";

const specialsSearchSchema = z.object({ category: z.string().optional() });

export const Route = createFileRoute("/specials")({
  component: SpecialsPage,
  ssr: false,
  validateSearch: (search) => specialsSearchSchema.parse(search),
});

function SpecialsPage() {
  const { category: initialCategory } = Route.useSearch();
  const [category, setCategory] = useState(initialCategory ?? "");
  const [specials, setSpecials] = useState<VenueSpecial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await venueApi.getPublicSpecials(
          category ? { category } : undefined
        );
        setSpecials(result.specials);
      } catch {
        setSpecials([]);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [category]);

  const categories = Array.from(
    new Set(specials.map((special) => special.category))
  ).toSorted();

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          to="/"
        >
          <ArrowLeft className="size-4" /> Chewbuu
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">
              <Tag className="mr-1 size-3" /> Chewbuu spots
            </Badge>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Specials worth making a plan for.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Venue-published offers are available while they are active. Find a
              special, then pick the spot for your next date.
            </p>
          </div>
          <Input
            aria-label="Filter specials by category"
            className="sm:max-w-xs"
            onChange={(event) => setCategory(event.target.value.trim())}
            placeholder="Filter by category"
            value={category}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              category
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground"
            }`}
            onClick={() => setCategory("")}
            type="button"
          >
            All specials
          </button>
          {categories.map((item) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                category === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        {isLoading ? (
          <LoaderCircle className="mx-auto mt-20 size-6 animate-spin text-primary" />
        ) : specials.length === 0 ? (
          <Card className="mt-8 border-dashed">
            <CardHeader>
              <CardTitle>No active specials yet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Check back soon or explore nearby spots in your Chewbuu dashboard.
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {specials.map((special) => (
              <article
                className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm"
                key={special.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {special.category}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {special.title}
                    </h2>
                  </div>
                  {special.priceText ? (
                    <Badge variant="secondary">{special.priceText}</Badge>
                  ) : null}
                </div>
                {special.description ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {special.description}
                  </p>
                ) : null}
                <Link
                  className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  params={{ locationId: special.locationId }}
                  to="/spots/$locationId"
                >
                  View spot details →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
