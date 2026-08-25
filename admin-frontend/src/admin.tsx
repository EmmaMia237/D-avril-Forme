import React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { apiFetch, setAuthToken } from "./lib/api-client";
import { CreditCard, LayoutDashboard, LogOut, Package, Palette, Settings, Users, Tag, Menu, X, ArrowUpRight, User, Search } from "lucide-react";
import { Input } from "./components/ui/input";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const storefrontUrl = (import.meta.env.VITE_FRONTEND_URL || 'https://davril-forme.vercel.app').replace(/\/$/, "") + "/";
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const dispatchAdminSearch = React.useCallback((value: string) => {
    const next = value ?? "";
    setSearchQuery(next);
    try {
      window.dispatchEvent(new CustomEvent('adminSearch', { detail: next }));
    } catch (error) {
      console.warn('admin search dispatch failed', error);
    }
  }, []);

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

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <Link to="/admin" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="D’avril Forme" className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent" />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">D’avril Forme</span>
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
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 transition-all duration-200 ease-in-out hover:bg-orange-600/90 hover:text-white ${isActive ? "bg-orange-600 text-white font-semibold shadow-sm" : "text-slate-200"}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
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
                <img src="/images/logo.png" alt="D’avril Forme" className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent" />
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold">D’avril Forme</span>
                </span>
              </Link>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-[var(--accent)] p-2 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-2 grid gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ease-in-out hover:bg-orange-600/90 hover:text-white ${isActive ? "bg-orange-600 text-white font-semibold shadow-sm" : "text-slate-200"}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
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
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-md p-2 text-[var(--accent)] lg:hidden" aria-label="Toggle menu">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <h1 className="text-lg font-display">D’avril Forme</h1>
            </div>

            <div className="hidden flex-1 items-center justify-center px-4 md:flex">
              <div className="relative mx-auto w-full max-w-2xl">
                <Input
                  value={searchQuery}
                  onChange={(event) => dispatchAdminSearch(event.target.value)}
                  placeholder="Search admin..."
                  className="w-full pl-10"
                  aria-label="Search admin"
                />
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open mobile search"
                className="inline-flex items-center justify-center rounded-md border-0 bg-transparent p-1 text-slate-700 shadow-none md:hidden"
                onClick={() => setMobileSearchOpen((open) => !open)}
              >
                <Search className="h-4 w-4" />
              </button>
              <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-auto shrink-0 items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-semibold transition hover:bg-[var(--accent)] hover:text-white">
                <ArrowUpRight className="h-4 w-4" />
                <span>View storefront</span>
              </a>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="border-t border-border px-4 py-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    dispatchAdminSearch(event.target.value);
                  }}
                  onBlur={() => setMobileSearchOpen(false)}
                  placeholder="Search admin..."
                  className="w-full pl-10"
                  autoFocus
                  aria-label="Search admin mobile"
                />
              </div>
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
