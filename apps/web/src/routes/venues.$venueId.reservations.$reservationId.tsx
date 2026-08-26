import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { venueApi, type VenueReservation } from "@/lib/dating-api";

export const Route = createFileRoute(
  "/venues/$venueId/reservations/$reservationId"
)({
  component: ReservationDetailPage,
  ssr: false,
});

const statuses = [
  "requested",
  "confirmed",
  "seated",
  "completed",
  "declined",
  "cancelled",
];

function ReservationDetailPage() {
  const { reservationId, venueId } = Route.useParams();
  const [reservation, setReservation] = useState<VenueReservation | null>(null);
  const [tableLabel, setTableLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const workspace = await venueApi.getWorkspace(venueId);
      const next =
        workspace.reservations.find((item) => item.id === reservationId) ??
        null;
      setReservation(next);
      setTableLabel(next?.tableLabel ?? "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load reservation."
      );
    } finally {
      setIsLoading(false);
    }
  }, [reservationId, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (status: string) => {
    try {
      const result = await venueApi.updateReservation({
        reservationId,
        status,
        tableLabel: tableLabel || undefined,
      });
      setReservation(result.reservation);
      toast.success(`Reservation marked ${status}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update reservation."
      );
    }
  };

  if (isLoading) {
    return (
      <LoaderCircle className="mx-auto mt-20 size-6 animate-spin text-primary" />
    );
  }

  if (!reservation) {
    return (
      <p className="p-8 text-center text-muted-foreground">
        Reservation not found.
      </p>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          params={{ venueId }}
          to="/venues/$venueId"
        >
          <ArrowLeft className="size-4" /> Back to workspace
        </Link>
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge variant="secondary">
                  <CalendarClock className="mr-1 size-3" /> Reservation
                </Badge>
                <CardTitle className="mt-3">
                  Party of {reservation.partySize}
                </CardTitle>
                <CardDescription>
                  {new Date(reservation.requestedAt).toLocaleString()}
                </CardDescription>
              </div>
              <Badge>{reservation.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {reservation.notes ? (
              <p className="rounded-lg bg-muted/40 p-3 text-sm">
                {reservation.notes}
              </p>
            ) : null}
            <label className="block space-y-2 text-sm font-medium">
              Table label
              <Input
                value={tableLabel}
                onChange={(event) => setTableLabel(event.target.value)}
                placeholder="A4"
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-medium">
                Move reservation through service
              </p>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    onClick={() => void update(status)}
                    variant={
                      reservation.status === status ? "default" : "outline"
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
