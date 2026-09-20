import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageTitle, Panel } from "./components/admin-ui";
import { Button } from "./components/ui/button";
import { apiFetch } from "./lib/api-client";

const productionViews = ["Front", "Back", "Left Sleeve", "Right Sleeve", "Neck Tag"] as const;

type ProductionView = (typeof productionViews)[number];

function displayValue(value: unknown, fallback = "Not provided") {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  return String(value);
}

function getArtworkForView(customization: any, view: ProductionView) {
  const keyedArtwork = customization?.artworkByView?.[view];
  if (keyedArtwork) return keyedArtwork;
  if (!Array.isArray(customization?.artworks)) return null;
  return customization.artworks.find((entry: any) => entry?.view === view) || null;
}

function ArtworkDetails({ artwork }: { artwork: any }) {
  if (!artwork) {
    return <p className="text-sm text-muted-foreground">No artwork configured</p>;
  }

  if (artwork.type === "text") {
    return (
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">Text</dt><dd className="break-words">{displayValue(artwork.text)}</dd></div>
        <div><dt className="font-semibold">Text color</dt><dd>{displayValue(artwork.textColor)}</dd></div>
        <div><dt className="font-semibold">Font size</dt><dd>{displayValue(artwork.fontSize, "Not provided")} {artwork.fontSize !== undefined ? "px" : ""}</dd></div>
        <div><dt className="font-semibold">Font family</dt><dd>{displayValue(artwork.fontFamily)}</dd></div>
        <div><dt className="font-semibold">Position</dt><dd>{artwork.position ? `${artwork.position.x}, ${artwork.position.y}` : "Not provided"}</dd></div>
        <div><dt className="font-semibold">Rotation / size</dt><dd>{displayValue(artwork.rotation, "0")}° / {displayValue(artwork.size)}</dd></div>
      </dl>
    );
  }

  const imageUrl = artwork.imageUrl || artwork.localObjectUrl;
  return imageUrl ? (
    <div className="space-y-3">
      <img src={imageUrl} alt="Configured artwork" className="max-h-72 w-full rounded border border-border bg-white object-contain p-3" />
      <a
        href={imageUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-primary underline print:hidden"
      >
        Open artwork asset
      </a>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">Image artwork has no usable asset URL</p>
  );
}


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
          navigate('/avril-admin');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          if (cancelled) return;
          setOrder(data.order);
          setError(null);
          return;
        }
        throw new Error(data?.error || 'Unable to load order');
      } catch (err: any) {
        if (!cancelled) setError(err?.message || String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleApprove = async (status?: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiFetch(`/api/admin/orders/${id}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: status || 'In Production' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setOrder(data.order);
        return;
      }
      setError(data?.error || 'Failed to update order');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!id) return (
    <Panel title="Order not specified">
      <div className="py-6">No order id provided.</div>
    </Panel>
  );

  return (
    <>
      <style>{`
        @media print {
          .admin-order-print-hide { display: none !important; }
          .admin-order-print-sheet { box-shadow: none !important; border: 0 !important; }
          .admin-order-print-view { break-inside: avoid; page-break-inside: avoid; }
          body:has(.admin-order-print-sheet) aside,
          body:has(.admin-order-print-sheet) header { display: none !important; }
          body:has(.admin-order-print-sheet) main { padding: 0 !important; }
        }
      `}</style>
      <div className="admin-order-print-sheet">
        <div className="admin-order-print-hide">
          <PageTitle title={order ? `Order ${order.id}` : 'Order Detail'} subtitle="Order and production information" />
        </div>
        <Panel title={loading ? 'Loading order...' : order ? `Order ${order.id}` : 'Order detail'}>
        {error && <div className="text-destructive mb-2">{error}</div>}
        {!order && !loading && !error && <div className="py-6 text-sm text-muted-foreground">No order found.</div>}

        {order && (
          <div className="space-y-6 p-5">
            <div className="admin-order-print-hide flex flex-wrap justify-end gap-2">
              <Button onClick={() => window.print()}>Print Order</Button>
              <Button variant="outline" onClick={() => navigate('/admin/orders')}>Back to Orders</Button>
            </div>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Customer Information</h2>
              <div className="grid gap-3 rounded border border-border p-4 sm:grid-cols-2">
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Customer name</p><p>{displayValue(order.userName)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Email</p><p>{displayValue(order.userEmail)}</p></div>
                <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase text-muted-foreground">Shipping address</p><p>{displayValue(order.shippingAddress || order.address)}</p></div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold">Order / Product Information</h2>
              <div className="grid gap-3 rounded border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Order ID</p><p className="break-all">{displayValue(order.id || order._id)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Created</p><p>{displayValue(order.createdAt)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Status</p><p>{displayValue(order.status)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Payment</p><p>{displayValue(order.paymentStatus)} / {displayValue(order.paymentMethod)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Product</p><p>{displayValue(order.items?.[0]?.name)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Product ID / variant</p><p>{displayValue(order.items?.[0]?.productId)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Requested size</p><p>{displayValue(order.items?.[0]?.size)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Requested color</p><p>{displayValue(order.items?.[0]?.color)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Quantity</p><p>{displayValue(order.items?.[0]?.quantity)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Product price</p><p>{displayValue(order.items?.[0]?.price)}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Total order amount</p><p>{displayValue(order.total)}</p></div>
              </div>
            </section>

            {order.items?.[0]?.customization?.mockupUrl || order.items?.[0]?.customization?.image ? (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Composite Preview</h2>
                <img
                  src={order.items[0].customization.mockupUrl || order.items[0].customization.image}
                  alt={`${order.id} composite preview`}
                  className="max-h-96 w-full rounded border border-border object-contain"
                />
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-lg font-semibold">Production Artwork</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {productionViews.map((view) => (
                  <article key={view} className="admin-order-print-view rounded border border-border p-4">
                    <h3 className="mb-3 text-base font-semibold uppercase tracking-wide">{view}</h3>
                    <ArtworkDetails artwork={getArtworkForView(order.items?.[0]?.customization, view)} />
                  </article>
                ))}
              </div>
            </section>

            <div className="admin-order-print-hide flex flex-wrap gap-2">
              <Button onClick={() => handleApprove('Design Review')} disabled={loading}>Mark Design Review</Button>
              <Button onClick={() => handleApprove('In Production')} disabled={loading}>Approve & Start Production</Button>
            </div>
          </div>
        )}
        </Panel>
      </div>
    </>
  );
}

export default OrderDetailPage;