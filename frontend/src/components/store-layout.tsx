import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  User,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
  CreditCard,
  Headphones,
  ShieldCheck,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { useState, useRef, useEffect, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { CartDrawer } from "@/components/cart-drawer";

const nav = [
  { to: "/", label: "Home" },
  { to: "/categories", label: "Print Categories" },
  { to: "/templates", label: "Custom Templates" },
  { to: "/offers", label: "Offers" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact / Help" },
] as const;

const themes = [
  { name: "Kids Collection", slug: "kids" },
  { name: "Halloween Collection", slug: "halloween" },
  { name: "Fall / Autumn Collection", slug: "autumn" },
  { name: "Anime Collection", slug: "anime" },
] as const;

export function StoreHeader() {
  const [open, setOpen] = useState(false);
  const { openCart, items } = useCart();
  const itemCount = items.reduce((s, it) => s + (it.quantity || 0), 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <img
              src="/images/logo.png"
              alt="D'avril Forme Logo"
              className="h-9 w-9 shrink-0 rounded-sm object-contain bg-transparent"
            />
            <span className="hidden truncate font-display text-xl font-semibold tracking-wide sm:inline">
              D'avril Forme
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm xl:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="whitespace-nowrap opacity-80 transition-opacity hover:opacity-100 data-[status=active]:border-b-2 data-[status=active]:border-accent data-[status=active]:pb-0.5 data-[status=active]:opacity-100"
              >
                {item.label}
              </Link>
            ))}
            <ThemesDropdown />
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SearchBox />
          <Button asChild variant="ghost" size="icon" className="hover:bg-primary-light">
            <Link to="/auth" aria-label="Account sign in">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <button
            className="relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground"
            aria-label="Shopping cart"
            onClick={openCart}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="sr-only">Open cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {itemCount}
              </span>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden hover:bg-primary-light"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50 xl:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav className="fixed left-0 right-0 top-12 z-40 max-h-[calc(100vh-48px)] overflow-y-auto border-t border-primary-light bg-primary text-primary-foreground transition-all duration-300 xl:hidden">
            <div className="grid gap-1 px-4 py-4 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 opacity-90 transition-colors hover:bg-primary-light hover:opacity-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

function ThemesDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 cursor-pointer rounded-md px-2 py-1 hover:bg-primary-light transition-colors"
      >
        <span className="text-sm text-primary-foreground opacity-90">Themes</span>
        <ChevronDown
          className={`h-4 w-4 text-primary-foreground opacity-80 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-md border border-border bg-card p-2 shadow-lg z-50">
          {themes.map((t) => (
            <Link
              key={t.slug}
              to="/collections"
              search={{ theme: t.slug }}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-nude/60 transition-colors"
            >
              {t.name}
            </Link>
          ))}
          <Link
            to="/collections"
            onClick={() => setOpen(false)}
            className="block mt-1 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-nude/60 transition-colors"
          >
            All themes
          </Link>
        </div>
      )}
    </div>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const nextQuery = q.trim();
    if (!nextQuery) return;

    // Client-side navigation so the app doesn't fully reload. Set the `q` search param.
    try {
      navigate({ to: "/categories", search: { q: nextQuery } });
    } catch (e) {
      // If router navigation isn't available for any reason, fall back to history API.
      window.history.pushState(null, "", `/categories?q=${encodeURIComponent(nextQuery)}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }

    // Also pushState+popstate to ensure the categories listener updates even if navigate
    // does not dispatch a popstate.
    try {
      window.history.pushState(null, "", `/categories?q=${encodeURIComponent(nextQuery)}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <form onSubmit={onSearch} className="relative hidden items-center md:flex">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search prints, mugs, templates..."
        className="h-9 w-52 rounded-r-none bg-nude text-foreground lg:w-64"
        aria-label="Search products"
      />
      <Button
        type="submit"
        size="icon"
        className="h-9 rounded-l-none bg-accent text-accent-foreground hover:bg-accent/90"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}

export function StoreFooter() {
  return (
    <footer className="mt-auto">
      <div className="border-y border-border bg-nude">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3 lg:px-8">
          {[
            { icon: CreditCard, title: "Secure Payments", text: "Stripe, cards & mobile money" },
            { icon: Headphones, title: "Live Support", text: "Mon-Sat, 8am-7pm" },
            { icon: ShieldCheck, title: "Print Guarantee", text: "Free reprint on defects" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-foreground/70">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-primary-deep text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="font-display text-2xl">D'avril Forme</p>
            <p className="mt-3 max-w-xs text-sm text-primary-foreground/85">
              Where everyday items become your canvas. At D’avril Forme, we turn essentials into
              personal, meaningful pieces for daily life.
            </p>
            <div className="mt-4 text-sm text-primary-foreground/85">
              <div className="flex gap-4">
                <a
                  href="https://www.instagram.com/davril_forme?igsh=MTYwZGllOWs5aWFweg=="
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 transition-all duration-200 hover:text-accent"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="h-5 w-5" />
                  <span className="text-xs">Instagram</span>
                </a>
                <a
                  href="https://www.tiktok.com/@atelier_davril"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 transition-all duration-200 hover:text-accent"
                  aria-label="Follow us on TikTok"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.68v13.67a2.4 2.4 0 0 1-2.4 2.4 2.4 2.4 0 0 1-2.4-2.4 2.4 2.4 0 0 1 2.4-2.4c.34 0 .67.05 1 .15V9.48a5.9 5.9 0 0 0-1-.08A6.02 6.02 0 0 0 5 21.58a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-7.85a7.6 7.6 0 0 0 4.64 1.53V13.9a4.76 4.76 0 0 1-.95-.08z" />
                  </svg>
                  <span className="text-xs">TikTok</span>
                </a>
                <a
                  href="https://wa.me/447417575436"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 transition-all duration-200 hover:text-accent"
                  aria-label="Contact us on WhatsApp"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-xs">WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
          <FooterCol
            title="Shop"
            links={[
              { to: "/categories", label: "Print Categories" },
              { to: "/collections", label: "Themes" },
              { to: "/templates", label: "Custom Templates" },
              { to: "/offers", label: "Offers & Deals" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { to: "/about", label: "About Us" },
              { to: "/contact", label: "Contact / Help" },
              { to: "/auth", label: "Account" },
            ]}
          />
          <FooterCol
            title="Studio"
            links={[
              { to: "/contact", label: "Bulk enquiries" },
              { to: "/auth", label: "Admin Login" },
            ]}
          />
        </div>
        <div className="border-t border-primary-light/40">
          <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-primary-foreground/90 lg:px-8">
            © {new Date().getFullYear()} Avril Forme. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-nude uppercase">{title}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="text-primary-foreground/90 transition-colors duration-200 hover:text-accent"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StoreLayout({ children }: { children: ReactNode }) {
  // Set up Server-Sent Events (SSE) connection for real-time product updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const es = new EventSource("/api/events");
      es.addEventListener("product-created", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse((ev as any).data || "{}");
          // dispatch a DOM event other components can listen to
          window.dispatchEvent(new CustomEvent("product-created", { detail: payload.product }));
        } catch (e) {
          // ignore malformed
        }
      });
      es.addEventListener("product-updated", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse((ev as any).data || "{}");
          window.dispatchEvent(new CustomEvent("product-updated", { detail: payload.product }));
        } catch (e) {}
      });
      es.addEventListener("product-deleted", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse((ev as any).data || "{}");
          window.dispatchEvent(new CustomEvent("product-deleted", { detail: payload }));
        } catch (e) {}
      });

      // Category events
      es.addEventListener("category-created", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse((ev as any).data || "{}");
          window.dispatchEvent(new CustomEvent("category-created", { detail: payload }));
        } catch (e) {}
      });
      es.addEventListener("category-updated", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse((ev as any).data || "{}");
          window.dispatchEvent(new CustomEvent("category-updated", { detail: payload }));
        } catch (e) {}
      });
      es.addEventListener("category-deleted", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse((ev as any).data || "{}");
          window.dispatchEvent(new CustomEvent("category-deleted", { detail: payload }));
        } catch (e) {}
      });

      es.addEventListener("error", () => {
        // handle silently; EventSource reconnects automatically
      });

      return () => {
        try {
          es.close();
        } catch (e) {}
      };
    } catch (err) {
      // EventSource not supported or blocked
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <CartDrawer />
    </div>
  );
}
