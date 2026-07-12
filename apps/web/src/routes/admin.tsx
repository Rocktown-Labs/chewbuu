import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Crown, ShieldCheck, UsersRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";

const ADMIN_SECTIONS = [
  {
    icon: ShieldCheck,
    label: "Better Auth Admin",
    text: "Role, ban, impersonation, and user-management APIs are enabled for admin users.",
  },
  {
    icon: Crown,
    label: "Membership",
    text: "Social is free with two dates per day; Mingle and Sugar are ready for Stripe subscription upgrades.",
  },
  {
    icon: UsersRound,
    label: "Circles",
    text: "The admin surface is ready to grow into custom moderation, party, and circle tooling.",
  },
] as const;

const RouteComponent = () => {
  const { data: session, isPending } = authClient.useSession();
  const role = session?.user.role;
  const membershipTier = session?.user.membershipTier ?? "social";
  const isAdmin = role === "admin";

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
          <BadgeCheck aria-hidden="true" className="size-4 text-primary" />
          {membershipTier.toUpperCase()} member
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN_SECTIONS.map(({ icon: Icon, label, text }) => (
          <Card key={label}>
            <CardHeader>
              <Icon aria-hidden="true" className="mb-2 size-5 text-primary" />
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});
