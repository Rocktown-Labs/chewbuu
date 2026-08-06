import { authMutationKeys } from "@better-auth-ui/core";
import {
  useAuth,
  useFetchOptions,
  useSignInEmail,
  useSignInUsername,
} from "@better-auth-ui/react";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Checkbox } from "@chewbuu/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSeparator,
} from "@chewbuu/ui/components/field";
import { Input } from "@chewbuu/ui/components/input";
import { Label } from "@chewbuu/ui/components/label";
import { Spinner } from "@chewbuu/ui/components/spinner";
import { cn } from "@chewbuu/ui/lib/utils";
import { useIsMutating } from "@tanstack/react-query";
import { useState } from "react";
import type { SyntheticEvent } from "react";

import { authClient } from "@/lib/auth-client";

import { ProviderButtons } from "./provider-buttons";
import type { SocialLayout } from "./provider-buttons";

export interface SignInProps {
  className?: string;
  socialLayout?: SocialLayout;
  socialPosition?: "top" | "bottom";
}

/**
 * Render the sign-in form UI with email/password, magic link, and social provider options.
 *
 * @param className - Optional additional container class names
 * @param socialLayout - Layout style for social provider buttons
 * @param socialPosition - Position of social provider buttons; `"top"` or `"bottom"`. Defaults to `"bottom"`.
 * @returns The rendered sign-in UI as a JSX element
 */
