import { env } from "@chewbuu/env/server";
import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
};

export const Route = createFileRoute("/api/resend/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!env.RESEND_WEBHOOK_SECRET) {
          return new Response("Resend webhook secret is not configured", {
            status: 503,
          });
        }

        const resend = getResendClient();
        if (!resend) {
          return new Response("Resend API key is not configured", {
            status: 503,
          });
        }

        const payload = await request.text();
        const id = request.headers.get("svix-id");
        const signature = request.headers.get("svix-signature");
        const timestamp = request.headers.get("svix-timestamp");

        if (!(id && signature && timestamp)) {
          return new Response("Missing webhook signature headers", {
            status: 400,
          });
        }

        try {
          const event = resend.webhooks.verify({
            headers: {
              id,
              signature,
              timestamp,
            },
            payload,
            webhookSecret: env.RESEND_WEBHOOK_SECRET,
          });

          return Response.json({ received: true, type: event.type });
        } catch {
          return new Response("Invalid webhook signature", { status: 400 });
        }
      },
    },
  },
});
