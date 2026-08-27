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
import { Input } from "@chewbuu/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@chewbuu/ui/components/tabs";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  Ban,
  Clock,
  Crown,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  connectApi,
  datingApi,
  pricingApi,
  type MembershipPlan,
  type UsernameChangeRequest,
  usernameApi,
  type StripeConnectStatus,
} from "@/lib/dating-api";
import { useAdminStatus } from "@/lib/use-admin-status";

interface AdminUser {
  banExpires?: string | Date | null;
  banReason?: string | null;
  banned?: boolean | null;
  createdAt?: string | Date;
  dailyDateLimit?: number;
  email: string;
  hasCompletedOnboarding?: boolean;
  hasIntroVideo?: boolean;
  hasProfilePhoto?: boolean;
  id: string;
  membershipTier?: string;
  name: string;
  role?: string | null;
  stripeCustomerId?: string | null;
  username?: string | null;
}

const ADMIN_SECTIONS = [
  {
    icon: ShieldCheck,
    label: "Better Auth Admin",
    text: "Role management, banning, impersonation, and user controls are enabled.",
  },
  {
    icon: Crown,
    label: "Membership & Billing",
    text: "Mingle and Sugar tiers are synced directly with Stripe products and prices.",
  },
  {
    icon: UsersRound,
    label: "Circles & Members",
    text: "Circles require an onboarded account and premium membership to initiate.",
  },
  {
    icon: Activity,
    label: "Observability & Jobs",
    text: "AWS Blocks CronJob handles the dating lifecycle; CloudWatch and X-Ray track performance.",
  },
] as const;

const updatePlan = (
  plans: MembershipPlan[],
  tier: MembershipPlan["tier"],
  patch: Partial<MembershipPlan>
) => plans.map((plan) => (plan.tier === tier ? { ...plan, ...patch } : plan));

