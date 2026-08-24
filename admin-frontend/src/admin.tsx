import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { apiFetch, setAuthToken } from "./lib/api-client";
import { CreditCard, LayoutDashboard, LogOut, Package, Palette, Settings, Users, Tag, Menu, X, ArrowUpRight, User } from "lucide-react";
import { Input } from "./components/ui/input";

export default function AdminLayout() {
  const navigate = useNavigate();
  const storefrontUrl = (import.meta.env.VITE_FRONTEND_URL || 'https://davril-forme.vercel.app').replace(/\/$/, "") + "/";
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
          <img src="/images/logo.png" alt="D'avril Forme" className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">D'avril Forme</span>
            <span className="block text-[10px] tracking-[0.16em] text-accent uppercase">Admin portal</span>
          </span>
        </Link>

        {/* Profile */}
        <div className="mt-4 flex items-center gap-3 rounded-md bg-sidebar p-2">
          <div className="h-10 w-10 shrink-0 rounded-full bg-nude grid place-items-center text-sidebar-foreground">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">Store owner</div>
            <div className="text-xs text-sidebar-accent">avril@avrilforme.com</div>
          </div>
        </div>

        <nav className="mt-6 grid gap-1">
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-foreground)]" onClick={() => setMobileOpen(false)}>
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
                <img src="/images/logo.png" alt="D'avril Forme" className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent" />
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold">D'avrill Forme</span>
                </span>
              </Link>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-[var(--accent)] p-2 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-2 grid gap-1">
              {items.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-foreground)]">
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
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden mr-2 p-2 rounded-md bg-transparent text-[var(--accent)]" aria-label="Toggle menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <h1 className="text-lg font-display justify-self-start">D'avril Forme</h1>

            <div className="justify-self-end">
              <Input placeholder="Search admin..." className="w-60 mr-3 hidden md:inline" onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value.trim();
                  try { window.dispatchEvent(new CustomEvent('adminSearch', { detail: q })); } catch {};
                }
              }} />
              <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--accent)] hover:text-white border border-transparent">
                <ArrowUpRight className="h-4 w-4" />
                <span>View storefront</span>
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
