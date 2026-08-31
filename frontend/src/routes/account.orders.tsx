import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Package2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

type OrderItem = {
  productId?: string | null;
  name?: string;
  price?: number;
  quantity?: number;
  customization?: any;
  size?: string;
  color?: string;
  image?: string | null;
};

type CustomerOrder = {
  id: string;
  trackingNumber?: string | null;
  status?: string;
  total?: number;
  createdAt?: string | null;
  items?: OrderItem[];
};

export const Route = createFileRoute("/account/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — OsanPrints" },
      {
        name: "description",
        content: "View your OsanPrints order history, order status, and item details.",
      },
    ],
  }),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch("/api/my-orders");
        const data = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok) {
          if (res.status === 401) {
            navigate({ to: "/auth" });
            return;
          }
          console.error("Failed to load orders", { status: res.status, data });
          throw new Error("We couldn't load your orders right now. Please try again.");
        }

        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      } catch (err) {
        if (active) {
          console.error("My orders fetch failed", err);
          setError(err instanceof Error ? err.message : "We couldn't load your orders right now. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!orders.length) return;
    let active = true;
    async function loadReviewedProducts() {
      try {
        const meResponse = await apiFetch("/api/auth/me");
        const me = await meResponse.json().catch(() => ({}));
        const userId = me?.authenticated && me?.user?.id ? String(me.user.id) : null;
        if (!userId) return;
        const productIds = [...new Set(orders.flatMap((order) => (order.items || []).map((item) => item.productId).filter(Boolean) as string[]))];
        const reviewed = await Promise.all(
          productIds.map(async (productId) => {
            const response = await apiFetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
            const data = await response.json().catch(() => ({}));
            return data?.reviews?.some((review: { isMine?: boolean }) => review.isMine) ? productId : null;
          }),
        );
        if (active) setReviewedProductIds(new Set(reviewed.filter(Boolean) as string[]));
      } catch (error) {
        console.error("Failed to load reviewed products", error);
      }
    }
    loadReviewedProducts();
    return () => {
      active = false;
    };
  }, [orders]);

  const totalOrderCount = useMemo(() => orders.length, [orders.length]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Customer account</p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-foreground">My Orders</h1>
          </div>
          <Button asChild variant="secondary" className="w-fit">
            <Link to="/categories">Continue shopping</Link>
          </Button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            Loading your orders…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-sm text-foreground">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-nude text-primary">
              <Package2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-display text-3xl font-semibold text-foreground">
              You haven’t placed any orders yet
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Start with a custom print, browse our collections, or create your own design.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link to="/categories">Shop now</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/templates">Custom templates</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
              {totalOrderCount} order{totalOrderCount === 1 ? "" : "s"} placed
            </div>

            {orders.map((order) => {
              const isExpanded = !!expanded[order.id];
              const itemCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Order {order.trackingNumber || order.id.slice(-6)}</span>
                        <span>•</span>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary">{order.status || "Payment Pending"}</p>
                    </div>

                    <div className="flex items-center gap-4 sm:justify-end">
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {formatCurrency(order.total ?? 0)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [order.id]: !current[order.id],
                          }))
                        }
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-nude"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Hide details" : `View items (${itemCount})`}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="divide-y divide-border">
                      {(order.items || []).map((item, itemIndex) => {
                        const itemImage =
                          item.customization?.image ||
                          item.image ||
                          (item.productId ? `/images/placeholder-product.png` : "/images/placeholder-product.png");

                        return (
                          <div key={`${order.id}-${itemIndex}`} className="grid gap-3 p-4 md:grid-cols-[84px_minmax(0,1fr)_auto] md:items-center">
                            <div className="h-[84px] w-[84px] overflow-hidden rounded-md border border-border bg-nude">
                              <img
                                src={getOptimizedImageUrl(itemImage)}
                                alt={item.name || "Order item"}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = "/images/placeholder-product.png";
                                }}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-foreground">{item.name || "Custom item"}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {item.size ? <span>Size: {item.size}</span> : null}
                                {item.color ? <span>Color: {item.color}</span> : null}
                                {item.quantity ? <span>Qty: {item.quantity}</span> : null}
                              </div>
                              {item.customization && typeof item.customization === "object" ? (
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                  {item.customization.text ? <span>Text: {String(item.customization.text).slice(0, 24)}</span> : null}
                                  {item.customization.fontColor ? <span>Ink: {String(item.customization.fontColor)}</span> : null}
                                </div>
                              ) : null}
                              {item.productId && !reviewedProductIds.has(String(item.productId)) ? (
                                <Button asChild size="sm" variant="secondary" className="mt-3">
                                  <Link to="/product/$id" params={{ id: String(item.productId) }}>
                                    Leave a Review
                                  </Link>
                                </Button>
                              ) : null}
                            </div>

                            <div className="text-left md:text-right">
                              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Unit price</div>
                              <div className="mt-1 font-medium text-foreground">
                                {formatCurrency(Number(item.price || 0))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
