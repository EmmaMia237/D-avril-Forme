import { useEffect, useState } from "react";

import { PageTitle, Panel } from "./components/admin-ui";
import AdminDataTable from "./components/admin-data-table";
import { Button } from "./components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { apiFetch } from "./lib/api-client";
import { formatPrice } from "../../shared/currency";


function CustomersPage() {
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
        <div className="p-4">
          <AdminDataTable
            columns={[
              { key: 'name', title: 'Customer', render: (c:any) => c.name },
              { key: 'email', title: 'Email', render: (c:any) => <div className="text-muted-foreground">{c.email}</div> },
              { key: 'orders', title: 'Orders', render: (c:any) => c.orders },
              { key: 'spend', title: 'Lifetime spend', render: (c:any) => <div className="font-semibold text-primary">{formatPrice(Number(c.spend || 0))}</div> },
              { key: 'since', title: 'Customer since', render: (c:any) => c.since },
            ]}
            rows={customers}
            loading={loading}
            onView={(c:any) => { window.location.href = `/admin/customers/${encodeURIComponent(c.email)}` }}
            selectable={false}
          />
        </div>
      </Panel>
    </>
  );
}

export default CustomersPage;