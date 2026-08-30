import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, MapPin, Search, SlidersHorizontal } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { SpotCard } from "@/features/spots/spot-card";
import { spotsApi, type DatePlace } from "@/lib/dating-api";

export const Route = createFileRoute("/spots")({
  component: PublicSpotsPage,
  ssr: false,
});

type SpotCategory = "all" | "eat" | "drink" | "play";

const categories: { label: string; value: SpotCategory }[] = [
  { label: "All", value: "all" },
  { label: "Eat", value: "eat" },
  { label: "Drink", value: "drink" },
  { label: "Play", value: "play" },
];

function PublicSpotsPage() {
  const [places, setPlaces] = useState<DatePlace[]>([]);
  const [category, setCategory] = useState<SpotCategory>("all");
  const [query, setQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState("Chewbuu spots");
  const [coordinates, setCoordinates] = useState<
    { latitude: number; longitude: number } | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchReason, setSearchReason] = useState<string | null>(null);
  const didInitialSearch = useRef(false);

  const searchSpots = useCallback(
    async (
      nextCategory = category,
      nextCoordinates = coordinates,
      nextQuery = query
    ) => {
      setIsSearching(true);
      setError(null);
      setSearchReason(null);
      try {
        const result = await spotsApi.search({
          category: nextCategory,
          ...nextCoordinates,
          ...(nextQuery.trim() ? { query: nextQuery.trim() } : {}),
        });
        setPlaces(result.places);
        if (result.reason === "google_not_configured") {
          setSearchReason(
            "Showing verified Chewbuu spots. Nearby Google discovery is not configured yet."
          );
        } else if (result.reason === "unavailable") {
          setSearchReason(
            "Showing verified Chewbuu spots. Google discovery is temporarily unavailable."
          );
        }
      } catch (searchError) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Could not search Spots."
        );
      } finally {
        setIsSearching(false);
        setIsLoading(false);
      }
    },
    [category, coordinates, query]
  );

  useEffect(() => {
    if (didInitialSearch.current) return;
    didInitialSearch.current = true;
    void searchSpots();
  }, [searchSpots]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void searchSpots();
  };

  const handleCategoryChange = (nextCategory: SpotCategory) => {
    setCategory(nextCategory);
    void searchSpots(nextCategory);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoordinates(nextCoordinates);
        setLocationLabel("Near you");
        void searchSpots(category, nextCoordinates);
      },
      () =>
        setError(
          "Location access was not granted. Search by place or city instead."
        ),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const statusText = isSearching
    ? "Searching…"
    : `${places.length} ${places.length === 1 ? "spot" : "spots"} found`;

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="flex items-center gap-2 font-bold text-lg" to="/">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MapPin aria-hidden="true" className="size-4" />
            </span>
            <span translate="no">Chewbuu</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="hidden text-sm font-semibold text-muted-foreground transition hover:text-foreground sm:inline-flex"
              to="/auth/sign-in"
            >
              Sign in
            </Link>
            <Link
              className={buttonVariants({ className: "rounded-full" })}
              to="/auth/sign-up"
            >
              Join Chewbuu
            </Link>
          </div>
        </header>

        <section className="mt-14 max-w-2xl">
          <Badge variant="secondary">Nearby discovery</Badge>
          <h1 className="mt-4 text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
            Find your next place to go.
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Search real local restaurants, bars, and things to do. Verified Sync
            spots include their Chewbuu menu when available.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="public-spot-search">
              Search spots
            </label>
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3.5 top-3.5 size-4 text-muted-foreground"
              />
              <Input
                autoComplete="off"
                className="h-11 rounded-full bg-background pl-10"
                id="public-spot-search"
                name="query"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tacos, live music, coffee…"
                value={query}
              />
            </div>
            <Button
              className="h-11 rounded-full"
              disabled={isSearching}
              type="submit"
            >
              <Search aria-hidden="true" /> Search
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <SlidersHorizontal aria-hidden="true" className="size-3.5" />
              Filter
            </div>
            {categories.map((item) => (
              <button
                aria-pressed={category === item.value}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  category === item.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                }`}
                key={item.value}
                onClick={() => handleCategoryChange(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <button
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              onClick={handleUseLocation}
              type="button"
            >
              <MapPin aria-hidden="true" className="size-3.5" />
              {locationLabel === "Near you"
                ? "Using your location"
                : "Use my location"}
            </button>
          </div>
        </section>

        <section aria-live="polite" className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {locationLabel}
              </p>
              <h2 className="mt-1 font-semibold text-2xl">Spots to explore</h2>
            </div>
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>

          {error ? (
            <Card className="mt-5 border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base">
                  Search is taking a moment
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {error}
              </CardContent>
            </Card>
          ) : null}
          {searchReason ? (
            <p className="mt-4 text-sm text-muted-foreground">{searchReason}</p>
          ) : null}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle
                aria-label="Loading spots"
                className="size-6 animate-spin text-primary"
              />
            </div>
          ) : places.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {places.map((place) => (
                <SpotCard key={place.placeId} spot={place} />
              ))}
            </div>
          ) : (
            <Card className="mt-5 border-dashed">
              <CardContent className="p-6 text-center">
                <MapPin
                  aria-hidden="true"
                  className="mx-auto size-8 text-primary"
                />
                <h3 className="mt-3 font-semibold">No spots found yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Try a broader search or use your location. Verified venues
                  will appear here as Sync publishes them.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
