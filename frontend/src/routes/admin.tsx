import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch, setAuthToken } from "@/lib/api-client";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Settings,
  Users,
} from "lucide-react";
const items = [
  { to: "/admin", label: "Dashboard Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/designs", label: "Manage Print Designs", icon: Palette, exact: false },
  { to: "/admin/orders", label: "Orders & Fulfillment", icon: Package, exact: false },
  { to: "/admin/payments", label: "Payment Tracking", icon: CreditCard, exact: false },
  { to: "/admin/customers", label: "Customer List", icon: Users, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        const data = await res.json().catch(() => ({}));
        const isAdmin =
          res.ok &&
          data?.ok === true &&
          data?.authenticated === true &&
          (data?.admin === true || data?.payload?.role === "admin" || data?.user?.role === "admin");
        if (!isAdmin) {
          // Redirect to admin login if not authenticated as admin
          window.location.href = "/avril-admin";
          return;
        }
      } catch (err) {
        window.location.href = "/avril-admin";
        return;
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center">Checking admin session…</div>);
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-nude font-display text-lg font-bold text-primary">
            A
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">Avril Forme</span>
            <span className="block text-[10px] tracking-[0.16em] text-accent uppercase">
              Admin portal
            </span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-1">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm opacity-80 transition-colors hover:bg-sidebar-accent hover:opacity-100 data-[status=active]:bg-sidebar-accent data-[status=active]:opacity-100"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <button
          onClick={async () => {
            try {
              await apiFetch("/api/auth/logout", { method: "POST" });
              setAuthToken(null);
            } finally {
              // redirect to admin login
              window.location.href = "/avril-admin";
            }
          }}
          className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm opacity-70 hover:bg-sidebar-accent hover:opacity-100"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:px-8">
            <p className="truncate text-sm text-muted-foreground">
              Studio owner ·{" "}
              <span className="font-semibold text-foreground">avril@avrilforme.com</span>
            </p>
            <Link
              to="/"
              className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View storefront
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 lg:hidden">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});
