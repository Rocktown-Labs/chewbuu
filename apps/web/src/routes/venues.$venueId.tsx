import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Menu,
  RefreshCw,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { venueApi, type VenueWorkspace } from "@/lib/dating-api";

export const Route = createFileRoute("/venues/$venueId")({
  component: VenueWorkspacePage,
  ssr: false,
});

const reservationStatuses = [
  "requested",
  "confirmed",
  "seated",
  "completed",
] as const;
const orderStatuses = [
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
] as const;

function VenueWorkspacePage() {
  const { venueId } = Route.useParams();
  const [workspace, setWorkspace] = useState<VenueWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const refresh = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setIsRefreshing(true);
      try {
        const nextWorkspace = await venueApi.getWorkspace(venueId);
        setWorkspace(nextWorkspace);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load this venue."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [venueId]
  );

  useEffect(() => {
    void refresh();
    let subscription:
      | { established: Promise<void>; unsubscribe: () => void }
      | undefined;
    let cancelled = false;

    const connectToVenueEvents = async () => {
      try {
        const channel = await venueApi.subscribeEvents(venueId);
        if (cancelled) return;
        subscription = channel.subscribe(() => void refresh());
        await subscription.established;
      } catch {
        // The durable workspace remains usable if realtime is unavailable.
      }
    };
    void connectToVenueEvents();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [refresh, venueId]);

  const createDemoReservation = async () => {
    setIsDemoLoading(true);
    try {
      await venueApi.requestReservation({
        locationId: venueId,
        notes: "Demo reservation created by the admin workspace.",
        partySize: 2,
        requestedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      toast.success("Demo reservation received.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create reservation."
      );
    } finally {
      setIsDemoLoading(false);
    }
  };

  const createDemoOrder = async () => {
    setIsDemoLoading(true);
    try {
      await venueApi.createOrder({
        items: [
          { name: "Demo Southern Plate", quantity: 1, unitPriceCents: 1800 },
          { name: "Sweet tea", quantity: 2, unitPriceCents: 350 },
        ],
        locationId: venueId,
        tipCents: 300,
      });
      toast.success("Demo order received.");
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create order."
      );
    } finally {
      setIsDemoLoading(false);
    }
  };

  const updateReservation = async (
    reservationId: string,
    status: string,
    tableLabel?: string
  ) => {
    try {
      await venueApi.updateReservation({ reservationId, status, tableLabel });
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update reservation."
      );
    }
  };

  const updateOrder = async (orderId: string, status: string) => {
    try {
      await venueApi.updateOrder({ orderId, status });
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update order."
      );
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <LoaderCircle className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl p-6 pt-16">
        <Card>
          <CardHeader>
            <CardTitle>Venue workspace unavailable</CardTitle>
            <CardDescription>
              This venue may still be waiting for a claim approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="text-sm font-medium underline" to="/venue-portal">
              Return to venue setup
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 sm:p-6 lg:p-8">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 space-y-4">
            <Link
              className="flex items-center gap-2 px-3 text-lg font-semibold"
              to="/"
            >
              <Store className="size-5 text-primary" /> Chewbuu Sync
            </Link>
            <nav
              className="space-y-1 rounded-2xl border bg-card p-2"
              aria-label="Venue workspace"
            >
              <WorkspaceNavLink
                href="#overview"
                icon={<ClipboardList className="size-4" />}
                label="Overview"
              />
              <WorkspaceNavLink
                href="#reservations"
                icon={<CalendarClock className="size-4" />}
                label="Reservations"
              />
              <WorkspaceNavLink
                href="#orders"
                icon={<Utensils className="size-4" />}
                label="Orders"
              />
              <WorkspaceNavLink
                href="#staff"
                icon={<Users className="size-4" />}
                label="Staff & shifts"
              />
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header
            className="mb-6 flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{
              backgroundColor: workspace.location.style?.backgroundColor,
              borderColor: workspace.location.style?.accentColor,
            }}
          >
            <div>
              <Badge variant="secondary">
                Admin preview · {workspace.location.status}
              </Badge>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {workspace.location.name}
              </h1>
              {workspace.location.handle ? (
                <p className="text-sm font-medium text-primary">
                  @{workspace.location.handle}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Venue command center for reservations, dining, orders, and
                staff.
              </p>
            </div>
            <Button
              disabled={isRefreshing}
              onClick={() => void refresh(true)}
              variant="outline"
            >
              <RefreshCw
                className={
                  isRefreshing ? "mr-2 size-4 animate-spin" : "mr-2 size-4"
                }
              />
              Refresh
            </Button>
          </header>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <WorkspaceNavLink
              href="#overview"
              icon={<ClipboardList className="size-4" />}
              label="Overview"
            />
            <WorkspaceNavLink
              href="#reservations"
              icon={<CalendarClock className="size-4" />}
              label="Reservations"
            />
            <WorkspaceNavLink
              href="#orders"
              icon={<Utensils className="size-4" />}
              label="Orders"
            />
            <WorkspaceNavLink
              href="#staff"
              icon={<Users className="size-4" />}
              label="Staff"
            />
          </div>

          <section className="grid gap-4 sm:grid-cols-3" id="overview">
            <MetricCard
              label="Open reservations"
              value={
                workspace.reservations.filter(
                  (item) =>
                    !["completed", "declined", "cancelled"].includes(
                      item.status
                    )
                ).length
              }
              icon={<CalendarClock className="size-4" />}
            />
            <MetricCard
              label="Active orders"
              value={
                workspace.orders.filter(
                  (item) => !["completed", "cancelled"].includes(item.status)
                ).length
              }
              icon={<Utensils className="size-4" />}
            />
            <MetricCard
              label="Staff access"
              value="Unlimited"
              icon={<Users className="size-4" />}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2" id="reservations">
            <OperationCard
              description="Move guests from request to table."
              icon={<CalendarClock className="size-5 text-primary" />}
              title="Reservations"
            >
              {workspace.reservations.length === 0 ? (
                <EmptyOperation label="No reservations yet." />
              ) : (
                workspace.reservations.map((reservation) => (
                  <div
                    className="rounded-xl border transition hover:border-primary/50 hover:bg-muted/30"
                    key={reservation.id}
                  >
                    <Link
                      className="block p-4"
                      params={{ reservationId: reservation.id, venueId }}
                      to="/venues/$venueId/reservations/$reservationId"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            Party of {reservation.partySize}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(reservation.requestedAt)}
                            {reservation.tableLabel
                              ? ` · Table ${reservation.tableLabel}`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge status={reservation.status} />
                      </div>
                    </Link>
                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                      {reservationStatuses.map((status) => (
                        <Button
                          key={status}
                          onClick={() =>
                            void updateReservation(
                              reservation.id,
                              status,
                              status === "seated"
                                ? "A4"
                                : reservation.tableLabel
                            )
                          }
                          size="sm"
                          variant={
                            reservation.status === status
                              ? "default"
                              : "outline"
                          }
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </OperationCard>

            <OperationCard
              description="Accept, prepare, and complete dine-in or pickup orders."
              icon={<Utensils className="size-5 text-primary" />}
              title="Orders"
            >
              {workspace.orders.length === 0 ? (
                <EmptyOperation label="No orders yet." />
              ) : (
                workspace.orders.map((order) => (
                  <div
                    className="rounded-xl border transition hover:border-primary/50 hover:bg-muted/30"
                    key={order.id}
                  >
                    <Link
                      className="block p-4"
                      params={{ orderId: order.id, venueId }}
                      to="/venues/$venueId/orders/$orderId"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${(order.totalCents / 100).toFixed(2)} ·{" "}
                            {order.paymentStatus}
                          </p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    </Link>
                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                      {orderStatuses.map((status) => (
                        <Button
                          key={status}
                          onClick={() => void updateOrder(order.id, status)}
                          size="sm"
                          variant={
                            order.status === status ? "default" : "outline"
                          }
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </OperationCard>
          </section>

          <section className="mt-6" id="staff">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="size-5 text-primary" />
                  <div>
                    <CardTitle>Staff & shifts</CardTitle>
                    <CardDescription>
                      The foundation supports unlimited staff, schedules, and
                      shift-swap requests.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <QuickAction
                  icon={<Users className="size-4" />}
                  label="Invite staff"
                />
                <QuickAction
                  icon={<CalendarClock className="size-4" />}
                  label="Build schedule"
                />
                <QuickAction
                  icon={<CheckCircle2 className="size-4" />}
                  label="Review swaps"
                />
              </CardContent>
            </Card>
          </section>

          <section
            className="mt-6 rounded-2xl border border-dashed bg-card p-5"
            id="demo-actions"
          >
            <div className="flex items-start gap-3">
              <Bell className="mt-1 size-5 text-primary" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">Admin test controls</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create test traffic to see the live event, notification,
                  email, and stage flows.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={isDemoLoading}
                    onClick={() => void createDemoReservation()}
                  >
                    <CalendarClock className="mr-2 size-4" /> Demo reservation
                  </Button>
                  <Button
                    disabled={isDemoLoading}
                    onClick={() => void createDemoOrder()}
                    variant="outline"
                  >
                    <Utensils className="mr-2 size-4" /> Demo order
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function WorkspaceNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <a
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      href={href}
    >
      {icon}
      {label}
      <ArrowRight className="ml-auto hidden size-3 sm:block" />
    </a>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function OperationCard({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function EmptyOperation({ label }: { label: string }) {
  return (
    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}

function QuickAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Button className="justify-start" disabled variant="outline">
      {icon}
      <span className="ml-2">{label}</span>
      <Menu className="ml-auto size-3" />
    </Button>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "completed" ? "default" : "outline"}>
      {status}
    </Badge>
  );
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
