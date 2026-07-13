import { Link } from "@tanstack/react-router";
import { HeartHandshake, LayoutDashboard } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const primaryHref = session ? "/dashboard" : "/auth/sign-up";
  const primaryLabel = session ? "Dashboard" : "Join";
  const PrimaryIcon = session ? LayoutDashboard : HeartHandshake;
  const links = [
    { label: "Chewbuu", to: "/" },
    { label: "Dashboard", to: "/dashboard" },
    { label: "Admin", to: "/admin" },
  ] as const;

  return (
    <header className="border-border/70 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl flex-row items-center justify-between px-4">
        <nav className="flex items-center gap-5 text-sm">
          <Link
            className="flex items-center gap-2 font-semibold text-foreground"
            to="/"
          >
            <img
              src="/brand/chewbuu-logo-500-trans.png"
              alt=""
              className="h-9 w-9"
            />
            Chewbuu
          </Link>
          <div className="hidden items-center gap-4 text-muted-foreground sm:flex">
            {links.slice(1).map(({ to, label }) => (
              <Link
                activeProps={{ className: "text-foreground" }}
                className="transition-colors hover:text-foreground"
                key={to}
                to={to}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-sm transition hover:bg-primary/90 md:flex"
            to={primaryHref}
          >
            <PrimaryIcon aria-hidden="true" className="size-4" />
            {primaryLabel}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
