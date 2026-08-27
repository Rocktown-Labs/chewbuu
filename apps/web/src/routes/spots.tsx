import { Badge } from "@chewbuu/ui/components/badge";
import { buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { venueApi, type PublicVenueLocation } from "@/lib/dating-api";

export const Route = createFileRoute("/spots")({
  component: PublicSpotsPage,
  ssr: false,
});

function PublicSpotsPage() {
  const [locations, setLocations] = useState<PublicVenueLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const result = await venueApi.listPublicLocations();
        setLocations(result.locations);
      } catch {
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    void loadLocations();
  }, []);

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Badge variant="secondary">Chewbuu spots</Badge>
        <div className="mt-5 max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Places worth making plans for.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            These spots have been claimed, verified, and set up by Chewbuu Sync.
            Browse a real menu, see what’s on, and find your next date starting
            point.
          </p>
        </div>

        {isLoading ? (
          <LoaderCircle className="mx-auto mt-16 size-6 animate-spin text-primary" />
        ) : loadError ? (
          <Card className="mt-10 border-dashed">
            <CardHeader>
              <CardTitle>Spots are taking a moment</CardTitle>
              <CardDescription>
                We couldn’t load the public collection. Try refreshing, or join
                Chewbuu to discover local places in the app.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : locations.length === 0 ? (
          <Card className="mt-10 border-dashed">
            <CardHeader>
              <CardTitle>Verified spots are on the way</CardTitle>
              <CardDescription>
                Join Chewbuu to discover local places while Sync builds the
                first public spot collection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants()} to="/auth/sign-up">
                Join Chewbuu
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {locations.map((location) => (
              <Link
                className="group"
                key={location.id}
                params={{ locationId: location.handle }}
                to="/spots/$locationId"
              >
                <Card className="h-full rounded-3xl transition group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-lg">
                  <CardHeader>
                    <Badge className="w-fit" variant="outline">
                      <MapPin className="mr-1 size-3" /> Sync verified
                    </Badge>
                    <CardTitle className="mt-3">{location.name}</CardTitle>
                    <CardDescription>
                      {location.address ?? "Location details coming soon"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm font-medium text-primary">
                    <span>Explore this spot</span>
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
