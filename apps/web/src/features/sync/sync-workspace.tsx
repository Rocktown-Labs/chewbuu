import type {
  VenueJobListing,
  VenueServiceBoard,
  VenueServiceConfig,
  VenueServiceCustomer,
  VenueServiceMode,
  VenueServiceOrder,
  VenueServiceTable,
  VenueShift,
  VenueStaffRole,
  VenueStaffStatus,
  VenueSyncChannel,
} from "@chewbuu/aws-blocks";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@chewbuu/ui/components/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@chewbuu/ui/components/select";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coffee,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Table2,
  UserCheck,
  UserCog,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { chatApi } from "@/lib/chat-api";
import {
  connectApi,
  paymentsApi,
  venueApi,
  type VenueLocation,
  type VenueMenuItem,
} from "@/lib/dating-api";
import { syncBillingApi } from "@/lib/sync-billing-api";

const MANAGER_ROLES = new Set<VenueStaffRole>([
  "admin",
  "lead",
  "manager",
  "owner",
]);
const STAFF_ROLES: VenueStaffRole[] = [
  "admin",
  "host",
  "kitchen",
  "lead",
  "manager",
  "owner",
  "server",
  "staff",
];
const ORDER_STATUSES = [
  "draft",
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
] as const;
const SERVICE_MODES: VenueServiceMode[] = [
  "pre_open",
  "open",
  "closing",
  "closed",
];

export interface SyncWorkspaceProps {
  currentUserId: string;
  locations: VenueLocation[];
}

const isManagerRole = (role: VenueStaffRole) => MANAGER_ROLES.has(role);

const statusLabel = (status: string) => status.replaceAll("_", " ");

const formatMoney = (cents: number) =>
  new Intl.NumberFormat(undefined, {
    currency: "USD",
    style: "currency",
  }).format(cents / 100);

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const localDateTimeValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return Math.trunc(hours * 60 + minutes);
};

const dollarsToCents = (value: string) => {
  const dollars = Number(value);
  return Number.isFinite(dollars) ? Math.max(0, Math.round(dollars * 100)) : 0;
};

const nextOrderStatus = (status: string) => {
  const index = ORDER_STATUSES.indexOf(
    status as (typeof ORDER_STATUSES)[number]
  );
  return index !== -1 && index < ORDER_STATUSES.length - 1
    ? ORDER_STATUSES[index + 1]
    : undefined;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getCurrentPosition = async (): Promise<GeolocationPosition> => {
  if (!navigator.geolocation) {
    throw new Error("This browser does not provide location permission.");
  }
  // The browser API is callback-based, but this is intentionally one request.
  // eslint-disable-next-line promise/avoid-new
  return await new Promise<GeolocationPosition>((resolve, reject) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks, node/callback-return
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      // eslint-disable-line promise/prefer-await-to-callbacks, node/callback-return
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10_000,
    });
  });
};

