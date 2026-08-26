import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { venueApi, type VenueOrder } from "@/lib/dating-api";

export const Route = createFileRoute("/venues/$venueId/orders/$orderId")({
  component: OrderDetailPage,
  ssr: false,
});

const statuses = [
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
];

function OrderDetailPage() {
  const { orderId, venueId } = Route.useParams();
  const [order, setOrder] = useState<VenueOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const workspace = await venueApi.getWorkspace(venueId);
      setOrder(workspace.orders.find((item) => item.id === orderId) ?? null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load order."
      );
    } finally {
      setIsLoading(false);
    }
  }, [orderId, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (status: string) => {
    try {
      const result = await venueApi.updateOrder({ orderId, status });
      setOrder(result.order);
      toast.success(`Order marked ${status}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update order."
      );
    }
  };

  if (isLoading) {
    return (
      <LoaderCircle className="mx-auto mt-20 size-6 animate-spin text-primary" />
    );
  }

  if (!order) {
    return (
      <p className="p-8 text-center text-muted-foreground">Order not found.</p>
    );
  }

  return (
    <main className="min-h-screen bg-muted/20 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          params={{ venueId }}
          to="/venues/$venueId"
        >
          <ArrowLeft className="size-4" /> Back to workspace
        </Link>
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge variant="secondary">
                  <ReceiptText className="mr-1 size-3" /> Order
                </Badge>
                <CardTitle className="mt-3">#{order.id.slice(0, 8)}</CardTitle>
                <CardDescription>
                  Unpaid test order · {order.paymentStatus}
                </CardDescription>
              </div>
              <Badge>{order.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="font-medium">
                  ${(order.subtotalCents / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tip</p>
                <p className="font-medium">
                  ${(order.tipCents / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-semibold">
                  ${(order.totalCents / 100).toFixed(2)}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">
                Move order through service
              </p>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    onClick={() => void update(status)}
                    variant={order.status === status ? "default" : "outline"}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
