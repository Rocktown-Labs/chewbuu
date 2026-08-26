import { Badge } from "@chewbuu/ui/components/badge";
import { buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle, Plus, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { venueApi, type VenueLocation } from "@/lib/dating-api";

export const Route = createFileRoute("/venues")({
  component: VenueLocationsPage,
  ssr: false,
  validateSearch: (search) =>
    z.object({ invite: z.string().optional() }).parse(search),
});

function VenueLocationsPage() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (invite) {
          await venueApi.acceptInvite(invite);
          toast.success("You joined the venue team.");
        }
        const result = await venueApi.getLocations();
        setLocations(result.locations);
        if (invite) {
          await navigate({
            replace: true,
            search: { invite: undefined },
            to: "/venues",
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load venues."
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [invite, navigate]);

  return (
    <main className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">
              <Store className="mr-1 size-3" /> Chewbuu Sync
            </Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Venue locations
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage venue operations from one responsive workspace.
            </p>
          </div>
          <Link className={buttonVariants()} to="/venue-portal">
            <Plus className="mr-2 size-4" /> Add venue
          </Link>
        </div>

        {isLoading ? (
          <LoaderCircle className="mx-auto mt-20 size-6 animate-spin text-primary" />
        ) : locations.length === 0 ? (
          <Card className="mt-8 border-dashed">
            <CardHeader>
              <CardTitle>No venues yet</CardTitle>
              <CardDescription>
                Create one to test reservations, ordering, notifications, and
                email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={buttonVariants()} to="/venue-portal">
                Create your first venue
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {locations.map((location) => (
              <Link
                className="group"
                key={location.id}
                params={{ venueId: location.id }}
                to="/venues/$venueId"
              >
                <Card
                  className="h-full transition group-hover:-translate-y-0.5 group-hover:border-primary/50"
                  style={{
                    backgroundColor: location.style?.backgroundColor,
                    borderColor: location.style?.accentColor,
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{location.name}</CardTitle>
                        <CardDescription>
                          {location.handle
                            ? `@${location.handle}`
                            : (location.address ?? "Address not added")}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {location.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Open operations</span>
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
