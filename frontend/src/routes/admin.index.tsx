import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CircleDollarSign, Package, Palette, Truck, UploadCloud } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { KpiCard, PageTitle, Panel, StatusPill } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/admin/")({
  component: function AdminIndexRedirect() {
    if (typeof window !== "undefined") {
      window.location.href = "/avril-admin";
    }
    return null;
  },
});

const POLL_MS = 5000;

function AdminOverview() {
  const formatEur = formatPrice;
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      const res = await apiFetch("/api/admin/dashboard");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) {
        throw new Error(data?.error || "Unable to load dashboard data");
      }
      setDashboard(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, POLL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const stats = dashboard?.stats ?? {};
  const recentOrders = dashboard?.recentOrders ?? [];
  const revenueSeries = dashboard?.revenueSeries ?? [];

  return (
    <>
      <PageTitle
        title="Dashboard Overview"
        subtitle="Live studio performance for your print studio."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Total Revenue"
          value={loading ? "Loading..." : formatEur(stats.totalRevenue ?? 0)}
          delta="Real-time update"
        />
        <KpiCard
          icon={Package}
          label="Pending / Ready to Print"
          value={loading ? "Loading..." : `${stats.pendingCount ?? 0}`}
          delta="Updated every few seconds"
        />
        <KpiCard
          icon={Palette}
          label="Print Designs Uploaded"
          value={loading ? "Loading..." : `${stats.designsUploaded ?? 0}`}
          delta="Current catalogue"
        />
        <KpiCard
          icon={Truck}
          label="Completed Shipments"
          value={loading ? "Loading..." : `${stats.completedShipments ?? 0}`}
          delta="Shipped orders"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Recent customer orders"
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/orders">Open fulfilment</Link>
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading recent orders...
                    </TableCell>
                  </TableRow>
                ) : recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No recent orders yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold">{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[18rem]">
                        {order.items}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatEur(order.total ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
        </Panel>

        <div className="grid gap-6">
          <Panel title="Quick design upload">
            <div className="p-5">
              <label className="grid cursor-pointer place-items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-nude px-6 py-10 text-center">
                <UploadCloud className="h-7 w-7 text-primary" />
                <span className="text-sm font-semibold">Drop artwork here</span>
                <span className="text-xs text-muted-foreground">PNG, SVG, AI, PSD · 300 DPI</span>
                <input type="file" className="hidden" multiple />
              </label>
              <Button asChild className="mt-4 w-full">
                <Link to="/admin/designs">Open design manager</Link>
              </Button>
            </div>
          </Panel>

          <Panel title="Revenue trend">
            <div className="h-56 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} width={44} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
