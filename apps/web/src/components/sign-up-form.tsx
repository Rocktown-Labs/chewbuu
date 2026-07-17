import { Button } from "@chewbuu/ui/components/button";
import { Checkbox } from "@chewbuu/ui/components/checkbox";
import { Input } from "@chewbuu/ui/components/input";
import { Label } from "@chewbuu/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      name: "",
      password: "",
      policiesAccepted: false,
    },
    onSubmit: async ({ value }) => {
      if (!value.policiesAccepted) {
        toast.error("Accept the Privacy Policy and Terms of Service first.");
        return;
      }

      await authClient.signUp.email(
        {
          email: value.email,
          name: value.name,
          password: value.password,
        },
        {
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign up successful");
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        name: z.string().min(2, "Name must be at least 2 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        policiesAccepted: z.literal(true, {
          error: "Accept the Privacy Policy and Terms of Service.",
        }),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-6 text-center text-3xl font-bold">Create Account</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Password</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="policiesAccepted">
          {(field) => (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <Checkbox
                aria-label="Accept Privacy Policy and Terms of Service"
                checked={field.state.value}
                id={field.name}
                onCheckedChange={(checked) =>
                  field.handleChange(checked === true)
                }
              />
              <div className="space-y-1">
                <Label className="text-sm" htmlFor={field.name}>
                  I understand and accept Chewbuu's{" "}
                  <Link className="font-semibold underline" to="/privacy">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link className="font-semibold underline" to="/terms">
                    Terms of Service
                  </Link>
                  .
                </Label>
                <p className="text-muted-foreground text-xs/relaxed">
                  This includes video-first verification, active-date safety
                  tools, location use during date flows, subscriptions, and
                  partner venue workflows.
                </p>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            </div>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            policiesAccepted: state.values.policiesAccepted,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting, policiesAccepted }) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || !policiesAccepted || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Sign Up"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 text-center">
        <Button
          variant="link"
          onClick={onSwitchToSignIn}
          className="text-indigo-600 hover:text-indigo-800"
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}
