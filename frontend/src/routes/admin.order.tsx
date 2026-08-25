import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, Panel } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/admin/orders/$id")({
  component: function AdminOrderRedirect() {
    if (typeof window !== "undefined") window.location.href = "/avril-admin";
    return null;
  },
});

function OrderDetailPage() {
  const { id } = useParams() as { id?: string };
  const navigate = useNavigate();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await apiFetch(`/api/admin/orders/${id}`);
        if (res.status === 401 || res.status === 403) {
          navigate({ to: "/avril-admin" });
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          if (cancelled) return;
          setOrder(data.order);
          setError(null);
          return;
        }
        throw new Error(data?.error || "Unable to load order");
      } catch (err: any) {
        if (!cancelled) setError(err?.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleApprove = async (status?: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/admin/orders/${id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: status || "In Production" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setOrder(data.order);
        return;
      }
      setError(data?.error || "Failed to update order");
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!id)
    return (
      <Panel title="Order not specified">
        <div className="py-6">No order id provided.</div>
      </Panel>
    );

  return (
    <>
      <PageTitle
        title={order ? `Order ${order.id}` : "Order Detail"}
        subtitle="Order information and composite preview"
      />
      <Panel title={loading ? "Loading order..." : order ? `Order ${order.id}` : "Order detail"}>
        {error && <div className="text-destructive mb-2">{error}</div>}
        {!order && !loading && !error && (
          <div className="py-6 text-sm text-muted-foreground">No order found.</div>
        )}

        {order && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              {order.previewPaths && order.previewPaths[0] ? (
                <img
                  src={order.previewPaths[0]}
                  alt={order.id}
                  className="w-full rounded object-cover"
                />
              ) : (
                <div className="h-64 w-full rounded bg-muted" />
              )}
            </div>
            <div>
              <div className="mb-2 text-sm text-muted-foreground">Created: {order.createdAt}</div>
              <pre className="max-h-96 overflow-auto text-xs bg-card p-3 rounded">
                {JSON.stringify(order.raw, null, 2)}
              </pre>

              <div className="mt-4 flex gap-2">
                <Button onClick={() => handleApprove("Design Review")} disabled={loading}>
                  Mark Design Review
                </Button>
                <Button onClick={() => handleApprove("In Production")} disabled={loading}>
                  Approve & Start Production
                </Button>
                <Button variant="outline" onClick={() => navigate({ to: "/admin/orders" })}>
                  Back to Orders
                </Button>
                {order && order.previewPaths && order.previewPaths[0] && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const url = order.previewPaths[0];
                        const res = await fetch(url, { credentials: "include" });
                        if (!res.ok) throw new Error("Failed to fetch image");
                        const blob = await res.blob();
                        const a = document.createElement("a");
                        const objectUrl = URL.createObjectURL(blob);
                        a.href = objectUrl;
                        a.download = `${order.id}-composite.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(objectUrl);
                      } catch (err: any) {
                        setError(err?.message || String(err));
                      }
                    }}
                  >
                    Download Composite
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
