import React from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { apiFetch, setAuthToken } from "./lib/api-client";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Settings,
  Users,
  Tag,
  Menu,
  X,
  ArrowUpRight,
  User,
  Search,
} from "lucide-react";
import { Input } from "./components/ui/input";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
};

type SearchResults = {
  products: SearchResult[];
  orders: SearchResult[];
  customers: SearchResult[];
};

const EMPTY_SEARCH_RESULTS: SearchResults = { products: [], orders: [], customers: [] };

function AdminSearchDropdown({
  query,
  results,
  loading,
  onSelect,
}: {
  query: string;
  results: SearchResults;
  loading: boolean;
  onSelect: (type: keyof SearchResults, result: SearchResult) => void;
}) {
  if (!query.trim()) return null;

  const groups = [
    ["products", "Products"],
    ["orders", "Orders"],
    ["customers", "Customers"],
  ] as const;
  const hasResults = groups.some(([type]) => results[type].length > 0);

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-card p-2 shadow-lg">
      {loading ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
      ) : !hasResults ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">No results found</p>
      ) : (
        groups.map(([type, label]) =>
          results[type].length > 0 ? (
            <div key={type} className="py-1">
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              {results[type].map((result) => (
                <button
                  key={`${type}-${result.id}`}
                  type="button"
                  onClick={() => onSelect(type, result)}
                  className="block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className="block truncate text-sm font-medium text-foreground">{result.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                </button>
              ))}
            </div>
          ) : null
        )
      )}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const storefrontUrl =
    (
      import.meta.env.VITE_FRONTEND_URL || "https://www.osanprints.com"
    ).replace(/\/$/, "") + "/";
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<SearchResults>(EMPTY_SEARCH_RESULTS);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const dispatchAdminSearch = React.useCallback((value: string) => {
    const next = value ?? "";
    setSearchQuery(next);
    try {
      window.dispatchEvent(new CustomEvent("adminSearch", { detail: next }));
    } catch (error) {
      console.warn("admin search dispatch failed", error);
    }
  }, []);

  React.useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(EMPTY_SEARCH_RESULTS);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [productsResponse, ordersResponse, customersResponse] = await Promise.all([
          apiFetch(`/api/products?limit=200&summary=1`, { signal: controller.signal }),
          apiFetch("/api/admin/orders", { signal: controller.signal }),
          apiFetch("/api/admin/customers", { signal: controller.signal }),
        ]);
        const [productsData, ordersData, customersData] = await Promise.all([
          productsResponse.json().catch(() => ({})),
          ordersResponse.json().catch(() => ({})),
          customersResponse.json().catch(() => ({})),
        ]);
        const normalizedQuery = query.toLowerCase();
        const matches = (value: unknown) => String(value || "").toLowerCase().includes(normalizedQuery);
        const products = (Array.isArray(productsData?.products) ? productsData.products : [])
          .filter((product: any) => [product.name, product.sku, product.category, product._id, product.id].some(matches))
          .slice(0, 5)
          .map((product: any) => ({
            id: String(product._id || product.id || product.sku || product.name),
            title: product.name || product.sku || "Product",
            subtitle: product.sku ? `SKU ${product.sku}` : product.category || "Product",
          }));
        const orders = (Array.isArray(ordersData?.orders) ? ordersData.orders : [])
          .filter((order: any) => [order.id, order.customer, order.email, order.items].some(matches))
          .slice(0, 5)
          .map((order: any) => ({
            id: String(order.id),
            title: `Order ${order.id}`,
            subtitle: order.customer || order.email || "Order",
          }));
        const customers = (Array.isArray(customersData?.customers) ? customersData.customers : [])
          .filter((customer: any) => [customer.name, customer.email].some(matches))
          .slice(0, 5)
          .map((customer: any) => ({
            id: String(customer.id || customer.email || customer.name),
            title: customer.name || customer.email || "Customer",
            subtitle: customer.email || "Customer",
          }));

        if (!controller.signal.aborted) setSearchResults({ products, orders, customers });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Admin search failed", error);
          setSearchResults(EMPTY_SEARCH_RESULTS);
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSearchSelect = React.useCallback(
    (type: keyof SearchResults, result: SearchResult) => {
      setSearchQuery("");
      setMobileSearchOpen(false);
      const params = new URLSearchParams({ search: type === "products" ? result.title : result.id });
      if (type === "products") params.set("highlight", result.id);
      navigate(`/admin/${type === "products" ? "designs" : type}?${params.toString()}`);
    },
    [navigate],
  );

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
        const res = await apiFetch("/api/auth/me");
        if (!res.ok) {
          if (mounted) navigate("/admin/login");
        } else {
          const data = await res.json().catch(() => ({}));
          if (!(data?.authenticated && data?.admin)) {
            if (mounted) navigate("/admin/login");
          }
        }
      } catch (e) {
        if (mounted) navigate("/admin/login");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground lg:flex">
        <Link to="/admin" className="flex items-center gap-2">
          <img
            src="/images/logo.png"
            alt="OsanPrints"
            className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent"
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">
              OsanPrints
            </span>
            <span className="block text-[10px] tracking-[0.16em] text-accent uppercase">
              Admin portal
            </span>
          </span>
        </Link>

        {/* Profile */}
        <div className="mt-4 flex items-center gap-3 rounded-md bg-sidebar p-2">
          <div className="h-10 w-10 shrink-0 rounded-full bg-nude grid place-items-center text-sidebar-foreground">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">Store owner</div>
            <div className="text-xs text-sidebar-accent">
              avril@avrilforme.com
            </div>
          </div>
        </div>

        <nav className="mt-6 grid gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/85 transition-all duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-accent text-accent-foreground font-semibold shadow-sm" : "text-sidebar-foreground/85"}`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          onClick={async () => {
            try {
              await apiFetch("/api/auth/logout", { method: "POST" });
              setAuthToken(null);
            } finally {
              // Use client navigation to avoid full reload and preserve router behavior
              navigate("/admin/login");
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
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 flex h-full w-[min(18rem,85vw)] shrink-0 flex-col overflow-y-auto bg-sidebar p-5 text-sidebar-foreground">
            <div className="mb-4 flex items-center justify-between">
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <img
                  src="/images/logo.png"
                  alt="OsanPrints"
                  className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent"
                />
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold">
                    OsanPrints
                  </span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="text-[var(--accent)] p-2 rounded-md"
              >
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
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-accent text-accent-foreground font-semibold shadow-sm" : "text-sidebar-foreground/85"}`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <button
              onClick={async () => {
                try {
                  await apiFetch("/api/auth/logout", { method: "POST" });
                  setAuthToken(null);
                } finally {
                  setMobileOpen(false);
                  navigate("/admin/login");
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
        <header ref={searchContainerRef} className="sticky top-0 z-30 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="rounded-md p-2 text-[var(--accent)] lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <h1 className="min-w-0 truncate font-display text-base sm:text-lg">
                OsanPrints
              </h1>
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
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <AdminSearchDropdown query={searchQuery} results={searchResults} loading={searchLoading} onSelect={handleSearchSelect} />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Open mobile search"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border-0 bg-transparent text-accent shadow-none transition-colors hover:bg-nude md:hidden"
                onClick={() => setMobileSearchOpen((open) => !open)}
              >
                <Search className="h-4 w-4" />
              </button>
              <a
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View storefront"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-foreground sm:w-auto sm:px-3 sm:py-1.5"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span className="hidden sm:inline">View storefront</span>
              </a>
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="border-t border-border px-4 py-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                <AdminSearchDropdown query={searchQuery} results={searchResults} loading={searchLoading} onSelect={handleSearchSelect} />
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