const listToText = (items: string[]) => items.join("\n");
const textToList = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const RouteComponent = () => {
  const { data: session, isPending } = authClient.useSession();
  const { isAdmin, isPending: isAdminStatusPending } = useAdminStatus(
    Boolean(session)
  );
  const membershipTier = session?.user.membershipTier ?? "social";

  const [activeTab, setActiveTab] = useState<string>("users");
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [connectStatus, setConnectStatus] =
    useState<StripeConnectStatus | null>(null);
  const [connectForm, setConnectForm] = useState({
    secretKey: "",
    webhookSecret: "",
  });
  const [savingConnect, setSavingConnect] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [banUserDialog, setBanUserDialog] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteUserDialog, setDeleteUserDialog] = useState<AdminUser | null>(
    null
  );
  const [usernameRequests, setUsernameRequests] = useState<
    (UsernameChangeRequest & { email: string; name: string })[]
  >([]);

  const loadPlans = async () => {
    try {
      const { plans: nextPlans } = await pricingApi.getPlans();
      setPlans(nextPlans);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load plans."
      );
    }
  };

  const loadUsernameRequests = async () => {
    try {
      const { requests } = await usernameApi.listRequests();
      setUsernameRequests(requests);
    } catch {
      setUsernameRequests([]);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authClient.admin.listUsers({
        query: { limit: 100, offset: 0 },
      });
      if (res.data?.users) {
        setUsers(res.data.users as unknown as AdminUser[]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load users list."
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    const loadConnectStatus = async () => {
      try {
        setConnectStatus(await connectApi.getStatus());
      } catch {
        setConnectStatus(null);
      }
    };
    void loadPlans();
    void loadUsers();
    void loadUsernameRequests();
    void loadConnectStatus();
  }, [isAdmin]);

  const handleSetRole = async (userId: string, currentRole?: string | null) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await authClient.admin.setRole({
        role: nextRole,
        userId,
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to change role.");
      }
      toast.success(`User role updated to ${nextRole}.`);
      void loadUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update user role."
      );
    }
  };

  const handleBanUser = async () => {
    if (!banUserDialog) return;
    try {
      const res = await authClient.admin.banUser({
        banReason: banReason.trim() || undefined,
        userId: banUserDialog.id,
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to ban user.");
      }
      toast.success(`User ${banUserDialog.email} has been banned.`);
      setBanUserDialog(null);
      setBanReason("");
      void loadUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not ban user."
      );
    }
  };

  const handleUnbanUser = async (userId: string, email: string) => {
    try {
      const res = await authClient.admin.unbanUser({ userId });
      if (res.error) {
        throw new Error(res.error.message || "Failed to unban user.");
      }
      toast.success(`User ${email} has been unbanned.`);
      void loadUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not unban user."
      );
    }
  };

  const handleImpersonateUser = async (userId: string, name: string) => {
    try {
      const res = await authClient.admin.impersonateUser({ userId });
      if (res.error) {
        throw new Error(res.error.message || "Failed to impersonate user.");
      }
      toast.success(`Now impersonating ${name}. Redirecting...`);
      window.location.assign("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not impersonate user."
      );
    }
  };

  const handleRemoveUser = async () => {
    if (!deleteUserDialog) return;
    try {
      const res = await authClient.admin.removeUser({
        userId: deleteUserDialog.id,
      });
      if (res.error) {
        throw new Error(res.error.message || "Failed to delete user.");
      }
      toast.success(`User ${deleteUserDialog.email} deleted.`);
      setDeleteUserDialog(null);
      void loadUsers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete user."
      );
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    );
  });

  if (isPending || isAdminStatusPending) {
    return (
      <main className="mx-auto grid min-h-full w-full max-w-5xl place-items-center px-4 py-10">
        <p className="text-muted-foreground">Loading admin control room...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto grid min-h-full w-full max-w-5xl place-items-center px-4 py-10">
        <Card className="w-full max-w-md rounded-3xl">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Sign in with an email listed in BETTER_AUTH_ADMIN_EMAILS to manage
            Chewbuu.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 [&_[data-slot=input]]:rounded-full [&_[data-slot=textarea]]:rounded-2xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-semibold text-primary text-sm uppercase tracking-[0.18em]">
            Admin
          </p>
          <h1 className="mt-2 font-semibold text-4xl text-foreground">
            Chewbuu control room
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-4 py-2 font-medium text-sm">
          <BadgeCheck aria-hidden="true" className="text-primary" />
          {membershipTier.toUpperCase()} member (ADMIN)
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_SECTIONS.map(({ icon: Icon, label, text }) => (
          <Card
            className="rounded-3xl border-border/80 bg-card/70 shadow-sm"
            key={label}
          >
            <CardHeader className="pb-2">
              <Icon aria-hidden="true" className="mb-1 text-primary size-5" />
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              {text}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-3xl border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Venue operations preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a venue, generate demo reservations and orders, and test
              the live service pipeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 font-medium text-sm"
              to="/communities"
            >
              Create Crew / Circle
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 font-medium text-sm"
              to="/venues"
            >
              View venues
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
              to="/venue-portal"
            >
              Open venue setup
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <Tabs
          defaultValue="users"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="grid h-12 w-full max-w-md grid-cols-3 rounded-full bg-muted/60 p-1">
            <TabsTrigger
              className="rounded-full font-medium text-sm data-active:bg-background data-active:shadow-xs"
              value="users"
            >
              <UsersRound className="mr-1.5 size-4" />
              Users
            </TabsTrigger>
            <TabsTrigger
              className="rounded-full font-medium text-sm data-active:bg-background data-active:shadow-xs"
              value="billing"
            >
              <Crown className="mr-1.5 size-4" />
              Billing & Plans
            </TabsTrigger>
            <TabsTrigger
              className="rounded-full font-medium text-sm data-active:bg-background data-active:shadow-xs"
              value="observability"
            >
              <Activity className="mr-1.5 size-4" />
              Observability
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: USERS */}
          <TabsContent className="mt-6 space-y-4" value="users">
            {usernameRequests.length > 0 ? (
              <Card className="rounded-3xl border-amber-500/30 bg-amber-500/5 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCog className="size-4 text-amber-600" /> Username
                    change queue
                  </CardTitle>
                  <CardDescription>
                    Review email-verified username changes before they become
                    public.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {usernameRequests.map((request) => (
                    <div
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                      key={request.id}
                    >
                      <div>
                        <p className="font-medium text-sm">
                          @{request.requestedUsername} · {request.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.email}
                        </p>
                      </div>
                      <Button
                        className="rounded-full"
                        onClick={async () => {
                          try {
                            await usernameApi.approveRequest(request.id);
                            toast.success(
                              `@${request.requestedUsername} approved.`
                            );
                            await loadUsernameRequests();
                            await loadUsers();
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Could not approve username change."
                            );
                          }
                        }}
                        size="sm"
                        type="button"
                      >
                        Approve
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <Card className="rounded-3xl border-border/80 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl">User Administration</CardTitle>
                  <CardDescription>
                    Manage registered accounts, roles, membership tiers, and
                    moderation actions.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      className="pl-8 text-sm"
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, email, username..."
                      value={searchQuery}
                    />
                  </div>
                  <Button onClick={loadUsers} size="sm" variant="outline">
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p className="py-10 text-center text-muted-foreground text-sm">
                    Loading users list...
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground text-sm">
                    No users matched your search query.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase text-muted-foreground tracking-wider">
                          <th className="pb-3 font-semibold">User</th>
                          <th className="pb-3 font-semibold">Role</th>
                          <th className="pb-3 font-semibold">Tier</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold">Joined</th>
                          <th className="pb-3 text-right font-semibold">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredUsers.map((u) => {
                          const isUserAdmin = u.role === "admin";
                          const isBanned = Boolean(u.banned);
                          const isSelf = u.id === session?.user.id;

                          return (
                            <tr className="hover:bg-muted/30" key={u.id}>
                              <td className="py-3">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {u.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {u.email}
                                  </p>
                                  {u.username && (
                                    <p className="text-xs text-primary">
                                      @{u.username}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="py-3">
                                <Badge
                                  className="rounded-full font-medium"
                                  variant={
                                    isUserAdmin ? "default" : "secondary"
                                  }
                                >
                                  {u.role ?? "user"}
                                </Badge>
                              </td>
                              <td className="py-3">
                                <Badge
                                  className="rounded-full capitalize font-medium"
                                  variant="outline"
                                >
                                  {u.membershipTier ?? "social"}
                                </Badge>
                              </td>
                              <td className="py-3">
                                <div className="flex flex-wrap gap-1">
                                  {isBanned ? (
                                    <Badge
                                      className="rounded-full"
                                      variant="destructive"
                                    >
                                      Banned
                                    </Badge>
                                  ) : (
                                    <Badge
                                      className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      variant="secondary"
                                    >
                                      Active
                                    </Badge>
                                  )}
                                  {u.hasCompletedOnboarding && (
                                    <Badge
                                      className="rounded-full"
                                      variant="outline"
                                    >
                                      Onboarded
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 text-xs text-muted-foreground">
                                {u.createdAt
                                  ? new Date(u.createdAt).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td className="py-3 text-right">
                                <div className="inline-flex items-center justify-end gap-1">
                                  {!isSelf && (
                                    <>
                                      <Button
                                        onClick={() =>
                                          handleSetRole(u.id, u.role)
                                        }
                                        size="sm"
                                        title={
                                          isUserAdmin
                                            ? "Demote to user"
                                            : "Promote to admin"
                                        }
                                        variant="ghost"
                                      >
                                        <UserCog className="size-4" />
                                      </Button>

                                      {isBanned ? (
                                        <Button
                                          onClick={() =>
                                            handleUnbanUser(u.id, u.email)
                                          }
                                          size="sm"
                                          title="Unban user"
                                          variant="ghost"
                                        >
                                          <UserCheck className="size-4 text-emerald-500" />
                                        </Button>
                                      ) : (
                                        <Button
                                          onClick={() => {
                                            setBanUserDialog(u);
                                            setBanReason("");
                                          }}
                                          size="sm"
                                          title="Ban user"
                                          variant="ghost"
                                        >
                                          <Ban className="size-4 text-amber-500" />
                                        </Button>
                                      )}

                                      <Button
                                        onClick={() =>
                                          handleImpersonateUser(u.id, u.name)
                                        }
                                        size="sm"
                                        title="Impersonate user"
                                        variant="ghost"
                                      >
                                        <Play className="size-4 text-blue-500" />
                                      </Button>

                                      <Button
                                        onClick={() => setDeleteUserDialog(u)}
                                        size="sm"
                                        title="Delete user"
                                        variant="ghost"
                                      >
                                        <Trash2 className="size-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: BILLING & PRICING */}
          <TabsContent className="mt-6 space-y-6" value="billing">
            <Card className="rounded-3xl border-border/80 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <Badge className="mb-2 rounded-full" variant="secondary">
                    Stripe Catalog
                  </Badge>
                  <CardTitle className="text-xl">
                    Membership Plans & Billing Sync
                  </CardTitle>
                  <CardDescription>
                    Edit tier details, monthly/annual rates, and synchronize
                    with Stripe product/price catalog.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-full"
                    disabled={syncing}
                    onClick={async () => {
                      setSyncing(true);
                      try {
                        const result = await pricingApi.syncPlans();
                        setPlans(result.plans);
                        if (result.stripeConfigured) {
                          toast.success(result.message);
                        } else {
                          toast.error(result.message);
                        }
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not sync Stripe plans."
                        );
                      } finally {
                        setSyncing(false);
                      }
                    }}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCw
                      className={`size-4 ${syncing ? "animate-spin" : ""}`}
                    />
                    Sync with Stripe
                  </Button>
                  <Button
                    className="rounded-full"
                    onClick={async () => {
                      const { plans: nextPlans } = await pricingApi.seedPlans();
                      setPlans(nextPlans);
                      toast.success("Default Chewbuu plans seeded.");
                    }}
                    type="button"
                    variant="outline"
                  >
                    Seed Defaults
                  </Button>
                  <Button
                    className="rounded-full"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const { plans: nextPlans } =
                          await pricingApi.updatePlans(plans);
                        setPlans(nextPlans);
                        toast.success("Pricing configuration saved.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not save pricing."
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    type="button"
                  >
                    Save Changes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <div
                      className="flex flex-col justify-between rounded-xl border bg-background/50 p-5 shadow-xs"
                      key={plan.tier}
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {plan.name}
                            </h3>
                            <p className="text-muted-foreground text-xs uppercase tracking-wider">
                              Tier: {plan.tier}
                            </p>
                          </div>
                          <Badge className="rounded-full" variant="secondary">
                            {plan.monthlyPriceCents === 0
                              ? "Free"
                              : `$${Math.round(plan.monthlyPriceCents / 100)}/mo`}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-3.5">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Display Name
                            </label>
                            <Input
                              aria-label={`${plan.name} name`}
                              className="mt-1"
                              onChange={(event) =>
                                setPlans(
                                  updatePlan(plans, plan.tier, {
                                    name: event.target.value,
                                  })
                                )
                              }
                              value={plan.name}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Description
                            </label>
                            <Textarea
                              aria-label={`${plan.name} description`}
                              className="mt-1"
                              onChange={(event) =>
                                setPlans(
                                  updatePlan(plans, plan.tier, {
                                    description: event.target.value,
                                  })
                                )
                              }
                              rows={2}
                              value={plan.description}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                Monthly (cents)
                              </label>
                              <Input
                                aria-label={`${plan.name} monthly cents`}
                                className="mt-1"
                                onChange={(event) =>
                                  setPlans(
                                    updatePlan(plans, plan.tier, {
                                      monthlyPriceCents: Number(
                                        event.target.value
                                      ),
                                    })
                                  )
                                }
                                type="number"
                                value={plan.monthlyPriceCents}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                Annual (cents)
                              </label>
                              <Input
                                aria-label={`${plan.name} annual cents`}
                                className="mt-1"
                                onChange={(event) =>
                                  setPlans(
                                    updatePlan(plans, plan.tier, {
                                      annualPriceCents: Number(
                                        event.target.value
                                      ),
                                    })
                                  )
                                }
                                type="number"
                                value={plan.annualPriceCents}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Monthly Stripe Price ID
                            </label>
                            <Input
                              aria-label={`${plan.name} Stripe price ID`}
                              className="mt-1 font-mono text-xs"
                              onChange={(event) =>
                                setPlans(
                                  updatePlan(plans, plan.tier, {
                                    stripePriceId: event.target.value,
                                  })
                                )
                              }
                              placeholder="price_..."
                              value={plan.stripePriceId ?? ""}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Annual Stripe Price ID
                            </label>
                            <Input
                              aria-label={`${plan.name} annual Stripe price ID`}
                              className="mt-1 font-mono text-xs"
                              onChange={(event) =>
                                setPlans(
                                  updatePlan(plans, plan.tier, {
                                    annualStripePriceId: event.target.value,
                                  })
                                )
                              }
                              placeholder="price_..."
                              value={plan.annualStripePriceId ?? ""}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              CTA Button Text
                            </label>
                            <Input
                              aria-label={`${plan.name} CTA`}
                              className="mt-1"
                              onChange={(event) =>
                                setPlans(
                                  updatePlan(plans, plan.tier, {
                                    cta: event.target.value,
                                  })
                                )
                              }
                              value={plan.cta}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Features (one per line)
                            </label>
                            <Textarea
                              aria-label={`${plan.name} features`}
                              className="mt-1"
                              onChange={(event) =>
                                setPlans(
                                  updatePlan(plans, plan.tier, {
                                    features: textToList(event.target.value),
                                  })
                                )
                              }
                              rows={3}
                              value={listToText(plan.features)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <Badge className="mb-2 w-fit rounded-full" variant="secondary">
                  Stripe Connect
                </Badge>
                <CardTitle className="text-xl">Platform connection</CardTitle>
                <CardDescription>
                  Store the platform key and webhook secret in AWS SSM
                  SecureString, then verify the connection from this control
                  room. Keys never return to the browser after saving.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge
                    variant={connectStatus?.configured ? "default" : "outline"}
                  >
                    {connectStatus?.configured
                      ? `${connectStatus.mode} key ····${connectStatus.keyLast4}`
                      : "Not configured"}
                  </Badge>
                  <Badge
                    variant={
                      connectStatus?.webhookConfigured ? "default" : "outline"
                    }
                  >
                    {connectStatus?.webhookConfigured
                      ? "Webhook secret saved"
                      : "Webhook secret missing"}
                  </Badge>
                </div>
                <form
                  className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setSavingConnect(true);
                    try {
                      const result = await connectApi.configure(connectForm);
                      setConnectStatus(result);
                      setConnectForm({ secretKey: "", webhookSecret: "" });
                      toast.success(
                        "Stripe Connect credentials verified and stored."
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not configure Stripe Connect."
                      );
                    } finally {
                      setSavingConnect(false);
                    }
                  }}
                >
                  <label className="space-y-2 text-sm font-medium">
                    <span>Restricted or secret platform key</span>
                    <Input
                      autoComplete="off"
                      onChange={(event) =>
                        setConnectForm((current) => ({
                          ...current,
                          secretKey: event.target.value,
                        }))
                      }
                      placeholder="rk_test_…"
                      required
                      type="password"
                      value={connectForm.secretKey}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    <span>Connect webhook secret</span>
                    <Input
                      autoComplete="off"
                      onChange={(event) =>
                        setConnectForm((current) => ({
                          ...current,
                          webhookSecret: event.target.value,
                        }))
                      }
                      placeholder="whsec_…"
                      required
                      type="password"
                      value={connectForm.webhookSecret}
                    />
                  </label>
                  <Button disabled={savingConnect} type="submit">
                    {savingConnect ? "Verifying…" : "Save & verify"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  This config only verifies access and stores credentials.
                  Connected-account creation, onboarding, charges, payouts,
                  refunds, and disputes stay capability-gated until the platform
                  country, venue country, responsibility model, and charge
                  pattern are approved.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: OBSERVABILITY & OPERATIONS */}
          <TabsContent className="mt-6 space-y-6" value="observability">
            <Card className="rounded-3xl border-border/80 bg-card/70 shadow-sm">
              <CardHeader>
                <Badge className="mb-2 rounded-full w-fit" variant="secondary">
                  AWS CloudWatch & X-Ray
                </Badge>
                <CardTitle className="text-xl">
                  Cloud Infrastructure & Observability
                </CardTitle>
                <CardDescription>
                  Access real-time telemetry, API metrics, error logs, and
                  trigger scheduled lifecycle routines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h4 className="font-semibold text-base">
                      API Backend Dashboard
                    </h4>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Lambda latency p95, invocation counts, scheduled job
                      executions, and error rates.
                    </p>
                    <Button
                      className="mt-4 w-full rounded-full"
                      onClick={() => {
                        window.location.assign(
                          "/admin/observability/aws-blocks"
                        );
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Activity className="size-4" />
                      Open API Dashboard
                    </Button>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h4 className="font-semibold text-base">
                      Web SSR & Auth Dashboard
                    </h4>
                    <p className="mt-1 text-muted-foreground text-xs">
                      TanStack Start server-side rendering health, Better Auth
                      endpoints, and 4xx/5xx rates.
                    </p>
                    <Button
                      className="mt-4 w-full rounded-full"
                      onClick={() => {
                        window.location.assign(
                          "/admin/observability/aws-blocks-web"
                        );
                      }}
                      type="button"
                      variant="outline"
                    >
                      <Activity className="size-4" />
                      Open Web/Auth Dashboard
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-semibold text-base">
                        Trigger Dating Lifecycle Routine
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        CronJob runs every 1 minute in AWS. Trigger a manual
                        cycle now to settle reviews and transitions.
                      </p>
                    </div>
                    <Button
                      className="rounded-full"
                      disabled={runningJob}
                      onClick={async () => {
                        setRunningJob(true);
                        try {
                          const result = await datingApi
                            .startDate("test-id")
                            .catch(() => null);
                          void result;
                          toast.success(
                            "Triggered dating lifecycle transition run."
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Job run failed."
                          );
                        } finally {
                          setRunningJob(false);
                        }
                      }}
                      type="button"
                    >
                      <Clock
                        className={`size-4 ${runningJob ? "animate-spin" : ""}`}
                      />
                      Run Lifecycle Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* BAN USER MODAL */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setBanUserDialog(null);
            setBanReason("");
          }
        }}
        open={Boolean(banUserDialog)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {banUserDialog?.email}? They will be
              logged out and unable to access Chewbuu.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs font-medium text-muted-foreground">
              Ban Reason (optional)
            </label>
            <Input
              className="mt-1"
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Violation of community standards"
              value={banReason}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => {
                setBanUserDialog(null);
                setBanReason("");
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleBanUser} type="button" variant="destructive">
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE USER MODAL */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUserDialog(null);
          }
        }}
        open={Boolean(deleteUserDialog)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              {deleteUserDialog?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setDeleteUserDialog(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveUser}
              type="button"
              variant="destructive"
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});