export function SyncWorkspace({
  currentUserId,
  locations,
}: SyncWorkspaceProps) {
  const [selectedLocationId, setSelectedLocationId] = useState(
    locations[0]?.id ?? ""
  );
  const [board, setBoard] = useState<VenueServiceBoard | null>(null);
  const [config, setConfig] = useState<VenueServiceConfig | null>(null);
  const [staff, setStaff] = useState<VenueStaffStatus[]>([]);
  const [customers, setCustomers] = useState<VenueServiceCustomer[]>([]);
  const [menuItems, setMenuItems] = useState<VenueMenuItem[]>([]);
  const [listings, setListings] = useState<VenueJobListing[]>([]);
  const [channel, setChannel] = useState<VenueSyncChannel | null>(null);
  const [connectStatus, setConnectStatus] = useState<Awaited<
    ReturnType<typeof connectApi.getVenueStatus>
  > | null>(null);
  const [messages, setMessages] = useState<
    Awaited<ReturnType<typeof chatApi.getMessages>>["messages"]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [staffRemovalCandidate, setStaffRemovalCandidate] = useState<{
    displayName: string;
    userId: string;
  } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [clockCode, setClockCode] = useState("");
  const [useLocationCheck, setUseLocationCheck] = useState(false);
  const [lateMinutes, setLateMinutes] = useState("15");
  const [etaAt, setEtaAt] = useState(
    localDateTimeValue(new Date(Date.now() + 45 * 60_000))
  );
  const [customerForm, setCustomerForm] = useState({
    displayName: "",
    notes: "",
    phone: "",
  });
  const [orderForm, setOrderForm] = useState({
    customerName: "",
    itemName: "",
    menuItemId: "custom",
    modifiers: "",
    price: "",
    quantity: "1",
    tableId: "none",
    tip: "",
  });
  const [scheduleForm, setScheduleForm] = useState(() => {
    const start = new Date(Date.now() + 24 * 60 * 60_000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 8 * 60 * 60_000);
    return {
      endAt: localDateTimeValue(end),
      role: "server" as VenueStaffRole,
      section: "",
      startAt: localDateTimeValue(start),
      userId: "",
    };
  });
  const [serviceForm, setServiceForm] = useState({
    closeTime: "23:00",
    geofenceRadiusMeters: "150",
    openTime: "09:00",
    override: "none" as VenueServiceMode | "none",
  });
  const [jobForm, setJobForm] = useState({
    applicationUrl: "",
    description: "",
    employmentType: "Full time",
    payText: "",
    scheduleText: "",
    status: "draft" as VenueJobListing["status"],
    title: "",
  });

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === selectedLocationId),
    [locations, selectedLocationId]
  );
  const isManager = board ? isManagerRole(board.viewerRole) : false;
  const currentAttendance = board?.attendance;
  const currentShift = board?.shifts.find(
    (shift) => shift.userId === currentUserId
  );
  const activeStaff = staff.filter(
    (person) => person.status === "active" && person.userId
  );
  const staffNames = useMemo(
    () =>
      new Map(
        staff
          .filter((person) => person.userId)
          .map((person) => [person.userId as string, person.displayName])
      ),
    [staff]
  );

  useEffect(() => {
    if (locations.some((location) => location.id === selectedLocationId)) {
      return;
    }
    setSelectedLocationId(locations[0]?.id ?? "");
  }, [locations, selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setConnectStatus(null);
      return;
    }
    const loadConnectStatus = async () => {
      try {
        setConnectStatus(await connectApi.getVenueStatus(selectedLocationId));
      } catch {
        setConnectStatus(null);
      }
    };
    void loadConnectStatus();
  }, [selectedLocationId]);

  useEffect(() => {
    if (!config) return;
    setServiceForm({
      closeTime: minutesToTime(config.closeMinute),
      geofenceRadiusMeters: String(config.geofenceRadiusMeters),
      openTime: minutesToTime(config.openMinute),
      override: config.override ?? "none",
    });
  }, [config]);

  const load = useCallback(
    async (showRefresh = false) => {
      if (!selectedLocationId) {
        setIsLoading(false);
        return;
      }
      if (showRefresh) setIsRefreshing(true);
      try {
        const [nextBoard, nextCustomers, nextMenu, nextChannels] =
          await Promise.all([
            venueApi.getServiceBoard({ locationId: selectedLocationId }),
            venueApi.listServiceCustomers({ locationId: selectedLocationId }),
            venueApi.listMenuItems(selectedLocationId),
            venueApi.listSyncChannels(selectedLocationId),
          ]);
        setBoard(nextBoard);
        setCustomers(nextCustomers.customers);
        setMenuItems(nextMenu.items);
        setStaff(nextBoard.staff);
        setChannel(nextChannels.channels[0] ?? null);
        if (nextChannels.channels[0]) {
          const nextMessages = await chatApi.getMessages(
            nextChannels.channels[0].roomId
          );
          setMessages(nextMessages.messages);
        } else {
          setMessages([]);
        }
        if (isManagerRole(nextBoard.viewerRole)) {
          const [nextStaff, nextConfig, nextListings] = await Promise.all([
            venueApi.getStaffStatus(selectedLocationId),
            venueApi.getServiceConfig(selectedLocationId),
            venueApi.listJobListings(selectedLocationId),
          ]);
          setStaff(nextStaff.staff);
          setConfig(nextConfig.config);
          setListings(nextListings.listings);
        } else {
          setConfig(null);
          setListings([]);
        }
      } catch (error) {
        toast.error(
          getErrorMessage(error, "Could not load the Sync workspace.")
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedLocationId]
  );

  useEffect(() => {
    setBoard(null);
    void load();
  }, [load]);

  const runAction = async (
    action: string,
    actionFn: () => Promise<void>,
    successMessage?: string
  ) => {
    setPendingAction(action);
    try {
      await actionFn();
      if (successMessage) toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "That action could not be completed.")
      );
    } finally {
      setPendingAction(null);
    }
  };

  const clockIn = async () => {
    if (!board || !currentShift) {
      toast.error("You do not have an active shift assigned at this location.");
      return;
    }
    await runAction(
      "clock-in",
      async () => {
        let coordinates: { latitude: number; longitude: number } | undefined;
        if (useLocationCheck) {
          const position = await getCurrentPosition();
          coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
        await venueApi.clockIn({
          code: clockCode,
          ...coordinates,
          locationId: selectedLocationId,
          shiftId: currentShift.id,
        });
      },
      "You are clocked in."
    );
  };

  const updateAttendance = async (
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out"
  ) => {
    if (!currentAttendance) return;
    await runAction(
      `attendance-${action}`,
      async () => {
        await venueApi.updateAttendance({
          action,
          attendanceId: currentAttendance.id,
        });
      },
      action === "clock_out" ? "You are clocked out." : "Attendance updated."
    );
  };

  const reportLate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentAttendance) return;
    await runAction(
      "report-late",
      async () => {
        await venueApi.reportLate({
          attendanceId: currentAttendance.id,
          etaAt: etaAt ? new Date(etaAt).toISOString() : undefined,
          lateMinutes: Math.trunc(Number(lateMinutes)),
        });
      },
      "Your manager has been notified."
    );
  };

  const createCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "create-customer",
      async () => {
        await venueApi.createServiceCustomer({
          ...customerForm,
          locationId: selectedLocationId,
        });
        setCustomerForm({ displayName: "", notes: "", phone: "" });
      },
      "Customer added to this service shift."
    );
  };

  const createOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedMenuItem = menuItems.find(
      (item) => item.id === orderForm.menuItemId
    );
    const itemName = selectedMenuItem?.name ?? orderForm.itemName.trim();
    const unitPriceCents =
      selectedMenuItem?.priceCents ?? dollarsToCents(orderForm.price);
    if (!itemName || unitPriceCents <= 0) {
      toast.error("Choose a menu item or add an item name and price.");
      return;
    }
    await runAction(
      "create-order",
      async () => {
        const modifiers = orderForm.modifiers
          .split(",")
          .map((modifier) => modifier.trim())
          .filter(Boolean)
          .map((name) => ({ name }));
        await venueApi.createServiceOrder({
          ...(orderForm.customerName.trim()
            ? { customerName: orderForm.customerName.trim() }
            : {}),
          items: [
            {
              ...(selectedMenuItem ? { menuItemId: selectedMenuItem.id } : {}),
              modifiers,
              name: itemName,
              quantity: Math.trunc(Number(orderForm.quantity)),
              unitPriceCents,
            },
          ],
          locationId: selectedLocationId,
          ...(orderForm.tableId !== "none"
            ? { tableId: orderForm.tableId }
            : {}),
          tipCents: dollarsToCents(orderForm.tip),
        });
        setOrderForm({
          customerName: "",
          itemName: "",
          menuItemId: "custom",
          modifiers: "",
          price: "",
          quantity: "1",
          tableId: "none",
          tip: "",
        });
      },
      "Order sent to the service board."
    );
  };

  const startSyncSubscription = async () => {
    setPendingAction("sync-subscription");
    try {
      const result = await syncBillingApi.upgrade(
        selectedLocation?.organizationId ?? ""
      );
      if (result.error) throw new Error(result.error.message);
      if (result.data?.url) window.location.assign(result.data.url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start Sync billing."));
    } finally {
      setPendingAction(null);
    }
  };

  const startVenueOnboarding = async () => {
    setPendingAction("connect-venue");
    try {
      const result = await connectApi.startVenueOnboarding(selectedLocationId);
      setConnectStatus({
        accountId: result.accountId,
        onboardingStatus: "requires_input",
        requirements: result.requirements,
        transferCapabilityStatus: result.transferCapabilityStatus,
      });
      if (result.url) window.location.assign(result.url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start Stripe onboarding."));
    } finally {
      setPendingAction(null);
    }
  };

  const startWorkerOnboarding = async (workerUserId: string) => {
    setPendingAction(`connect-worker-${workerUserId}`);
    try {
      const result = await connectApi.startWorkerOnboarding(
        selectedLocationId,
        workerUserId
      );
      if (result.url) window.location.assign(result.url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start worker onboarding."));
    } finally {
      setPendingAction(null);
    }
  };

  const startOrderCheckout = async (orderId: string) => {
    setPendingAction(`payment-${orderId}`);
    try {
      const result = await paymentsApi.checkout({
        cancelUrl: `${window.location.origin}/sync?payment=cancelled`,
        experienceKind: "dine_in",
        orderId,
        successUrl: `${window.location.origin}/sync?payment=success&orderId=${encodeURIComponent(orderId)}`,
      });
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start checkout."));
      setPendingAction(null);
    }
  };

  const updateOrder = async (input: {
    assignedStaffUserId?: string;
    orderId: string;
    status?: string;
  }) => {
    await runAction(
      `order-${input.orderId}`,
      async () => {
        await venueApi.updateServiceOrder(input);
      },
      "Order updated."
    );
  };

  const updateStaff = async (
    userId: string,
    input: {
      role?: VenueStaffRole;
      status?: "active" | "removed" | "suspended";
    }
  ) => {
    await runAction(
      `staff-${userId}`,
      async () => {
        await venueApi.updateStaff({
          ...input,
          locationId: selectedLocationId,
          userId,
        });
      },
      "Staff access updated."
    );
  };

  const createShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "create-shift",
      async () => {
        await venueApi.upsertShift({
          endAt: new Date(scheduleForm.endAt).toISOString(),
          locationId: selectedLocationId,
          role: scheduleForm.role,
          ...(scheduleForm.section.trim()
            ? { section: scheduleForm.section.trim() }
            : {}),
          startAt: new Date(scheduleForm.startAt).toISOString(),
          userId: scheduleForm.userId,
        });
      },
      "Shift added to the schedule."
    );
  };

  const saveServiceSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "service-settings",
      async () => {
        await venueApi.updateServiceConfig({
          closeMinute: timeToMinutes(serviceForm.closeTime),
          geofenceRadiusMeters: Math.trunc(
            Number(serviceForm.geofenceRadiusMeters)
          ),
          locationId: selectedLocationId,
          openMinute: timeToMinutes(serviceForm.openTime),
          override:
            serviceForm.override === "none" ? null : serviceForm.override,
        });
      },
      "Service settings saved."
    );
  };

  const saveJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAction(
      "job-listing",
      async () => {
        await venueApi.upsertJobListing({
          ...(jobForm.applicationUrl.trim()
            ? { applicationUrl: jobForm.applicationUrl.trim() }
            : {}),
          description: jobForm.description,
          employmentType: jobForm.employmentType,
          locationId: selectedLocationId,
          ...(jobForm.payText.trim()
            ? { payText: jobForm.payText.trim() }
            : {}),
          ...(jobForm.scheduleText.trim()
            ? { scheduleText: jobForm.scheduleText.trim() }
            : {}),
          status: jobForm.status,
          title: jobForm.title,
        });
        setJobForm({
          applicationUrl: "",
          description: "",
          employmentType: "Full time",
          payText: "",
          scheduleText: "",
          status: "draft",
          title: "",
        });
      },
      "Job listing saved."
    );
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!channel || !messageDraft.trim()) return;
    await runAction("send-message", async () => {
      await chatApi.sendMessage(channel.roomId, {
        text: messageDraft.trim(),
      });
      const nextMessages = await chatApi.getMessages(channel.roomId);
      setMessages(nextMessages.messages);
      setMessageDraft("");
    });
  };

  if (!selectedLocation) {
    return <NoLocationsState />;
  }

  if (isLoading || !board) {
    return (
      <main className="min-h-screen bg-muted/20 px-4 py-6 sm:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" /> Loading your Sync
            desk…
          </div>
        </div>
      </main>
    );
  }

  const activeOrderCount = [...board.orders, ...board.preOrders].filter(
    (order) => !["completed", "cancelled"].includes(order.status)
  ).length;
  const attendanceActionDisabled = pendingAction !== null;

  return (
    <>
      <a
        className="sr-only rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-10 focus-visible:ring-2 focus-visible:ring-ring"
        href="#main-content"
      >
        Skip to content
      </a>
      <main className="min-h-screen bg-muted/20 pb-16" id="main-content">
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
          <p aria-live="polite" className="sr-only">
            {pendingAction ? "Updating Sync…" : ""}
          </p>
          <header className="overflow-hidden rounded-[2rem] bg-primary text-primary-foreground shadow-xl shadow-primary/10">
            <div className="flex flex-col gap-8 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary-foreground/70">
                  <span className="inline-flex items-center gap-2">
                    <Store className="size-4" /> Chewbuu Sync
                  </span>
                  <span aria-hidden="true">/</span>
                  <span>Service desk</span>
                </div>
                <h1 className="mt-6 max-w-xl font-serif text-4xl leading-[0.95] tracking-tight sm:text-6xl">
                  Keep the floor moving.
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-6 text-primary-foreground/75 sm:text-base">
                  {isManager
                    ? "One command view for your people, tables, orders, and the decisions that keep service calm."
                    : "Your shift, your section, and the next useful action—without the back-office noise."}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field className="min-w-64">
                  <FieldLabel className="text-primary-foreground/70">
                    Working location
                  </FieldLabel>
                  <Select
                    onValueChange={(value) =>
                      setSelectedLocationId(value ?? "")
                    }
                    value={selectedLocationId}
                  >
                    <SelectTrigger className="h-11 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15">
                      <SelectValue placeholder="Choose a location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Locations</SelectLabel>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Button
                  className="h-11 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
                  disabled={isRefreshing}
                  onClick={() => void load(true)}
                  variant="outline"
                >
                  <RefreshCw
                    data-icon="inline-start"
                    className={isRefreshing ? "animate-spin" : undefined}
                  />
                  Refresh
                </Button>
              </div>
            </div>
            <nav
              aria-label="Sync workspace"
              className="flex gap-1 overflow-x-auto border-t border-primary-foreground/10 px-4 py-3 sm:px-8"
            >
              <AnchorLink
                href="#service"
                icon={<LayoutDashboard />}
                label="Desk"
              />
              <AnchorLink href="#orders" icon={<Utensils />} label="Orders" />
              <AnchorLink href="#floor" icon={<Table2 />} label="Floor" />
              <AnchorLink href="#team" icon={<Users />} label="Team" />
              <AnchorLink
                href="#work-chat"
                icon={<MessageSquare />}
                label="Chat"
              />
              {isManager ? (
                <AnchorLink
                  href="#settings"
                  icon={<Settings2 />}
                  label="Settings"
                />
              ) : null}
            </nav>
          </header>

          <section
            className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Service snapshot"
          >
            <SnapshotCard
              detail={`${statusLabel(board.mode)} service mode`}
              icon={<Sparkles />}
              label="Service pulse"
              value={statusLabel(board.mode)}
            />
            <SnapshotCard
              detail={`${board.tables.filter((table) => table.currentOrderIds.length > 0).length} tables with active orders`}
              icon={<Table2 />}
              label="Open floor"
              value={String(board.tables.length)}
            />
            <SnapshotCard
              detail={`${board.preOrders.length} preorder${board.preOrders.length === 1 ? "" : "s"} waiting`}
              icon={<CircleDollarSign />}
              label="Active orders"
              value={String(activeOrderCount)}
            />
            <SnapshotCard
              detail={`${staff.filter((person) => person.attendance?.status === "clocked_in").length} clocked in now`}
              icon={<UserCheck />}
              label="On shift"
              value={String(
                staff.filter((person) => person.status === "active").length
              )}
            />
          </section>

          <SyncSection
            description="The one-time actions that start and finish a shift. Location is checked only when you choose it."
            eyebrow="01 / Shift control"
            id="service"
            title={isManager ? "Service desk" : "Your shift desk"}
          >
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="overflow-hidden border-primary/20 bg-card shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardDescription className="uppercase tracking-[0.16em]">
                        Current state
                      </CardDescription>
                      <CardTitle className="mt-2 flex items-center gap-3 text-2xl capitalize">
                        <ModeMark mode={board.mode} /> {statusLabel(board.mode)}
                      </CardTitle>
                    </div>
                    {isManager && board.dailyCode ? (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Today&apos;s clock-in code
                        </p>
                        <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.18em]">
                          {board.dailyCode}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {isManager ? "Today at a glance" : "Your assignment"}
                    </p>
                    <div className="mt-3 flex flex-col gap-3">
                      <InfoLine
                        icon={<Clock3 />}
                        label="Shift"
                        value={
                          currentShift
                            ? shiftLabel(currentShift)
                            : "No shift assigned"
                        }
                      />
                      <InfoLine
                        icon={<MapPin />}
                        label="Section"
                        value={board.assignedSection ?? "Whole floor"}
                      />
                      <InfoLine
                        icon={<UserCog />}
                        label="Access"
                        value={statusLabel(board.viewerRole)}
                      />
                    </div>
                  </div>
                  <AttendanceControl
                    attendance={currentAttendance}
                    clockCode={clockCode}
                    currentShift={currentShift}
                    disabled={attendanceActionDisabled}
                    etaAt={etaAt}
                    lateMinutes={lateMinutes}
                    onClockCodeChange={setClockCode}
                    onClockIn={() => void clockIn()}
                    onEtaAtChange={setEtaAt}
                    onLateMinutesChange={setLateMinutes}
                    onReportLate={(event) => void reportLate(event)}
                    onUpdateAttendance={(action) =>
                      void updateAttendance(action)
                    }
                    useLocationCheck={useLocationCheck}
                    onUseLocationCheckChange={setUseLocationCheck}
                  />
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-foreground text-background shadow-sm">
                <CardHeader>
                  <CardDescription className="text-background/60 uppercase tracking-[0.16em]">
                    Handoff notes
                  </CardDescription>
                  <CardTitle className="text-background">
                    Read the room quickly.
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <HandoffItem
                    detail={`${board.tables.filter((table) => table.currentOrderIds.length > 0).length} occupied table${board.tables.filter((table) => table.currentOrderIds.length > 0).length === 1 ? "" : "s"}`}
                    label="Floor pressure"
                  />
                  <HandoffItem
                    detail={`${board.preOrders.length} preorder${board.preOrders.length === 1 ? "" : "s"} are waiting for service`}
                    label="Next up"
                  />
                  <HandoffItem
                    detail={`${staff.filter((person) => person.attendance?.lateMinutes).length} late report${staff.filter((person) => person.attendance?.lateMinutes).length === 1 ? "" : "s"} logged`}
                    label="People"
                  />
                  <Link
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary-foreground underline-offset-4 hover:underline"
                    to="/venues"
                  >
                    Browse all locations <ArrowUpRight className="size-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </SyncSection>

          <SyncSection
            description="Create an order from the canonical menu or capture a one-off item. Status changes stay auditable."
            eyebrow="02 / Service flow"
            id="orders"
            title="Orders, without the scramble"
          >
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <OrderComposer
                form={orderForm}
                menuItems={menuItems}
                tables={board.tables}
                disabled={pendingAction !== null}
                onChange={(field, value) =>
                  setOrderForm((current) => ({ ...current, [field]: value }))
                }
                onSubmit={(event) => void createOrder(event)}
              />
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardDescription className="uppercase tracking-[0.16em]">
                      Live queue
                    </CardDescription>
                    <CardTitle className="mt-2">Open orders</CardTitle>
                  </div>
                  <Badge variant="secondary">{activeOrderCount} active</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {board.preOrders.length > 0 ? (
                    <div className="rounded-xl border border-accent bg-accent/20 p-3 text-sm">
                      <p className="font-semibold">Preorders waiting</p>
                      <p className="mt-1 text-muted-foreground">
                        {board.preOrders.length} order
                        {board.preOrders.length === 1 ? "" : "s"} came in before
                        the shift.
                      </p>
                    </div>
                  ) : null}
                  {board.orders.length === 0 ? (
                    <EmptyNotice
                      icon={<Utensils />}
                      label="No service orders yet."
                    />
                  ) : (
                    board.orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        isManager={isManager}
                        order={order}
                        pending={pendingAction === `order-${order.id}`}
                        staff={activeStaff}
                        staffNames={staffNames}
                        onAssign={(userId) =>
                          void updateOrder({
                            assignedStaffUserId: userId,
                            orderId: order.id,
                          })
                        }
                        onCheckout={() => void startOrderCheckout(order.id)}
                        onAdvance={() => {
                          const status = nextOrderStatus(order.status);
                          if (status) {
                            void updateOrder({ orderId: order.id, status });
                          }
                        }}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </SyncSection>

          <SyncSection
            description="Tables, names, and notes are scoped to this location and this service operation."
            eyebrow="03 / Floor view"
            id="floor"
            title="Know who needs what"
          >
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardDescription className="uppercase tracking-[0.16em]">
                    Floor plan
                  </CardDescription>
                  <CardTitle className="mt-2">Tables in service</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {board.tables.length === 0 ? (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <EmptyNotice
                        icon={<Table2 />}
                        label="No tables configured for this location."
                      />
                    </div>
                  ) : (
                    board.tables.map((table) => (
                      <TableTile key={table.id} table={table} />
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription className="uppercase tracking-[0.16em]">
                    Guest context
                  </CardDescription>
                  <CardTitle className="mt-2">Service customers</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <form
                    className="rounded-xl border bg-muted/20 p-4"
                    onSubmit={createCustomer}
                  >
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="customer-name">
                          Display name
                        </FieldLabel>
                        <Input
                          id="customer-name"
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              displayName: event.target.value,
                            }))
                          }
                          placeholder="Table 4 guests"
                          required
                          value={customerForm.displayName}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="customer-phone">
                          Phone (optional)
                        </FieldLabel>
                        <Input
                          id="customer-phone"
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="For follow-up"
                          value={customerForm.phone}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="customer-notes">Notes</FieldLabel>
                        <Textarea
                          id="customer-notes"
                          onChange={(event) =>
                            setCustomerForm((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                          placeholder="Allergy, accessibility, or service note"
                          value={customerForm.notes}
                        />
                      </Field>
                      <Button
                        disabled={pendingAction === "create-customer"}
                        type="submit"
                      >
                        <Plus data-icon="inline-start" /> Add customer
                      </Button>
                    </FieldGroup>
                  </form>
                  <div className="flex flex-col gap-2">
                    {customers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No customer notes yet.
                      </p>
                    ) : (
                      customers.slice(0, 6).map((customer) => (
                        <div
                          className="rounded-xl border p-3"
                          key={customer.id}
                        >
                          <p className="font-medium">{customer.displayName}</p>
                          {customer.notes ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {customer.notes}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </SyncSection>

          <SyncSection
            description={
              isManager
                ? "Manage the people and coverage that make each shift possible."
                : "Your assignment and current team coverage for this location."
            }
            eyebrow="04 / People"
            id="team"
            title="Team and coverage"
          >
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <StaffPanel
                currentUserId={currentUserId}
                isManager={isManager}
                pendingAction={pendingAction}
                staff={staff}
                onConnect={(userId) => void startWorkerOnboarding(userId)}
                onRoleChange={(userId, role) =>
                  void updateStaff(userId, { role })
                }
                onStatusChange={(userId, status) => {
                  if (status === "removed") {
                    const person = staff.find((item) => item.userId === userId);
                    setStaffRemovalCandidate({
                      displayName: person?.displayName ?? "this staff member",
                      userId,
                    });
                    return;
                  }
                  void updateStaff(userId, { status });
                }}
              />
              {isManager ? (
                <SchedulePanel
                  form={scheduleForm}
                  pending={pendingAction === "create-shift"}
                  shifts={board.shifts}
                  staff={activeStaff}
                  staffNames={staffNames}
                  onChange={(field, value) =>
                    setScheduleForm((current) => ({
                      ...current,
                      [field]: value,
                    }))
                  }
                  onSubmit={(event) => void createShift(event)}
                />
              ) : (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardDescription className="uppercase tracking-[0.16em]">
                      Staff mode
                    </CardDescription>
                    <CardTitle className="mt-2">
                      Stay in your lane, clearly.
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
                    <p>
                      Your board only includes orders and tables assigned to
                      your section or staff account. Manager controls stay with
                      managers.
                    </p>
                    <div className="rounded-xl border bg-background/70 p-4">
                      <p className="font-semibold text-foreground">
                        Need a change?
                      </p>
                      <p className="mt-1">
                        Use the location staff channel to ask for a handoff.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </SyncSection>

          <SyncSection
            description="A location-scoped channel for handoffs, announcements, and the small details that keep service human."
            eyebrow="05 / Handoff"
            id="work-chat"
            title="Staff channel"
          >
            <WorkChat
              channel={channel}
              currentUserId={currentUserId}
              disabled={pendingAction === "send-message"}
              draft={messageDraft}
              messages={messages}
              onDraftChange={setMessageDraft}
              onSubmit={(event) => void sendMessage(event)}
            />
          </SyncSection>

          {isManager ? (
            <SyncSection
              description="Control service windows, hiring visibility, and the location-level rules that shape the shift."
              eyebrow="06 / Manager controls"
              id="settings"
              title="Settings and hiring"
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <ServiceSettings
                  form={serviceForm}
                  hasCoordinates={
                    config?.latitude !== undefined &&
                    config.longitude !== undefined
                  }
                  pending={pendingAction === "service-settings"}
                  onChange={(field, value) =>
                    setServiceForm((current) => ({
                      ...current,
                      [field]: value,
                    }))
                  }
                  onSubmit={(event) => void saveServiceSettings(event)}
                />
                <ConnectSettings
                  billingPending={pendingAction === "sync-subscription"}
                  onSubscribe={() => void startSyncSubscription()}
                  pending={pendingAction === "connect-venue"}
                  status={connectStatus}
                  onStart={() => void startVenueOnboarding()}
                />
                <HiringPanel
                  form={jobForm}
                  listings={listings}
                  pending={pendingAction === "job-listing"}
                  onChange={(field, value) =>
                    setJobForm((current) => ({ ...current, [field]: value }))
                  }
                  onPublish={(listing) =>
                    void runAction(
                      `listing-${listing.id}`,
                      async () => {
                        await venueApi.upsertJobListing({
                          applicationUrl: listing.applicationUrl,
                          description: listing.description,
                          employmentType: listing.employmentType,
                          expiresAt: listing.expiresAt,
                          id: listing.id,
                          locationId: selectedLocationId,
                          payText: listing.payText,
                          scheduleText: listing.scheduleText,
                          status: "published",
                          title: listing.title,
                        });
                      },
                      "Listing published to the public spot page."
                    )
                  }
                  onSubmit={(event) => void saveJob(event)}
                />
              </div>
            </SyncSection>
          ) : null}

          <Dialog
            onOpenChange={(open) => {
              if (!open) setStaffRemovalCandidate(null);
            }}
            open={Boolean(staffRemovalCandidate)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Remove {staffRemovalCandidate?.displayName}?
                </DialogTitle>
                <DialogDescription>
                  This revokes access to the location and its Sync channel.
                  Historical shifts, attendance, orders, and audit events stay
                  preserved.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  onClick={() => setStaffRemovalCandidate(null)}
                  variant="outline"
                >
                  Keep access
                </Button>
                <Button
                  onClick={() => {
                    if (!staffRemovalCandidate) return;
                    const { userId } = staffRemovalCandidate;
                    setStaffRemovalCandidate(null);
                    void updateStaff(userId, { status: "removed" });
                  }}
                  variant="destructive"
                >
                  Remove access
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <footer className="mt-8 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Chewbuu Sync · {selectedLocation.name}</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Access and payments remain
              server-controlled.
            </span>
          </footer>
        </div>
      </main>
    </>
  );
}

function NoLocationsState() {
  return (
    <main className="min-h-screen bg-muted/20 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Sync needs a location first.</CardTitle>
            <CardDescription>
              Create or join a venue before opening the service desk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              to="/venues"
            >
              View venue locations <ChevronRight className="inline size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function SyncSection({
  children,
  description,
  eyebrow,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <section className="mt-10 scroll-mt-6" id={id}>
      <div className="mb-4 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function AnchorLink({
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
      className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-primary-foreground/70 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
      href={href}
    >
      {icon}
      {label}
    </a>
  );
}

function SnapshotCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-primary/10 bg-card/80 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-serif text-3xl capitalize tracking-tight">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ModeMark({ mode }: { mode: VenueServiceMode }) {
  return (
    <span
      aria-hidden="true"
      className={`size-3 rounded-full ${mode === "open" ? "bg-accent" : mode === "closing" ? "bg-secondary" : mode === "pre_open" ? "bg-muted-foreground/50" : "bg-destructive"}`}
    />
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background/60 p-3">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium capitalize">{value}</p>
      </div>
    </div>
  );
}

function HandoffItem({ detail, label }: { detail: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-background/10 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-background/60">{label}</span>
      <span className="text-right text-sm font-semibold">{detail}</span>
    </div>
  );
}

function AttendanceControl({
  attendance,
  clockCode,
  currentShift,
  disabled,
  etaAt,
  lateMinutes,
  onClockCodeChange,
  onClockIn,
  onEtaAtChange,
  onLateMinutesChange,
  onReportLate,
  onUpdateAttendance,
  useLocationCheck,
  onUseLocationCheckChange,
}: {
  attendance: VenueServiceBoard["attendance"];
  clockCode: string;
  currentShift: VenueShift | undefined;
  disabled: boolean;
  etaAt: string;
  lateMinutes: string;
  onClockCodeChange: (value: string) => void;
  onClockIn: () => void;
  onEtaAtChange: (value: string) => void;
  onLateMinutesChange: (value: string) => void;
  onReportLate: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateAttendance: (
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out"
  ) => void;
  useLocationCheck: boolean;
  onUseLocationCheckChange: (value: boolean) => void;
}) {
  if (!attendance) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Clock in
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {currentShift
            ? `Assigned ${shiftLabel(currentShift)}.`
            : "No current shift is assigned."}
        </p>
        <FieldGroup className="mt-4">
          <Field>
            <FieldLabel htmlFor="clock-code">
              Manager&apos;s daily code
            </FieldLabel>
            <Input
              id="clock-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => onClockCodeChange(event.target.value)}
              placeholder="000000"
              value={clockCode}
            />
          </Field>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              checked={useLocationCheck}
              className="mt-0.5 accent-primary"
              onChange={(event) =>
                onUseLocationCheckChange(event.target.checked)
              }
              type="checkbox"
            />
            <span>
              Use my location for this one-time venue check. Chewbuu does not
              track continuously.
            </span>
          </label>
          <Button
            disabled={disabled || !currentShift}
            onClick={onClockIn}
            type="button"
          >
            <UserCheck data-icon="inline-start" /> Clock in
          </Button>
        </FieldGroup>
      </div>
    );
  }

  const isOnBreak = attendance.status === "break";
  const isAtLunch = attendance.status === "lunch";
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Attendance
          </p>
          <p className="mt-2 text-lg font-semibold capitalize">
            {statusLabel(attendance.status)}
          </p>
        </div>
        <Badge
          variant={attendance.lateMinutes > 0 ? "destructive" : "secondary"}
        >
          {attendance.lateMinutes > 0
            ? `${attendance.lateMinutes}m late`
            : "On time"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {isOnBreak ? (
          <Button
            disabled={disabled}
            onClick={() => onUpdateAttendance("break_in")}
            variant="outline"
          >
            <Check data-icon="inline-start" /> End break
          </Button>
        ) : isAtLunch ? (
          <Button
            disabled={disabled}
            onClick={() => onUpdateAttendance("lunch_in")}
            variant="outline"
          >
            <Check data-icon="inline-start" /> End lunch
          </Button>
        ) : (
          <>
            <Button
              disabled={disabled}
              onClick={() => onUpdateAttendance("break_out")}
              variant="outline"
            >
              <Coffee data-icon="inline-start" /> Start break
            </Button>
            <Button
              disabled={disabled}
              onClick={() => onUpdateAttendance("lunch_out")}
              variant="outline"
            >
              <Utensils data-icon="inline-start" /> Start lunch
            </Button>
          </>
        )}
        <Button
          disabled={disabled}
          onClick={() => onUpdateAttendance("clock_out")}
          variant="destructive"
        >
          <X data-icon="inline-start" /> Clock out
        </Button>
      </div>
      <form className="mt-4 border-t pt-4" onSubmit={onReportLate}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Update manager
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="late-minutes">Late by (minutes)</FieldLabel>
            <Input
              id="late-minutes"
              min={1}
              onChange={(event) => onLateMinutesChange(event.target.value)}
              type="number"
              value={lateMinutes}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="eta-at">ETA</FieldLabel>
            <Input
              id="eta-at"
              onChange={(event) => onEtaAtChange(event.target.value)}
              type="datetime-local"
              value={etaAt}
            />
          </Field>
        </div>
        <Button
          className="mt-3"
          disabled={disabled}
          size="sm"
          type="submit"
          variant="secondary"
        >
          Report lateness
        </Button>
      </form>
    </div>
  );
}

function OrderComposer({
  disabled,
  form,
  menuItems,
  onChange,
  onSubmit,
  tables,
}: {
  disabled: boolean;
  form: {
    customerName: string;
    itemName: string;
    menuItemId: string;
    modifiers: string;
    price: string;
    quantity: string;
    tableId: string;
    tip: string;
  };
  menuItems: VenueMenuItem[];
  onChange: (field: keyof OrderComposerProps["form"], value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  tables: VenueServiceTable[];
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardDescription className="uppercase tracking-[0.16em]">
          New order
        </CardDescription>
        <CardTitle className="mt-2">Put the next thing in motion.</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="order-menu-item">Menu item</FieldLabel>
              <Select
                onValueChange={(value) =>
                  onChange("menuItemId", value ?? "custom")
                }
                value={form.menuItemId}
              >
                <SelectTrigger id="order-menu-item">
                  <SelectValue placeholder="Choose a menu item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Canonical menu</SelectLabel>
                    <SelectItem value="custom">Custom item</SelectItem>
                    {menuItems
                      .filter((item) => item.available)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · {formatMoney(item.priceCents)}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {form.menuItemId === "custom" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="custom-item-name">Item name</FieldLabel>
                  <Input
                    id="custom-item-name"
                    onChange={(event) =>
                      onChange("itemName", event.target.value)
                    }
                    placeholder="Southern plate"
                    value={form.itemName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="custom-item-price">
                    Price (USD)
                  </FieldLabel>
                  <Input
                    id="custom-item-price"
                    min="0"
                    onChange={(event) => onChange("price", event.target.value)}
                    placeholder="18.00"
                    step="0.01"
                    type="number"
                    value={form.price}
                  />
                </Field>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="order-table">Table</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    onChange("tableId", value ?? "none")
                  }
                  value={form.tableId}
                >
                  <SelectTrigger id="order-table">
                    <SelectValue placeholder="No table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Floor</SelectLabel>
                      <SelectItem value="none">No table</SelectItem>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Table {table.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="order-quantity">Quantity</FieldLabel>
                <Input
                  id="order-quantity"
                  min="1"
                  onChange={(event) => onChange("quantity", event.target.value)}
                  type="number"
                  value={form.quantity}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="order-customer">
                Customer name (optional)
              </FieldLabel>
              <Input
                id="order-customer"
                onChange={(event) =>
                  onChange("customerName", event.target.value)
                }
                placeholder="Table 4 guests"
                value={form.customerName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="order-modifiers">
                Modifiers (comma separated)
              </FieldLabel>
              <Input
                id="order-modifiers"
                onChange={(event) => onChange("modifiers", event.target.value)}
                placeholder="No onions, extra sauce"
                value={form.modifiers}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="order-tip">
                Tip note (USD, optional)
              </FieldLabel>
              <Input
                id="order-tip"
                min="0"
                onChange={(event) => onChange("tip", event.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={form.tip}
              />
              <FieldDescription>
                Checkout uses Chewbuu payments; tip distribution can be assigned
                before settlement.
              </FieldDescription>
            </Field>
            <Button disabled={disabled} type="submit">
              <Plus data-icon="inline-start" /> Create service order
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

type OrderComposerProps = Parameters<typeof OrderComposer>[0];

function OrderRow({
  isManager,
  onAdvance,
  onAssign,
  onCheckout,
  order,
  pending,
  staff,
  staffNames,
}: {
  isManager: boolean;
  onAdvance: () => void;
  onAssign: (userId: string) => void;
  onCheckout: () => void;
  order: VenueServiceOrder;
  pending: boolean;
  staff: VenueStaffStatus[];
  staffNames: Map<string, string>;
}) {
  const nextStatus = nextOrderStatus(order.status);
  return (
    <article className="rounded-2xl border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
            <Badge variant={order.status === "ready" ? "default" : "outline"}>
              {statusLabel(order.status)}
            </Badge>
            {order.source === "preorder" ? (
              <Badge variant="secondary">preorder</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customer?.displayName ?? "Walk-in"}
            {order.tableId ? " · table assigned" : " · no table"}
            {order.assignedStaffUserId
              ? ` · ${staffNames.get(order.assignedStaffUserId) ?? "assigned"}`
              : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatMoney(order.totalCents)}</p>
          <p className="text-xs text-muted-foreground">{order.paymentStatus}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t pt-3">
        {order.items.map((item) => (
          <div
            className="flex items-center justify-between gap-3 text-sm"
            key={item.id}
          >
            <span>
              {item.quantity} × {item.name}
            </span>
            <span className="text-muted-foreground">
              {formatMoney(item.quantity * item.unitPriceCents)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {order.paymentStatus !== "paid" ? (
          <Button onClick={onCheckout} size="sm" variant="outline">
            Pay / send checkout
          </Button>
        ) : null}
        {nextStatus ? (
          <Button disabled={pending} onClick={onAdvance} size="sm">
            Move to {statusLabel(nextStatus)}
          </Button>
        ) : null}
        {isManager ? (
          <Select
            onValueChange={(value) => {
              if (value && value !== "unassigned") onAssign(value);
            }}
            value={order.assignedStaffUserId ?? "unassigned"}
          >
            <SelectTrigger
              className="w-44"
              aria-label={`Assign order ${order.id.slice(0, 8)}`}
            >
              <SelectValue placeholder="Assign staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Assigned staff</SelectLabel>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staff
                  .filter((person) => person.userId)
                  .map((person) => (
                    <SelectItem
                      key={person.userId}
                      value={person.userId as string}
                    >
                      {person.displayName}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </article>
  );
}

function TableTile({ table }: { table: VenueServiceTable }) {
  const occupied = table.currentOrderIds.length > 0;
  return (
    <div
      className={`rounded-2xl border p-4 ${occupied ? "border-primary/30 bg-primary/5" : "bg-background/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">Table {table.label}</p>
          <p className="text-xs text-muted-foreground">
            {table.capacity} seats{table.section ? ` · ${table.section}` : ""}
          </p>
        </div>
        <Badge variant={occupied ? "default" : "outline"}>
          {occupied ? "active" : statusLabel(table.status)}
        </Badge>
      </div>
      {table.customerNames.length > 0 ? (
        <p className="mt-4 text-sm">{table.customerNames.join(", ")}</p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Ready for guests</p>
      )}
    </div>
  );
}

function StaffPanel({
  currentUserId,
  isManager,
  onConnect,
  onRoleChange,
  onStatusChange,
  pendingAction,
  staff,
}: {
  currentUserId: string;
  isManager: boolean;
  onConnect: (userId: string) => void;
  onRoleChange: (userId: string, role: VenueStaffRole) => void;
  onStatusChange: (
    userId: string,
    status: "active" | "removed" | "suspended"
  ) => void;
  pendingAction: string | null;
  staff: VenueStaffStatus[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="uppercase tracking-[0.16em]">
          Roster
        </CardDescription>
        <CardTitle className="mt-2">People on this location</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {staff.length === 0 ? (
          <EmptyNotice icon={<Users />} label="No staff assigned yet." />
        ) : (
          staff.map((person) => {
            const { userId } = person;
            const { attendance } = person;
            return (
              <div
                className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
                key={userId ?? `${person.displayName}-${person.status}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{person.displayName}</p>
                    <Badge
                      variant={
                        person.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {statusLabel(person.status)}
                    </Badge>
                    {attendance ? (
                      <Badge
                        variant={
                          attendance.status === "clocked_in"
                            ? "default"
                            : "outline"
                        }
                      >
                        {statusLabel(attendance.status)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {person.email ?? person.phone ?? "Invitation pending"}
                    {attendance?.lateMinutes
                      ? ` · ${attendance.lateMinutes}m late`
                      : ""}
                  </p>
                </div>
                {isManager && userId ? (
                  <div className="flex flex-wrap gap-2">
                    <Select
                      onValueChange={(value) => {
                        if (value)
                          onRoleChange(userId, value as VenueStaffRole);
                      }}
                      value={person.role}
                    >
                      <SelectTrigger
                        className="w-32"
                        aria-label={`Role for ${person.displayName}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Role</SelectLabel>
                          {STAFF_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {statusLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={pendingAction === `connect-worker-${userId}`}
                      onClick={() => onConnect(userId)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {pendingAction === `connect-worker-${userId}`
                        ? "Opening…"
                        : "Connect payouts"}
                    </Button>
                    <Select
                      disabled={pendingAction === `staff-${userId}`}
                      onValueChange={(value) => {
                        if (value)
                          onStatusChange(
                            userId,
                            value as "active" | "removed" | "suspended"
                          );
                      }}
                      value={person.status}
                    >
                      <SelectTrigger
                        className="w-32"
                        aria-label={`Status for ${person.displayName}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Access</SelectLabel>
                          <SelectItem value="active">active</SelectItem>
                          <SelectItem value="suspended">suspended</SelectItem>
                          <SelectItem value="removed">removed</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                ) : userId === currentUserId ? (
                  <Button
                    disabled={pendingAction === `connect-worker-${userId}`}
                    onClick={() => onConnect(userId)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {pendingAction === `connect-worker-${userId}`
                      ? "Opening…"
                      : "Connect payouts"}
                  </Button>
                ) : (
                  <Badge variant="outline">{statusLabel(person.role)}</Badge>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function SchedulePanel({
  form,
  onChange,
  onSubmit,
  pending,
  shifts,
  staff,
  staffNames,
}: {
  form: {
    endAt: string;
    role: VenueStaffRole;
    section: string;
    startAt: string;
    userId: string;
  };
  onChange: (field: keyof SchedulePanelProps["form"], value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  shifts: VenueShift[];
  staff: VenueStaffStatus[];
  staffNames: Map<string, string>;
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardDescription className="uppercase tracking-[0.16em]">
          Coverage
        </CardDescription>
        <CardTitle className="mt-2">Schedule a shift</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="shift-staff">Staff member</FieldLabel>
              <Select
                onValueChange={(value) => onChange("userId", value ?? "")}
                value={form.userId}
              >
                <SelectTrigger id="shift-staff">
                  <SelectValue placeholder="Choose staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Active staff</SelectLabel>
                    {staff.map((person) => (
                      <SelectItem
                        key={person.userId}
                        value={person.userId as string}
                      >
                        {person.displayName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="shift-start">Starts</FieldLabel>
                <Input
                  id="shift-start"
                  onChange={(event) => onChange("startAt", event.target.value)}
                  required
                  type="datetime-local"
                  value={form.startAt}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-end">Ends</FieldLabel>
                <Input
                  id="shift-end"
                  onChange={(event) => onChange("endAt", event.target.value)}
                  required
                  type="datetime-local"
                  value={form.endAt}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="shift-role">Role</FieldLabel>
                <Select
                  onValueChange={(value) => onChange("role", value ?? "server")}
                  value={form.role}
                >
                  <SelectTrigger id="shift-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Role</SelectLabel>
                      {STAFF_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {statusLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-section">Section</FieldLabel>
                <Input
                  id="shift-section"
                  onChange={(event) => onChange("section", event.target.value)}
                  placeholder="Patio or bar"
                  value={form.section}
                />
              </Field>
            </div>
            <Button disabled={pending || !form.userId} type="submit">
              <CalendarDays data-icon="inline-start" /> Add to schedule
            </Button>
          </FieldGroup>
        </form>
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Near-term shifts
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shifts in the current service window.
              </p>
            ) : (
              shifts.slice(0, 5).map((shift) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background/60 p-3 text-sm"
                  key={shift.id}
                >
                  <span className="min-w-0 truncate font-medium">
                    {staffNames.get(shift.userId) ?? "Staff"} ·{" "}
                    {statusLabel(shift.role)}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(shift.startAt)}–{formatTime(shift.endAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type SchedulePanelProps = Parameters<typeof SchedulePanel>[0];

function WorkChat({
  channel,
  currentUserId,
  disabled,
  draft,
  messages,
  onDraftChange,
  onSubmit,
}: {
  channel: VenueSyncChannel | null;
  currentUserId: string;
  disabled: boolean;
  draft: string;
  messages: Awaited<ReturnType<typeof chatApi.getMessages>>["messages"];
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardDescription className="uppercase tracking-[0.16em]">
              Location channel
            </CardDescription>
            <CardTitle className="mt-2 flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />{" "}
              {channel?.title ?? "Staff channel"}
            </CardTitle>
          </div>
          <Badge variant="secondary">Sync only</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex max-h-80 min-h-48 flex-col gap-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <EmptyNotice
              icon={<MessageSquare />}
              label="Start the handoff here."
            />
          ) : (
            messages.map((message) => (
              <div
                className={`max-w-[85%] rounded-2xl border p-3 text-sm ${message.senderId === currentUserId ? "self-end border-primary/20 bg-primary/5" : "bg-background/70"}`}
                key={message.id}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {message.senderId === currentUserId
                    ? "You"
                    : message.senderId.slice(0, 8)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.text ?? ""}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {formatTime(message.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
        <form
          className="flex gap-2 border-t bg-muted/20 p-4"
          onSubmit={onSubmit}
        >
          <Input
            aria-label="Staff message"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Share a handoff or announcement"
            value={draft}
          />
          <Button disabled={disabled || !draft.trim()} type="submit">
            <ArrowUpRight data-icon="inline-start" /> Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ConnectSettings({
  billingPending,
  onStart,
  onSubscribe,
  pending,
  status,
}: {
  billingPending: boolean;
  onStart: () => void;
  onSubscribe: () => void;
  pending: boolean;
  status: {
    accountId: string | null;
    onboardingStatus: string;
    requirements: Record<string, unknown>;
    transferCapabilityStatus: string;
  } | null;
}) {
  const ready = status?.transferCapabilityStatus === "active";
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardDescription className="uppercase tracking-[0.16em]">
          Payments
        </CardDescription>
        <CardTitle className="mt-2">Venue payouts</CardTitle>
        <CardDescription>
          Connect the venue before collecting date, dine-in, or pickup payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant={status?.accountId ? "secondary" : "outline"}>
            {status?.accountId ? "Account created" : "Not connected"}
          </Badge>
          <Badge variant={ready ? "default" : "outline"}>
            {ready
              ? "Payouts ready"
              : (status?.onboardingStatus ?? "Not started")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending || ready} onClick={onStart} type="button">
            {pending
              ? "Opening Stripe…"
              : ready
                ? "Stripe payouts ready"
                : "Connect venue to Stripe"}
          </Button>
          <Button
            disabled={billingPending}
            onClick={onSubscribe}
            type="button"
            variant="outline"
          >
            {billingPending ? "Opening billing…" : "Subscribe to Sync · $60/mo"}
          </Button>
        </div>
        {!ready &&
        status?.requirements &&
        Object.keys(status.requirements).length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Stripe has outstanding onboarding requirements.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ServiceSettings({
  form,
  hasCoordinates,
  onChange,
  onSubmit,
  pending,
}: {
  form: {
    closeTime: string;
    geofenceRadiusMeters: string;
    openTime: string;
    override: VenueServiceMode | "none";
  };
  hasCoordinates: boolean;
  onChange: (field: keyof ServiceSettingsProps["form"], value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="uppercase tracking-[0.16em]">
          Operating rules
        </CardDescription>
        <CardTitle className="mt-2">Service settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="service-open">Open time</FieldLabel>
                <Input
                  id="service-open"
                  onChange={(event) => onChange("openTime", event.target.value)}
                  required
                  type="time"
                  value={form.openTime}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="service-close">Close time</FieldLabel>
                <Input
                  id="service-close"
                  onChange={(event) =>
                    onChange("closeTime", event.target.value)
                  }
                  required
                  type="time"
                  value={form.closeTime}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="service-override">Mode override</FieldLabel>
              <Select
                onValueChange={(value) => onChange("override", value ?? "none")}
                value={form.override}
              >
                <SelectTrigger id="service-override">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Service mode</SelectLabel>
                    <SelectItem value="none">Use schedule</SelectItem>
                    {SERVICE_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {statusLabel(mode)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="service-radius">
                Geofence radius (meters)
              </FieldLabel>
              <Input
                id="service-radius"
                min="25"
                onChange={(event) =>
                  onChange("geofenceRadiusMeters", event.target.value)
                }
                type="number"
                value={form.geofenceRadiusMeters}
              />
              <FieldDescription>
                {hasCoordinates
                  ? "A one-time location check is active for clock-in."
                  : "Add venue coordinates before requiring location verification."}
              </FieldDescription>
            </Field>
            <Button disabled={pending} type="submit">
              <Settings2 data-icon="inline-start" /> Save service rules
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

type ServiceSettingsProps = Parameters<typeof ServiceSettings>[0];

function HiringPanel({
  form,
  listings,
  onChange,
  onPublish,
  onSubmit,
  pending,
}: {
  form: {
    applicationUrl: string;
    description: string;
    employmentType: string;
    payText: string;
    scheduleText: string;
    status: VenueJobListing["status"];
    title: string;
  };
  listings: VenueJobListing[];
  onChange: (field: keyof HiringPanelProps["form"], value: string) => void;
  onPublish: (listing: VenueJobListing) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="uppercase tracking-[0.16em]">
          Public hiring
        </CardDescription>
        <CardTitle className="mt-2">Bring in the next teammate</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="job-title">Role title</FieldLabel>
                <Input
                  id="job-title"
                  onChange={(event) => onChange("title", event.target.value)}
                  placeholder="Line cook"
                  required
                  value={form.title}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="job-type">Employment type</FieldLabel>
                <Input
                  id="job-type"
                  onChange={(event) =>
                    onChange("employmentType", event.target.value)
                  }
                  placeholder="Full time"
                  required
                  value={form.employmentType}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="job-pay">Pay</FieldLabel>
                <Input
                  id="job-pay"
                  onChange={(event) => onChange("payText", event.target.value)}
                  placeholder="$18–22/hr"
                  value={form.payText}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="job-schedule">Schedule</FieldLabel>
                <Input
                  id="job-schedule"
                  onChange={(event) =>
                    onChange("scheduleText", event.target.value)
                  }
                  placeholder="Evenings + weekends"
                  value={form.scheduleText}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="job-url">Application URL</FieldLabel>
              <Input
                id="job-url"
                onChange={(event) =>
                  onChange("applicationUrl", event.target.value)
                }
                placeholder="https://..."
                type="url"
                value={form.applicationUrl}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="job-description">Description</FieldLabel>
              <Textarea
                id="job-description"
                onChange={(event) =>
                  onChange("description", event.target.value)
                }
                placeholder="What makes this shift a good one?"
                required
                value={form.description}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="job-status">Save as</FieldLabel>
              <Select
                onValueChange={(value) => onChange("status", value ?? "draft")}
                value={form.status}
              >
                <SelectTrigger id="job-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Visibility</SelectLabel>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Button disabled={pending} type="submit">
              <Plus data-icon="inline-start" /> Save listing
            </Button>
          </FieldGroup>
        </form>
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Saved listings
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet.</p>
            ) : (
              listings.slice(0, 5).map((listing) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  key={listing.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {listing.employmentType} · {statusLabel(listing.status)}
                    </p>
                  </div>
                  {listing.status === "draft" ? (
                    <Button
                      onClick={() => onPublish(listing)}
                      size="sm"
                      variant="outline"
                    >
                      Publish
                    </Button>
                  ) : listing.status === "published" ? (
                    <BadgeCheck className="size-5 text-primary" />
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type HiringPanelProps = Parameters<typeof HiringPanel>[0];

function EmptyNotice({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Empty className="min-h-28 rounded-2xl border border-dashed p-5">
      <EmptyMedia className="text-muted-foreground" variant="icon">
        {icon}
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{label}</EmptyTitle>
        <EmptyDescription>
          Updates will appear here as service begins.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const shiftLabel = (shift: VenueShift) =>
  `${formatTime(shift.startAt)}–${formatTime(shift.endAt)} · ${statusLabel(shift.role)}${shift.section ? ` · ${shift.section}` : ""}`;
