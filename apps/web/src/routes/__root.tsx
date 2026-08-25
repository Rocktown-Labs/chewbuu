import { Toaster } from "@chewbuu/ui/components/sonner";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useNavigate,
} from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import { Suspense, lazy } from "react";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

import { authPlugins } from "@/components/auth/auth-plugins";
import { AuthProvider } from "@/components/auth/auth-provider";
import { NotFoundPage } from "@/components/not-found-page";
import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import {
  OG_IMAGE_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  getCanonicalUrl,
} from "@/lib/seo";

import Header from "../components/header";

import appCss from "../index.css?url";

const AppDevtools = import.meta.env.DEV
  ? lazy(() => import("@/components/app-devtools"))
  : () => null;

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

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <AuthProvider
            authClient={authClient}
            basePaths={{
              auth: "/auth",
              organization: "/organization",
              settings: "/settings",
            }}
            Link={AuthLink}
            navigate={({ to, replace }) => navigate({ replace, to })}
            plugins={authPlugins}
            redirectTo="/me"
            socialProviders={["google"]}
          >
            <div className="grid min-h-svh grid-rows-[auto_1fr]">
              <Header />
              <Outlet />
            </div>
          </AuthProvider>
          <Toaster richColors />
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <AppDevtools />
            </Suspense>
          )}
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,
  notFoundComponent: NotFoundPage,
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
      {
        href: "/manifest.json",
        rel: "manifest",
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
        content: "#7c3aed",
        name: "theme-color",
      },
      {
        title: SITE_TITLE,
      },
      {
        content: SITE_DESCRIPTION,
        name: "description",
      },
      {
        content:
          "dating, social, group dates, real people, real results, video dating",
        name: "keywords",
      },
      {
        content: SITE_NAME,
        property: "og:site_name",
      },
      {
        content: getCanonicalUrl(),
        property: "og:url",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: SITE_TITLE,
        property: "og:title",
      },
      {
        content: SITE_DESCRIPTION,
        property: "og:description",
      },
      {
        content: OG_IMAGE_URL,
        property: "og:image",
      },
      {
        content: "1864",
        property: "og:image:width",
      },
      {
        content: "913",
        property: "og:image:height",
      },
      {
        content: "summary_large_image",
        name: "twitter:card",
      },
      {
        content: SITE_TITLE,
        name: "twitter:title",
      },
      {
        content: SITE_DESCRIPTION,
        name: "twitter:description",
      },
      {
        content: OG_IMAGE_URL,
        name: "twitter:image",
      },
    ],
  }),
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
});
