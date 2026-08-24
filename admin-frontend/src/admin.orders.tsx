import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { PageTitle, Panel, StatusPill } from "./components/admin-ui";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { apiFetch, setAuthToken } from "./lib/api-client";
import { readStoredOrders } from "./lib/cart";


const filters = ["All", "Awaiting Print", "In Production", "Design Review", "Shipped"];

function OrdersPage() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/admin/orders?page=${page}&per_page=${perPage}`);
        if (res.status === 401 || res.status === 403) {
          // Not authenticated — redirect to the dedicated admin login page
          navigate({ to: '/avril-admin' });
          setLoading(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok === true) {
          if (cancelled) return;
          setOrders(data.orders ?? []);
          setTotal(data.total ?? 0);
          setError(null);
          // setAuthRequired(false); // not defined here
          return;
        }

        const stored = readStoredOrders();
        if (stored.length > 0) {
          if (cancelled) return;
          setOrders(stored);
          setError(null);
          return;
        }

        throw new Error(data?.error || "Unable to load orders");
      } catch (err: any) {
        const fallback = readStoredOrders();
        if (!cancelled) {
          setOrders(fallback);
          setError(fallback.length > 0 ? null : err?.message || String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [page, perPage]);

  const rows = orders.filter((o) => {
    // Only show orders with confirmed/processed payment. Accept common success indicators.
    const paymentVal = String(o?.payment || o?.paymentStatus || (o?.paid === true ? 'paid' : '')).toLowerCase();
    const paidStates = ['paid', 'completed', 'succeeded', 'captured', 'capture', 'paid_online', 'paid_via_stripe'];
    const isPaid = o?.paid === true || paidStates.some((s) => paymentVal.includes(s));

    if (!isPaid) return false;

    return (
      (filter === 'All' || o.status === filter) &&
      (`${o.id}${o.customer || ''}${o.items || ''}`).toLowerCase().includes(query.toLowerCase())
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handleApprove = async (id: string, status?: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/admin/orders/${id}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: status || 'In Production' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        // update local state
        setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
        return;
      }
      setError(data?.error || 'Failed to update order');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Orders & Fulfillment"
        subtitle="Track artwork approval, production status and payment state for every order."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search order ID, customer or item…"
          className="bg-card"
        />
        <div className="flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                f === filter
                  ? "shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Panel title={loading ? "Loading orders..." : `${rows.length} orders`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Print items</TableHead>
                <TableHead>Print status</TableHead>
                <TableHead>Payment state</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-semibold whitespace-nowrap">{o.id}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell className="text-muted-foreground">{Array.isArray(o.items) ? o.items.map(it => (it && it.name) ? `${it.name} x${it.quantity ?? it.qty ?? 1}` : String(it)).join(', ') : o.items}</TableCell>
                    <TableCell>
                      <StatusPill status={o.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{o.payment}</TableCell>
                    <TableCell>
                      {Array.isArray(o.previewPaths) && o.previewPaths[0] ? (
                        <img src={o.previewPaths[0]} alt={o.id} className="h-12 w-12 rounded object-cover cursor-pointer" onClick={() => typeof window !== 'undefined' && window.open(o.previewPaths[0], '_blank')} />
                      ) : (
                        <span className="text-xs text-muted-foreground">No preview</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/admin/orders/${o.id}`}>
                        <Button size="sm" variant="outline" className="whitespace-nowrap">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
            <select value={perPage} onChange={(e) => { setPerPage(Number((e.target as HTMLSelectElement).value)); setPage(1); }} className="rounded border border-border bg-background p-1">
              <option value={5}>5/page</option>
              <option value={10}>10/page</option>
              <option value={20}>20/page</option>
              <option value={50}>50/page</option>
            </select>
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
      </Panel>

    </>
  );
}

export default OrdersPage;
