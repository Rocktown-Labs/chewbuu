import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import { usernameApi } from "@/lib/dating-api";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/username/verify")({
  component: UsernameVerificationPage,
  validateSearch: searchSchema,
});

function UsernameVerificationPage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"error" | "loading" | "success">(
    "loading"
  );
  const [message, setMessage] = useState("Verifying your username request…");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("This username verification link is missing its token.");
      return;
    }
    const verify = async () => {
      try {
        await usernameApi.verify(token);
        setState("success");
        setMessage(
          "Email verified. Your username change is now queued for approval."
        );
      } catch (error) {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not verify this username request."
        );
      }
    };
    void verify();
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-12">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm">
        <p className="font-semibold text-primary text-xs uppercase tracking-[0.18em]">
          Username change
        </p>
        <h1 className="mt-3 font-semibold text-2xl">{message}</h1>
        {state !== "loading" ? (
          <Link
            className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-sm"
            to="/me/profile"
          >
            Return to profile
          </Link>
        ) : null}
      </section>
    </main>
  );
}
