import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { apiFetch, setAuthToken } from "./lib/api-client";
import { CreditCard, LayoutDashboard, LogOut, Package, Palette, Settings, Users, Tag } from "lucide-react";

export default function AdminLayout() {
  const navigate = useNavigate();
  const storefrontUrl = (import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:5173")).replace(/\/$/, "") + "/";
  const items = [
    { to: "/admin", label: "Dashboard Overview", icon: LayoutDashboard },
    { to: "/admin/designs", label: "Manage Print Designs", icon: Palette },
    { to: "/admin/orders", label: "Orders & Fulfillment", icon: Package },
    { to: "/admin/payments", label: "Payment Tracking", icon: CreditCard },
    { to: "/admin/customers", label: "Customer List", icon: Users },
    { to: "/admin/categories", label: "Categories", icon: Tag },
    { to: "/admin/offers", label: "Offer Management", icon: Tag },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  // Verify admin session on mount — redirect to login if not authenticated
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) {
          if (mounted) navigate('/admin/login');
        } else {
          const data = await res.json().catch(() => ({}));
          if (!(data?.authenticated && data?.admin)) {
            if (mounted) navigate('/admin/login');
          }
        }
      } catch (e) {
        if (mounted) navigate('/admin/login');
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-nude font-display text-lg font-bold text-primary">A</span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">Avril Forme</span>
            <span className="block text-[10px] tracking-[0.16em] text-accent uppercase">Admin portal</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-1">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm" onClick={() => setMobileOpen(false)}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <button
          onClick={async () => {
            try {
              await apiFetch('/api/auth/logout', { method: 'POST' });
              setAuthToken(null);
            } finally {
              // Use client navigation to avoid full reload and preserve router behavior
              navigate('/admin/login');
            }
          }}
          className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground">
            <div className="mb-4 flex items-center justify-between">
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-nude font-display text-lg font-bold text-primary">A</span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold">Avril Forme</span>
                </span>
              </Link>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-sm">Close</button>
            </div>
            <nav className="mt-2 grid gap-1">
              {items.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>

            <button
              onClick={async () => {
                try {
                  await apiFetch('/api/auth/logout', { method: 'POST' });
                  setAuthToken(null);
                } finally {
                  setMobileOpen(false);
                  navigate('/admin/login');
                }
              }}
              className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:px-8">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden mr-2 p-2 rounded-md bg-transparent">Menu</button>
            <p className="truncate text-sm text-muted-foreground">Studio owner · <span className="font-semibold text-foreground">avril@avrilforme.com</span></p>
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline">View storefront</a>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
