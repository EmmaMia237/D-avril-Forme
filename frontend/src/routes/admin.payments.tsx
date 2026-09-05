import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { KpiCard, PageTitle, Panel, StatusPill } from "@/components/admin-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CircleDollarSign, Landmark, Receipt } from "lucide-react";
import { payments, revenueSeries } from "@/lib/shop-data";
import { formatPrice } from "@/lib/currency";

export const Route = createFileRoute("/admin/payments")({
  component: function AdminPaymentsRedirect() {
    if (typeof window !== "undefined") window.location.href = "/avril-admin";
    return null;
  },
});

const ranges = ["Daily", "Weekly", "Monthly"];

function PaymentsPage() {
  const formatEur = formatPrice;
  const [range, setRange] = useState("Monthly");
  const data =
    range === "Monthly"
      ? revenueSeries
      : range === "Weekly"
        ? revenueSeries.slice(-4).map((d, i) => ({ ...d, label: `W${i + 1}` }))
        : revenueSeries.slice(-5).map((d, i) => ({
            label: `D${i + 1}`,
            revenue: Math.round(d.revenue / 28),
            orders: Math.round(d.orders / 28),
          }));

  const gross = payments.reduce((s, p) => s + p.gross, 0);
  const net = payments.reduce((s, p) => s + p.net, 0);

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
          value={formatPrice(gross)}
          delta="1 card transaction"
        />
      </div>

      <div className="mt-6">
        <Panel
          title="Revenue analytics"
          action={
            <div className="flex gap-1">
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
                {payments.map((p) => (
                  <TableRow key={p.txn}>
                    <TableCell className="font-mono text-xs">{p.txn}</TableCell>
                    <TableCell className="font-semibold">{p.order}</TableCell>
                    <TableCell>{p.gateway}</TableCell>
                    <TableCell>{formatEur(p.gross)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatEur(p.fee)}</TableCell>
                    <TableCell className="font-semibold">{formatEur(p.net)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {p.date}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusPill status={p.state} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </>
  );
}
