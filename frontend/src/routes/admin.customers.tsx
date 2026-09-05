import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageTitle, Panel } from "@/components/admin-ui";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/admin/customers")({
  component: function AdminCustomersRedirect() {
    if (typeof window !== "undefined") window.location.href = "/avril-admin";
    return null;
  },
});

function CustomersPage() {
  const formatEur = formatPrice;
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await apiFetch("/api/admin/customers");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.ok !== true) {
          throw new Error(data?.error || "Unable to load customers");
        }
        setCustomers(data.customers ?? []);
        setError(null);
      } catch (err: any) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  return (
    <>
      <PageTitle
        title="Customer List"
        subtitle="Everyone who has ordered a print, with lifetime spend and order counts."
      />
      <Panel title={loading ? "Loading customers..." : `${customers.length} customers`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Lifetime spend</TableHead>
                <TableHead>Customer since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.email}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{c.orders}</TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatEur(c.spend)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.since}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        View orders
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
