import { Link } from "@tanstack/react-router";
import { Bell, HeartHandshake, Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";

import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();

  const publicLinks = [
    { label: "How it works", hash: "how-it-works" },
    { label: "Pricing", hash: "pricing" },
    { label: "FAQ", hash: "faq" },
  ] as const;

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const handleLogoClick = () => {
    if (session && typeof window !== "undefined" && window.innerWidth < 1024) {
      window.dispatchEvent(new CustomEvent("chewbuu:toggle-mobile-menu"));
    }
  };

  return (
    <header className="border-border/70 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center">
          <Link
            className="flex items-center gap-2 font-semibold text-foreground"
            to={session ? "/me" : "/"}
            onClick={handleLogoClick}
          >
            <img
              src="/brand/chewbuu-logo-500.png"
              alt="Chewbuu Logo"
              className="h-9 w-9 rounded-full border border-border"
            />
            Chewbuu
          </Link>
        </div>
        {!session && (
          <nav className="hidden items-center justify-center gap-5 text-muted-foreground text-sm lg:flex">
            {publicLinks.map(({ hash, label }) => (
              <a
                className="transition-colors hover:text-foreground"
                href={`/#${hash}`}
                key={hash}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
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
          {!session && (
            <Link
              className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-sm transition hover:bg-primary/90 md:flex"
              to="/auth/sign-up"
            >
              <HeartHandshake aria-hidden="true" className="size-4" />
              Create Profile
            </Link>
          )}
          <UserMenu />
          {session && (
            <Link
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
              search={{ tab: "notifications" }}
              to="/me"
            >
              <Bell aria-hidden="true" className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
