import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, PackageSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order-success")({
  head: () => ({ meta: [{ title: "Order Confirmed - OsanPrints" }] }),
  component: OrderSuccessPage,
});

function OrderSuccessPage() {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSessionId(new URLSearchParams(window.location.search).get("session_id"));
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    apiFetch(`/api/orders/session/${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setOrder(data.order);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-3xl font-semibold">Order confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Payment was accepted and your print order is now in the studio queue.
          </p>

          <div className="mt-8 rounded-md bg-nude p-5 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <PackageSearch className="h-4 w-4" />
              Tracking details
            </div>
            <p className="mt-3 text-sm">
              Tracking number:{" "}
              <span className="font-semibold text-primary">
                {loading ? "Loading..." : (order?.trackingNumber ?? "Available after order sync")}
              </span>
            </p>
            {order?.status && (
              <p className="mt-1 text-sm text-muted-foreground">Status: {order.status}</p>
            )}
          </div>

          <Button asChild className="mt-8">
            <Link to="/categories">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