export function SignIn({
  className,
  socialLayout,
  socialPosition = "bottom",
}: SignInProps) {
  const {
    basePaths,
    emailAndPassword,
    localization,
    plugins,
    redirectTo,
    socialProviders,
    viewPaths,
    navigate,
    Link,
  } = useAuth();

  const { fetchOptions, resetFetchOptions } = useFetchOptions();

  const [password, setPassword] = useState("");

  const usernamePluginEnabled = plugins.some(
    (plugin) => plugin.id === "username"
  );

  const navigateAfterSignIn = async () => {
    const session = await authClient.getSession();
    navigate({
      to: session.data?.user.hasCompletedOnboarding
        ? redirectTo
        : "/onboarding",
    });
  };

  const { mutate: signInEmail, isPending: signInEmailPending } = useSignInEmail(
    authClient,
    {
      onError: (error, { email }) => {
        setPassword("");

        if (error.error?.code === "EMAIL_NOT_VERIFIED") {
          sessionStorage.setItem("better-auth-ui.verify-email", email);
          navigate({
            to: `${basePaths.auth}/${viewPaths.auth.verifyEmail}`,
          });
        }

        resetFetchOptions();
      },
      onSuccess: () => {
        void navigateAfterSignIn();
      },
    }
  );

  const { mutate: signInUsername, isPending: signInUsernamePending } =
    useSignInUsername(authClient, {
      onError: () => {
        setPassword("");
        resetFetchOptions();
      },
      onSuccess: () => {
        void navigateAfterSignIn();
      },
    });

  const signInMutating = useIsMutating({
    mutationKey: authMutationKeys.signIn.all,
  });
  const signUpMutating = useIsMutating({
    mutationKey: authMutationKeys.signUp.all,
  });
  const isPending = signInMutating + signUpMutating > 0;

  const Captcha = plugins.find(
    (plugin) => plugin.captchaComponent
  )?.captchaComponent;

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get("email") as string;
    const rememberMe = formData.get("rememberMe") === "on";

    if (usernamePluginEnabled && !identifier.includes("@")) {
      signInUsername({
        password,
        username: identifier,
        ...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
        fetchOptions,
      });
      return;
    }

    signInEmail({
      email: identifier,
      password,
      ...(emailAndPassword?.rememberMe ? { rememberMe } : {}),
      fetchOptions,
    });
  };

  const showSeparator =
    emailAndPassword?.enabled && socialProviders && socialProviders.length > 0;

  return (
    <Card
      className={cn(
        "w-full max-w-sm rounded-3xl border shadow-xl bg-card p-2",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {localization.auth.signIn}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6">
          {socialPosition === "top" && (
            <>
              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} />
              )}

              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card m-0 text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}
            </>
          )}

          {emailAndPassword?.enabled && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={!!fieldErrors.email}>
                  <Label htmlFor="email" className="font-semibold text-xs ml-1">
                    {usernamePluginEnabled
                      ? "Email or username"
                      : localization.auth.email}
                  </Label>

                  <Input
                    id="email"
                    name="email"
                    type={usernamePluginEnabled ? "text" : "email"}
                    autoComplete="username"
                    placeholder={
                      usernamePluginEnabled
                        ? "you@example.com or @username"
                        : localization.auth.emailPlaceholder
                    }
                    required
                    disabled={isPending}
                    className="rounded-full h-10 px-4 text-sm bg-background border border-border"
                    onChange={() => {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }}
                    onInvalid={(e) => {
                      e.preventDefault();
                      const el = e.target as HTMLInputElement;
                      const msg = el.validity.valueMissing
                        ? localization.auth.fieldRequired
                        : localization.auth.invalidEmail;

                      setFieldErrors((prev) => ({
                        ...prev,
                        email: msg,
                      }));
                    }}
                    aria-invalid={!!fieldErrors.email}
                  />

                  <FieldError>{fieldErrors.email}</FieldError>
                </Field>

                <Field data-invalid={!!fieldErrors.password}>
                  <Label
                    htmlFor="password"
                    className="font-semibold text-xs ml-1"
                  >
                    {localization.auth.password}
                  </Label>

                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    className="rounded-full h-10 px-4 text-sm bg-background border border-border"
                    onChange={(e) => {
                      setPassword(e.target.value);

                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }}
                    placeholder={localization.auth.passwordPlaceholder}
                    required
                    minLength={emailAndPassword?.minPasswordLength}
                    maxLength={emailAndPassword?.maxPasswordLength}
                    disabled={isPending}
                    onInvalid={(e) => {
                      e.preventDefault();
                      const el = e.target as HTMLInputElement;
                      const min = emailAndPassword?.minPasswordLength;
                      const max = emailAndPassword?.maxPasswordLength;
                      const msg = el.validity.valueMissing
                        ? localization.auth.fieldRequired
                        : el.validity.tooShort
                          ? localization.auth.tooShort.replace(
                              "{{min}}",
                              String(min)
                            )
                          : localization.auth.tooLong.replace(
                              "{{max}}",
                              String(max)
                            );

                      setFieldErrors((prev) => ({
                        ...prev,
                        password: msg,
                      }));
                    }}
                    aria-invalid={!!fieldErrors.password}
                  />

                  <FieldError>{fieldErrors.password}</FieldError>
                </Field>

                {emailAndPassword.rememberMe && (
                  <Field className="my-1">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="rememberMe"
                        name="rememberMe"
                        disabled={isPending}
                      />

                      <Label
                        htmlFor="rememberMe"
                        className="cursor-pointer text-sm font-normal"
                      >
                        {localization.auth.rememberMe}
                      </Label>
                    </div>
                  </Field>
                )}

                {Captcha && (
                  <div className="flex justify-center">{Captcha}</div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="rounded-full h-10 font-bold bg-primary text-primary-foreground"
                  >
                    {(signInEmailPending || signInUsernamePending) && (
                      <Spinner />
                    )}

                    {localization.auth.signIn}
                  </Button>

                  {plugins.flatMap((plugin) =>
                    (plugin.authButtons ?? []).map((AuthButton, index) => (
                      <AuthButton
                        key={`${plugin.id}-${index.toString()}`}
                        view="signIn"
                      />
                    ))
                  )}
                </div>
              </FieldGroup>
            </form>
          )}

          {socialPosition === "bottom" && (
            <>
              {showSeparator && (
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-xs flex items-center">
                  {localization.auth.or}
                </FieldSeparator>
              )}

              {socialProviders && socialProviders.length > 0 && (
                <ProviderButtons socialLayout={socialLayout} />
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 items-center w-full mt-4">
          {emailAndPassword?.enabled && emailAndPassword?.forgotPassword && (
            <Link
              href={`${basePaths.auth}/${viewPaths.auth.forgotPassword}`}
              className="self-center text-sm underline-offset-4 hover:underline"
            >
              {localization.auth.forgotPasswordLink}
            </Link>
          )}

          {emailAndPassword?.enabled && (
            <FieldDescription className="text-center">
              {localization.auth.needToCreateAnAccount}{" "}
              <Link
                href={`${basePaths.auth}/${viewPaths.auth.signUp}`}
                className="underline underline-offset-4"
              >
                {localization.auth.signUp}
              </Link>
            </FieldDescription>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
