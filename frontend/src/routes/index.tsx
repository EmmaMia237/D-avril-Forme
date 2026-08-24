import { Link, createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Boxes, Truck, UploadCloud, ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { categories as fallbackCategories } from "@/lib/shop-data";
import heroImage from "@/assets/hero-merch.jpg";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "D'avril Forme — Custom Printing for Apparel, Mugs & Merch" },
      {
        name: "description",
        content:
          "D'avril Forme prints custom t-shirts, mugs, phone cases, stationery and corporate merch. Single items or bulk runs with fast shipping.",
      },
      { property: "og:title", content: "D'avril Forme — Custom Printing Studio" },
      {
        property: "og:description",
        content:
          "Design-led custom printing: apparel, drinkware, phone cases, stationery and corporate merchandise.",
      },
    ],
  }),
  component: HomePage,
});

const trust = [
  { icon: BadgeCheck, title: "100% Quality Prints", text: "Colour-calibrated ink on every run." },
  { icon: Boxes, title: "Bulk & Single Orders", text: "One mug or five hundred kits." },
  { icon: Truck, title: "Fast Shipping", text: "Express dispatch in 2 business days." },
  { icon: UploadCloud, title: "Easy Custom Uploads", text: "PNG, SVG, AI & PSD at 300 DPI." },
];

