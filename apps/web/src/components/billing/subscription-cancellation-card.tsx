import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  subscriptionBillingApi,
  type SubscriptionCustomerType,
} from "@/lib/subscription-billing-api";

export function SubscriptionCancellationCard({
  cancelAtPeriodEnd = false,
  customerType,
  description = "Your access continues through the end of the current paid billing period.",
  planName,
  referenceId,
  returnPath,
}: {
  cancelAtPeriodEnd?: boolean;
  customerType: SubscriptionCustomerType;
  description?: string;
  planName: string;
  referenceId?: string;
  returnPath: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const cancelled = cancelAtPeriodEnd;

  const cancelRenewal = async () => {
    setIsPending(true);
    try {
      const portal = await subscriptionBillingApi.cancel({
        customerType,
        ...(referenceId ? { referenceId } : {}),
        returnPath,
      });
      if (!portal?.url) {
        throw new Error("Stripe did not return a cancellation link.");
      }
      setIsConfirming(false);
      toast.info("Opening Stripe's secure cancellation page.");
      window.location.assign(portal.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not cancel the subscription."
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-2xl border-border bg-card/45">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" />
          {planName} billing
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {cancelled ? (
          <p className="text-sm text-muted-foreground">
            Renewal canceled. Your access remains active until the current
            billing period ends.
          </p>
        ) : isConfirming ? (
          <>
            <p className="w-full text-sm text-muted-foreground">
              Confirm that you want to stop automatic renewal.
            </p>
            <Button
              disabled={isPending}
              onClick={() => void cancelRenewal()}
              type="button"
              variant="destructive"
            >
              {isPending ? "Opening Stripe…" : "Continue to Stripe"}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => setIsConfirming(false)}
              type="button"
              variant="outline"
            >
              Keep subscription
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setIsConfirming(true)}
            type="button"
            variant="outline"
          >
            Cancel renewal
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
