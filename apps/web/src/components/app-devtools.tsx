import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { useOnboardingStore } from "@/features/onboarding/onboarding-store";
import { authClient } from "@/lib/auth-client";

function ChewbuuStateDevtoolsPanel() {
  const { data: session } = authClient.useSession();
  const onboardingStore = useOnboardingStore();

  return (
    <div className="h-full overflow-auto bg-background p-4 font-mono text-foreground text-xs space-y-4">
      <div className="border-border border-b pb-2">
        <h3 className="font-bold text-primary text-sm">
          ⚡ Chewbuu Product State Inspector
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Real-time debugging panel for Authentication Session & Onboarding
          Store
        </p>
      </div>

      <div className="space-y-2">
        <div className="font-semibold text-amber-500">
          🔐 Authentication Session
        </div>
        <pre className="overflow-x-auto rounded border border-border bg-muted/50 p-2 text-[11px]">
          {JSON.stringify(session ?? { status: "unauthenticated" }, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <div className="font-semibold text-emerald-500">
          📋 Onboarding Wizard Store
        </div>
        <pre className="overflow-x-auto rounded border border-border bg-muted/50 p-2 text-[11px]">
          {JSON.stringify(
            {
              step: onboardingStore.step,
              profile: onboardingStore.profile,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

export default function AppDevtools() {
  return (
    <TanStackDevtools
      config={{
        defaultOpen: false,
        position: "bottom-right",
      }}
      plugins={[
        {
          defaultOpen: true,
          name: "TanStack Router",
          render: <TanStackRouterDevtoolsPanel />,
        },
        {
          name: "TanStack Query",
          render: <ReactQueryDevtoolsPanel />,
        },
        {
          name: "TanStack Form",
          render: <FormDevtoolsPanel />,
        },
        {
          name: "Chewbuu Product State",
          render: <ChewbuuStateDevtoolsPanel />,
        },
      ]}
    />
  );
}
