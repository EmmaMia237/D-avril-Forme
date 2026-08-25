import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { KpiCard, PageTitle, Panel, StatusPill } from "./components/admin-ui";
import { Button } from "./components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { CircleDollarSign, Landmark, Receipt } from "lucide-react";
import { payments, revenueSeries } from "./lib/shop-data";


const ranges = ["Daily", "Weekly", "Monthly"];

function PaymentsPage() {
  const [range, setRange] = useState("Monthly");
  const [paymentsState, setPaymentsState] = useState<Array<Record<string, any>>>(Array.isArray(payments) ? payments : []);
  const [revenueState, setRevenueState] = useState<Array<Record<string, any>>>(Array.isArray(revenueSeries) ? revenueSeries : []);
  // Confirm dialog for clearing payments
  const [showClearDialog, setShowClearDialog] = useState(false);
  const formatEur = (v: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number.isFinite(v) ? v : 0);
  const data =
    range === "Monthly"
      ? revenueState
      : range === "Weekly"
        ? revenueState.slice(-4).map((d, i) => ({ ...d, label: `W${i + 1}` }))
        : revenueState.slice(-5).map((d, i) => ({
            label: `D${i + 1}`,
            revenue: Math.round(d.revenue / 28),
            orders: Math.round(d.orders / 28),
          }));

  const gross = paymentsState.reduce((s, p) => s + (Number(p?.gross ?? 0) || 0), 0);
  const net = paymentsState.reduce((s, p) => s + (Number(p?.net ?? 0) || 0), 0);
  const pendingCount = paymentsState.filter((p) => /pending|pending settlement/i.test(String(p?.state || "").toLowerCase())).length;

  // Ask user to confirm clearing payments (opens dialog)
  function requestClearPayments() {
    setShowClearDialog(true);
  }

  async function performClearPayments() {
    setShowClearDialog(false);
    try {
      const res = await fetch('/api/admin/clear-all-orders', { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to clear orders');
      // Clear local state so UI updates immediately
      setPaymentsState([]);
      setRevenueState([]);
      // Use toast instead of alert for consistency
      // eslint-disable-next-line no-alert
      alert(`Deleted ${data.deleted || 0} orders`);
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(err?.message || String(err));
    }
  }

  return (
    <>
      <PageTitle
        title="Payment Tracking"
        subtitle="Gateway transactions, payout totals and revenue analytics."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={CircleDollarSign}
          label="Gross collected"
          value={formatEur(gross)}
          delta="Last 5 transactions"
        />
        <KpiCard
          icon={Landmark}
          label="Net payout"
          value={formatEur(net)}
          delta="After gateway fees"
        />
        <KpiCard
          icon={Receipt}
          label="Pending settlement"
          value={pendingCount ? formatEur(paymentsState.filter((p) => /pending/i.test(String(p?.state || ""))).reduce((s, p) => s + (Number(p?.gross ?? 0) || 0), 0)) : formatEur(0)}
          delta={pendingCount ? `${pendingCount} card transaction${pendingCount > 1 ? "s" : ""}` : "No pending transactions"}
        />
      </div>

      <div className="mt-6">
        <Panel
          title="Revenue analytics"
          action={
            <div className="flex gap-2">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={
                    r === range
                      ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      : "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  }
                >
                  {r}
                </button>
              ))}
                            <button onClick={requestClearPayments} className="rounded border border-destructive px-3 py-1.5 text-xs text-destructive">Clear payments</button>
            </div>
          }
        >
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} width={52} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Payment logs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net payout</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsState.map((p, index) => (
                  <TableRow key={String(p?.txn ?? p?.id ?? `payment-${index}`)}>
                    <TableCell className="font-mono text-xs">{p?.txn || "—"}</TableCell>
                    <TableCell className="font-semibold">{p?.order || "—"}</TableCell>
                    <TableCell>{p?.gateway || "N/A"}</TableCell>
                    <TableCell>{formatEur(Number(p?.gross ?? 0))}</TableCell>
                    <TableCell className="text-muted-foreground">{formatEur(Number(p?.fee ?? 0))}</TableCell>
                    <TableCell className="font-semibold">{formatEur(Number(p?.net ?? 0))}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {p?.date ? new Date(p.date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusPill status={p?.state || "Pending"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      {/* Clear payments confirmation dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all payments</DialogTitle>
            <DialogDescription>Are you sure you want to clear all recorded orders/payments from the database? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={performClearPayments}>Confirm</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
  
export default PaymentsPage;