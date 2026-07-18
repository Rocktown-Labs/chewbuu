import { Link } from "@tanstack/react-router";
import {
  CalendarHeart,
  HeartHandshake,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { useThemeStore } from "@/lib/theme";

import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useThemeStore();

  const primaryHref = session ? "/me" : "/auth/sign-up";
  const primaryLabel = session ? "Feed" : "Create Profile";
  const PrimaryIcon = session ? UserRound : HeartHandshake;
  const publicLinks = [
    { label: "How it works", hash: "how-it-works" },
    { label: "Pricing", hash: "pricing" },
    { label: "FAQ", hash: "faq" },
  ] as const;
  const appLinks = [
    { label: "Feed", to: "/me" },
    { label: "Plan a Date", to: "/date/new" },
  ] as const;

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <header className="border-border/70 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center">
          <Link
            className="flex items-center gap-2 font-semibold text-foreground"
            to="/"
          >
            <img
              src="/brand/chewbuu-logo-500.png"
              alt="Chewbuu Logo"
              className="h-9 w-9 rounded-full border border-border"
            />
            Chewbuu
          </Link>
        </div>
        <nav className="hidden items-center justify-center gap-5 text-muted-foreground text-sm sm:flex">
          {session
            ? appLinks.map(({ to, label }) => (
                <Link
                  activeProps={{ className: "text-foreground" }}
                  className="transition-colors hover:text-foreground"
                  key={to}
                  to={to}
                >
                  {label}
                </Link>
              ))
            : publicLinks.map(({ hash, label }) => (
                <a
                  className="transition-colors hover:text-foreground"
                  href={`/#${hash}`}
                  key={hash}
                >
                  {label}
                </a>
              ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={cycleTheme}
            type="button"
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer border-0 bg-transparent flex items-center justify-center"
            title={`Theme: ${theme}. Click to change.`}
            aria-label={`Theme: ${theme}. Click to change.`}
          >
            <ThemeIcon className="size-4" />
          </button>
          {!session && (
            <Link
              className="hidden rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground text-sm transition hover:bg-muted md:inline-flex"
              to="/auth/sign-in"
            >
              Sign In
            </Link>
          )}
          <Link
            className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-sm transition hover:bg-primary/90 md:flex"
            to={primaryHref}
          >
            <PrimaryIcon aria-hidden="true" className="size-4" />
            {primaryLabel}
          </Link>
          {session && (
            <Link
              aria-label="Plan a date"
              className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-medium text-foreground text-sm transition hover:bg-muted lg:flex"
              to="/date/new"
            >
              <CalendarHeart aria-hidden="true" className="size-4" />
              Plan
            </Link>
          )}
          {session && (
            <Link
              aria-label="My profile"
              className="hidden size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted md:flex"
              to="/me"
            >
              <UserRound aria-hidden="true" className="size-4" />
            </Link>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
