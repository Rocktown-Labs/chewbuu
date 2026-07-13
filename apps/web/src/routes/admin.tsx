import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Input } from "@chewbuu/ui/components/input";
import { Textarea } from "@chewbuu/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Crown,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { pricingApi, type MembershipPlan } from "@/lib/dating-api";

const ADMIN_SECTIONS = [
  {
    icon: ShieldCheck,
    label: "Better Auth Admin",
    text: "Role, ban, impersonation, and user-management APIs are enabled for admin users.",
  },
  {
    icon: Crown,
    label: "Membership",
    text: "Social is free with two dates per day; Mingle and Sugar are editable here and ready for Stripe IDs.",
  },
  {
    icon: UsersRound,
    label: "Circles",
    text: "The admin surface is ready to grow into moderation, party, circle, and event tooling.",
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
  const role = session?.user.role;
  const membershipTier = session?.user.membershipTier ?? "social";
  const isAdmin =
    role === "admin" || session?.user.email === "cg@rocktownlabs.com";
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

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

    void loadPlans();
  }, [isAdmin]);

  if (isPending) {
    return (
      <main className="mx-auto grid min-h-full w-full max-w-5xl place-items-center px-4 py-10">
        <p className="text-muted-foreground">Loading admin...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto grid min-h-full w-full max-w-5xl place-items-center px-4 py-10">
        <Card className="w-full max-w-md">
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
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
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
          {membershipTier.toUpperCase()} member
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN_SECTIONS.map(({ icon: Icon, label, text }) => (
          <Card key={label}>
            <CardHeader>
              <Icon aria-hidden="true" className="mb-2 text-primary" />
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-8 rounded-lg border bg-card p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="mb-3 rounded-full" variant="secondary">
              Pricing
            </Badge>
            <h2 className="font-semibold text-2xl">Membership plans</h2>
            <p className="text-muted-foreground">
              Seed defaults, edit the visible plan cards, add Stripe price IDs,
              then sync when Stripe is configured.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-full"
              onClick={async () => {
                const { plans: nextPlans } = await pricingApi.seedPlans();
                setPlans(nextPlans);
                toast.success("Seeded Chewbuu membership plans.");
              }}
              type="button"
              variant="outline"
            >
              Seed
            </Button>
            <Button
              className="rounded-full"
              onClick={async () => {
                const result = await pricingApi.syncPlans();
                setPlans(result.plans);
                toast.success(result.message);
              }}
              type="button"
              variant="outline"
            >
              <RefreshCw data-icon="inline-start" />
              Sync
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
                  toast.success("Pricing saved.");
                } finally {
                  setSaving(false);
                }
              }}
              type="button"
            >
              Save pricing
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              className="rounded-lg border bg-background p-4"
              key={plan.tier}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm">{plan.tier}</p>
                </div>
                <Badge className="rounded-full" variant="secondary">
                  {plan.monthlyPriceCents === 0
                    ? "Free"
                    : `$${Math.round(plan.monthlyPriceCents / 100)}/mo`}
                </Badge>
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  aria-label={`${plan.name} name`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, { name: event.target.value })
                    )
                  }
                  value={plan.name}
                />
                <Textarea
                  aria-label={`${plan.name} description`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, {
                        description: event.target.value,
                      })
                    )
                  }
                  value={plan.description}
                />
                <Input
                  aria-label={`${plan.name} monthly cents`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, {
                        monthlyPriceCents: Number(event.target.value),
                      })
                    )
                  }
                  type="number"
                  value={plan.monthlyPriceCents}
                />
                <Input
                  aria-label={`${plan.name} annual cents`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, {
                        annualPriceCents: Number(event.target.value),
                      })
                    )
                  }
                  type="number"
                  value={plan.annualPriceCents}
                />
                <Input
                  aria-label={`${plan.name} Stripe price ID`}
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
                <Input
                  aria-label={`${plan.name} CTA`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, { cta: event.target.value })
                    )
                  }
                  value={plan.cta}
                />
                <Textarea
                  aria-label={`${plan.name} stats`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, {
                        stats: textToList(event.target.value),
                      })
                    )
                  }
                  value={listToText(plan.stats)}
                />
                <Textarea
                  aria-label={`${plan.name} features`}
                  onChange={(event) =>
                    setPlans(
                      updatePlan(plans, plan.tier, {
                        features: textToList(event.target.value),
                      })
                    )
                  }
                  value={listToText(plan.features)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});
