import { Toaster } from "@chewbuu/ui/components/sonner";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { useEffect } from "react";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { authClient } from "@/lib/auth-client";
import { useThemeStore } from "@/lib/theme";

import Header from "../components/header";

import appCss from "../index.css?url";

interface RouterAppContext {
  auth?: never;
}

type AuthLinkProps = PropsWithChildren<
  { className?: string; href: string; to?: string } & Pick<
    ComponentPropsWithoutRef<"a">,
    "aria-disabled" | "onClick" | "tabIndex"
  >
>;

const AuthLink = ({ children, href, to, ...props }: AuthLinkProps) => (
  <Link {...props} to={to ?? href}>
    {children}
  </Link>
);

const RootDocument = () => {
  const navigate = useNavigate();
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider
          authClient={authClient}
          basePaths={{
            auth: "/auth",
            organization: "/organization",
            settings: "/settings",
          }}
          Link={AuthLink}
          navigate={({ to, replace }) => navigate({ replace, to })}
          redirectTo="/dashboard"
        >
          <div className="grid min-h-svh grid-rows-[auto_1fr]">
            <Header />
            <Outlet />
          </div>
        </AuthProvider>
        <Toaster richColors />
        <TanStackRouterDevtools position="bottom-left" />
        <Scripts />
      </body>
    </html>
  );
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        href: "/brand/chewbuu-logo-500.png",
        rel: "icon",
        type: "image/png",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Chewbuu | Real People, Real Dates, Real Results",
      },
      {
        content:
          "Chewbuu gets real people onto real dates with curated plans, video-first matching, and warm social circles.",
        name: "description",
      },
      {
        content:
          "dating, social, group dates, real people, real results, video dating",
        name: "keywords",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: "Chewbuu | Real People, Real Dates, Real Results",
        property: "og:title",
      },
      {
        content:
          "Chewbuu gets real people onto real dates with curated plans, video-first matching, and warm social circles.",
        property: "og:description",
      },
      {
        content: "/brand/chewbuu-logo-500.png",
        property: "og:image",
      },
      {
        content: "summary_large_image",
        name: "twitter:card",
      },
      {
        content: "Chewbuu | Real People, Real Dates, Real Results",
        name: "twitter:title",
      },
      {
        content:
          "Chewbuu gets real people onto real dates with curated plans, video-first matching, and warm social circles.",
        name: "twitter:description",
      },
      {
        content: "/brand/chewbuu-logo-500.png",
        name: "twitter:image",
      },
    ],
  }),
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
});
