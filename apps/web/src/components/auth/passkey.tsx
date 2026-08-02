import type { AuthButtonProps } from "@better-auth-ui/react";
import {
  useAddPasskey,
  useAuth,
  useDeletePasskey,
  useListPasskeys,
  useSignInPasskey,
} from "@better-auth-ui/react";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Spinner } from "@chewbuu/ui/components/spinner";
import { cn } from "@chewbuu/ui/lib/utils";
import { Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

const supportsPasskeys = () =>
  typeof window !== "undefined" && !!window.PublicKeyCredential;

/**
 * Plugin-contributed auth button that signs the user in with an existing
 * device passkey (WebAuthn). Rendered below the submit button on auth views.
 */
export function PasskeySignInButton({ className, view }: AuthButtonProps) {
  const { navigate, redirectTo } = useAuth();
  const { isPending, mutate: signInPasskey } = useSignInPasskey(authClient, {
    onError: (error) => {
      if (error?.error?.code === "WEBAUTHN_CANCELLED") {
        return;
      }
      toast.error(error?.error?.message ?? "Passkey sign-in failed.");
    },
    onSuccess: () => navigate({ to: redirectTo }),
  });

  if (view === "signUp" || !supportsPasskeys()) {
    return null;
  }

  return (
    <Button
      className={cn(
        "rounded-full h-10 gap-2 font-bold border-border",
        className
      )}
      disabled={isPending}
      onClick={() => signInPasskey()}
      type="button"
      variant="outline"
    >
      {isPending ? <Spinner /> : <KeyRound className="size-4" />}
      Sign in with a passkey
    </Button>
  );
}

/**
 * Security settings card listing the member's registered passkeys with
 * add/remove controls — mirrors better-auth-ui's passkey settings card.
 */
export function PasskeysCard({ className }: { className?: string }) {
  const { data: passkeys, isPending: listPending } =
    useListPasskeys(authClient);
  const { isPending: addPending, mutate: addPasskey } = useAddPasskey(
    authClient,
    {
      onError: (error) => {
        if (error?.error?.code === "WEBAUTHN_CANCELLED") {
          return;
        }
        toast.error(error?.error?.message ?? "Could not add the passkey.");
      },
      onSuccess: () => toast.success("Passkey added to your account."),
    }
  );
  const { mutate: deletePasskey } = useDeletePasskey(authClient, {
    onError: (error) =>
      toast.error(error?.error?.message ?? "Could not remove the passkey."),
    onSuccess: () => toast.success("Passkey removed."),
  });

  if (!supportsPasskeys()) {
    return null;
  }

  const passkeyList = Array.isArray(passkeys) ? passkeys : [];

  return (
    <Card className={cn("rounded-2xl border-border bg-card/45", className)}>
      <CardHeader>
        <CardTitle className="text-base">Passkeys</CardTitle>
        <CardDescription>
          Sign in without a password using this device's biometrics or security
          key.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {listPending ? (
          <div className="flex justify-center py-2">
            <Spinner />
          </div>
        ) : passkeyList.length > 0 ? (
          passkeyList.map((passkey) => (
            <div
              className="flex items-center justify-between rounded-2xl border border-border bg-background/40 px-3 py-2"
              key={passkey.id}
            >
              <div className="flex items-center gap-2">
                <Fingerprint className="size-4 text-primary" />
                <span className="font-medium text-sm">
                  {passkey.name ?? "Passkey"}
                </span>
                {passkey.createdAt && (
                  <Badge className="rounded-full text-[10px]" variant="outline">
                    {new Date(passkey.createdAt).toLocaleDateString()}
                  </Badge>
                )}
              </div>
              <Button
                aria-label="Remove passkey"
                className="rounded-full"
                onClick={() => deletePasskey({ id: passkey.id })}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-xs">
            No passkeys registered yet.
          </p>
        )}

        <Button
          className="w-fit rounded-full font-semibold"
          disabled={addPending}
          onClick={() => addPasskey()}
          size="sm"
          type="button"
          variant="outline"
        >
          {addPending ? <Spinner /> : <KeyRound className="size-4" />}
          Add a passkey
        </Button>
      </CardContent>
    </Card>
  );
}