function HomePage() {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>(fallbackCategories || []);
  const [heroSrc, setHeroSrc] = useState<string>(heroImage);

  useEffect(() => {
    let active = true;
    let timer: any = null;
    async function load() {
      try {
        const res = await apiFetch('/api/products');
        const data = await res.json().catch(() => ({}));
        if (res.ok && active) setProductsList((data.products || []).map((p:any) => ({ ...p, id: p.id || p._id })) );
      } catch (e) {
        // ignore
      }
    }
    load();

    // Try to prefer a public hero image if available (admin may have uploaded new hero-image.png)
    (async function pickHero() {
      try {
        const r = await fetch('/images/hero-image.png', { method: 'HEAD' });
        if (r && r.ok) setHeroSrc('/images/hero-image.png');
      } catch (err) {
        // keep fallback heroImage import
      }
    })();

    // Listen for realtime product events and update local list
    function onCreated(e: any) {
      const p = e.detail;
      if (!p) return;
      const id = p._id || p.id;
      setProductsList((prev) => {
        if (prev.some((x) => (x._id || x.id) === id)) return prev;
        return [...prev, { ...p, id }];
      });
    }
    function onUpdated(e: any) {
      const p = e.detail;
      if (!p) return;
      const id = p._id || p.id;
      setProductsList((prev) => prev.map((x) => ((x._id || x.id) === id ? { ...x, ...p, id } : x)));
    }
    function onDeleted(e: any) {
      const payload = e.detail || {};
      const id = payload?.id || payload?._id;
      if (!id) return;
      // Special case: admin wipe broadcasts { id: 'all' }
      if (id === 'all') {
        setProductsList([]);
        return;
      }
      setProductsList((prev) => prev.filter((x) => (x._id || x.id) !== id));
    }

    window.addEventListener('product-created', onCreated as any);
    window.addEventListener('product-updated', onUpdated as any);
    window.addEventListener('product-deleted', onDeleted as any);

    // Poll as a fallback every 10s
    timer = window.setInterval(load, 10000);
    return () => { active = false; if (timer) window.clearInterval(timer); window.removeEventListener('product-created', onCreated as any); window.removeEventListener('product-updated', onUpdated as any); window.removeEventListener('product-deleted', onDeleted as any); };
  }, []);

  // Load categories dynamically from the API. Use the in-repo shop-data as a safe fallback.
  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await apiFetch('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json().catch(() => ({}));
        if (active && Array.isArray(data.categories)) {
          setCategoriesList(data.categories.map((c:any) => ({ id: c.id || c._id, name: c.name, slug: c.slug, blurb: c.description || c.blurb || '', image: c.imageUrl || c.image || '', items: c.items || 0 })));
          return;
        }
      } catch (err) {
        // fallback to static categories already present in the bundle
        setCategoriesList(fallbackCategories || []);
      }
    }
    loadCategories();

    // Listen for realtime category events broadcast from the store layout SSE handler
    function onCatCreated(e: any) {
      const payload = e.detail || {};
      const cat = { id: payload.id || payload._id, name: payload.name, slug: payload.slug, blurb: payload.description || '', image: payload.imageUrl || '', items: payload.items || 0 };
      setCategoriesList((prev) => {
        // avoid duplicates
        if (prev.some((c) => c.id === cat.id || c.slug === cat.slug)) return prev;
        return [...prev, cat];
      });
    }
    function onCatUpdated(e: any) {
      const payload = e.detail || {};
      setCategoriesList((prev) => prev.map((c) => ((c.id === payload.id || c.slug === payload.slug) ? { ...c, name: payload.name || c.name, blurb: payload.description || c.blurb, image: payload.imageUrl || c.image, items: payload.items || c.items } : c)));
    }
    function onCatDeleted(e: any) {
      const payload = e.detail || {};
      const id = payload.id;
      if (!id) return;
      setCategoriesList((prev) => prev.filter((c) => c.id !== id && c.slug !== id));
    }

    window.addEventListener('category-created', onCatCreated as any);
    window.addEventListener('category-updated', onCatUpdated as any);
    window.addEventListener('category-deleted', onCatDeleted as any);

    return () => { active = false; window.removeEventListener('category-created', onCatCreated as any); window.removeEventListener('category-updated', onCatUpdated as any); window.removeEventListener('category-deleted', onCatDeleted as any); };
  }, []);

  // Helper: two-row horizontal carousel (each column shows 2 stacked cards)
  function TwoRowCarousel({ items }: { items: any[] }) {
    // group items into columns of 2
    const cols: any[] = [];
    for (let i = 0; i < items.length; i += 2) {
      cols.push([items[i], items[i+1]]);
    }
    return (
      <div className="-mx-4 mt-6 overflow-x-auto px-4">
        <div className="inline-flex gap-4">
          {cols.map((pair, idx) => (
            <div key={idx} className="w-64 shrink-0">
              <div className="flex flex-col gap-4">
                {pair[0] ? <ProductCard product={pair[0]} cta="Add to cart" /> : <div className="h-64" />}
                {pair[1] ? <ProductCard product={pair[1]} cta="Add to cart" /> : <div className="h-64" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Helper: horizontal simple carousel for themes
  function SimpleCarousel({ title, products, themeSlug }: { title: string; products: any[]; themeSlug?: string }) {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          {themeSlug && (
            <Link to={`/collections?theme=${encodeURIComponent(themeSlug)}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">View more →</Link>
          )}
        </div>
        <div className="-mx-4 mt-4 overflow-x-auto px-4">
          <div className="inline-flex gap-4">
            {products.slice(0, 10).map((p:any) => (
              <div key={p.id || p._id} className="w-64 shrink-0">
                <ProductCard product={p} cta="Add to cart" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // group products by theme
  const themesMap: Record<string, any[]> = {};
  productsList.forEach((p) => {
    const t = (p.theme || 'other') || 'other';
    themesMap[t] = themesMap[t] || [];
    themesMap[t].push(p);
  });

  // pick a small random selection for the first two-row horizontal area
  const shuffled = [...productsList].sort(() => 0.5 - Math.random()).slice(0, 12);

  return (
    <StoreLayout>
      <section
        className="hero-section relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="hero-content text-primary-foreground">
            <p className="text-xs font-semibold tracking-[0.28em] text-accent uppercase">
              Custom printing studio
            </p>
            <h1 className="mt-5 font-display text-4xl leading-[1.05] font-semibold sm:text-5xl lg:text-6xl">
              Your artwork, pressed onto things people keep.
            </h1>
            <p className="mt-5 max-w-lg text-sm opacity-85 sm:text-base">
              Apparel, drinkware, phone cases, stationery and corporate merchandise — printed in
              deep-pigment ink, packed with care, shipped fast.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <Link to="/categories">
                  Shop Prints Now <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-nude bg-transparent text-primary-foreground transition-all duration-300 hover:bg-primary-light hover:text-primary-foreground hover:scale-105"
              >
                <Link to="/templates">Explore Categories</Link>
              </Button>
            </div>
          </div>
          <div className="hero-image relative flex items-center justify-center">
            <img
              src={heroSrc}
              alt="Custom printed t-shirt, mug, phone case and notebook set in maroon and cream"
              width={1600}
              height={1200}
              className="w-full max-w-[700px] rounded-lg object-contain shadow-[var(--shadow-lift)] transition-transform duration-700 floating-image"
            />
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {trust.map((item, index) => (
            <div 
              key={item.title} 
              className="trust-item rounded-lg border border-border bg-nude p-5 transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:border-accent/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <item.icon className="h-6 w-6 text-accent transition-colors duration-300" />
              <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <SectionHead
            eyebrow="Categories"
            title="Shop by category"
            action={{ to: "/categories", label: "All categories" }}
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesList
              .filter((cat) => {
                // Only show categories that have at least one product in the live product list
                const count = productsList.filter((p) => {
                  const catName = (cat.name || '').toString();
                  return (p.category && (p.category === catName || p.category === cat.slug));
                }).length;
                return count > 0;
              })
              .map((cat, index) => {
                const count = productsList.filter((p) => {
                  const catName = (cat.name || '').toString();
                  return (p.category && (p.category === catName || p.category === cat.slug));
                }).length;

                return (
                  <Link
                    key={cat.slug}
                    to={`/categories?category=${encodeURIComponent(cat.slug || cat.name)}`}
                    className="group micro-fade-in overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-accent hover:shadow-[var(--shadow-lift)]"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="aspect-4/3 overflow-hidden bg-nude">
                      <img
                        src={cat.image || heroImage}
                        alt={`${cat.name} printing mockup`}
                        loading="lazy"
                        width={800}
                        height={800}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold transition-colors duration-300 group-hover:text-accent">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">{cat.blurb}</p>
                      <p className="mt-2 text-[11px] tracking-wide text-accent uppercase">
                        {count} product{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </section>

      {/* Two-row horizontal swipe area */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <SectionHead eyebrow="Featured" title="Curated picks" />
        <TwoRowCarousel items={shuffled} />
      </div>

      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div
          className="grid items-center gap-6 rounded-lg p-8 text-primary-foreground sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto]"
          style={{ backgroundImage: "var(--gradient-maroon)" }}
        >
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-accent uppercase">
              Bulk print offer
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Up to 30% OFF bulk print orders
            </h2>
            <p className="mt-3 max-w-xl text-sm opacity-85">
              Team merch, event kits and corporate packages. Tiered pricing applies automatically
              from 10 items upward.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link to="/offers">See Offer Tiers</Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {Object.keys(themesMap).filter(t => t && t !== 'other').map((t) => (
          <SimpleCarousel key={t} title={t.charAt(0).toUpperCase() + t.slice(1)} products={themesMap[t]} themeSlug={t} />
        ))}
      </div>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <SectionHead
            eyebrow="Most loved"
            title="Best sellers"
            action={{ to: "/categories", label: "Shop all prints" }}
          />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {productsList.slice(0, 5).map((p, index) => (
              <div key={p.id} className="product-card-animated w-64 mx-auto" style={{ animationDelay: `${index * 0.08}s` }}>
                <ProductCard product={p} cta="Customize" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </StoreLayout>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="hidden shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline sm:block"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}