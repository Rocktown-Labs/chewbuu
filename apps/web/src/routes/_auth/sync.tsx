import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SyncWorkspace } from "@/features/sync/sync-workspace";
import { venueApi, type VenueLocation } from "@/lib/dating-api";

export const Route = createFileRoute("/_auth/sync")({
  component: SyncRoute,
  ssr: false,
});

function SyncRoute() {
  const { session } = Route.useRouteContext();
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const result = await venueApi.getLocations();
        setLocations(result.locations);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load your venue locations."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadLocations();
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <p className="text-sm text-muted-foreground">Loading Sync…</p>
      </main>
    );
  }

  return (
    <SyncWorkspace
      currentUserId={session.data?.user.id ?? ""}
      locations={locations}
    />
  );
}
