import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { BadgeCheck, Boxes, Truck, UploadCloud, ArrowRight } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { categories as fallbackCategories } from "@/lib/shop-data";
const heroImage = "/images/hero-image.png";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OsanPrints — Custom Printing for Apparel, Mugs & Merch" },
      {
        name: "description",
        content:
          "OsanPrints prints custom t-shirts, mugs, phone cases, stationery and corporate merch. Single items or bulk runs with fast shipping.",
      },
      { property: "og:title", content: "OsanPrints — Custom Printing Studio" },
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
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, -28]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>(fallbackCategories || []);
  // Prefer the user-supplied public hero image so it replaces the bundled mockups immediately
  const [heroSrc, setHeroSrc] = useState<string>("/images/hero-image.png");

  useEffect(() => {
    let active = true;
    let timer: any = null;
    async function load() {
      try {
        const res = await apiFetch("/api/products");
        const data = await res.json().catch(() => ({}));
        if (res.ok && active)
          setProductsList((data.products || []).map((p: any) => ({ ...p, id: p.id || p._id })));
      } catch (e) {
        // ignore
      }
    }
    load();

    // Try to prefer a public hero image if available (admin may have uploaded new hero-image.png)
    (async function pickHero() {
      try {
        const r = await fetch("/images/hero-image.png", { method: "HEAD" });
        if (r && r.ok) setHeroSrc("/images/hero-image.png");
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
      if (id === "all") {
        setProductsList([]);
        return;
      }
      setProductsList((prev) => prev.filter((x) => (x._id || x.id) !== id));
    }

    window.addEventListener("product-created", onCreated as any);
    window.addEventListener("product-updated", onUpdated as any);
    window.addEventListener("product-deleted", onDeleted as any);

    // Poll as a fallback every 10s
    timer = window.setInterval(load, 10000);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("product-created", onCreated as any);
      window.removeEventListener("product-updated", onUpdated as any);
      window.removeEventListener("product-deleted", onDeleted as any);
    };
  }, []);

  // Load categories dynamically from the API. Use the in-repo shop-data as a safe fallback.
  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await apiFetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json().catch(() => ({}));
        if (active && Array.isArray(data.categories)) {
          setCategoriesList(
            data.categories.map((c: any) => ({
              id: c.id || c._id,
              name: c.name,
              slug: c.slug,
              blurb: c.description || c.blurb || "",
              image: c.imageUrl || c.image || "",
              items: c.items || 0,
            })),
          );
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
      const cat = {
        id: payload.id || payload._id,
        name: payload.name,
        slug: payload.slug,
        blurb: payload.description || "",
        image: payload.imageUrl || "",
        items: payload.items || 0,
      };
      setCategoriesList((prev) => {
        // avoid duplicates
        if (prev.some((c) => c.id === cat.id || c.slug === cat.slug)) return prev;
        return [...prev, cat];
      });
    }
    function onCatUpdated(e: any) {
      const payload = e.detail || {};
      setCategoriesList((prev) =>
        prev.map((c) =>
          c.id === payload.id || c.slug === payload.slug
            ? {
                ...c,
                name: payload.name || c.name,
                blurb: payload.description || c.blurb,
                image: payload.imageUrl || c.image,
                items: payload.items || c.items,
              }
            : c,
        ),
      );
    }
    function onCatDeleted(e: any) {
      const payload = e.detail || {};
      const id = payload.id;
      if (!id) return;
      setCategoriesList((prev) => prev.filter((c) => c.id !== id && c.slug !== id));
    }

    window.addEventListener("category-created", onCatCreated as any);
    window.addEventListener("category-updated", onCatUpdated as any);
    window.addEventListener("category-deleted", onCatDeleted as any);

    return () => {
      active = false;
      window.removeEventListener("category-created", onCatCreated as any);
      window.removeEventListener("category-updated", onCatUpdated as any);
      window.removeEventListener("category-deleted", onCatDeleted as any);
    };
  }, []);

  // Helper: two-row horizontal carousel (each column shows 2 stacked cards)
  function TwoRowCarousel({ items }: { items: any[] }) {
    // group items into columns of 2
    const cols: any[] = [];
    for (let i = 0; i < items.length; i += 2) {
      cols.push([items[i], items[i + 1]]);
    }
    return (
      <div className="-mx-4 mt-6 overflow-x-auto px-4">
        <div className="inline-flex gap-4">
          {cols.map((pair, idx) => (
            <div key={idx} className="w-64 shrink-0">
              <div className="flex flex-col gap-4">
                {pair[0] ? (
                  <ProductCard product={pair[0]} cta="Add to cart" />
                ) : (
                  <div className="h-64" />
                )}
                {pair[1] ? (
                  <ProductCard product={pair[1]} cta="Add to cart" />
                ) : (
                  <div className="h-64" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Helper: horizontal simple carousel for themes
  function SimpleCarousel({
    title,
    products,
    themeSlug,
  }: {
    title: string;
    products: any[];
    themeSlug?: string;
  }) {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          {themeSlug && (
            <Link
              to={`/collections?theme=${encodeURIComponent(themeSlug)}`}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View more →
            </Link>
          )}
        </div>
        <div className="-mx-4 mt-4 overflow-x-auto px-4">
          <div className="inline-flex gap-4">
            {products.slice(0, 10).map((p: any) => (
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
    const t = p.theme || "other";
    themesMap[t] = themesMap[t] || [];
    themesMap[t].push(p);
  });

  // pick a small random selection for the first two-row horizontal area
  const shuffled = [...productsList].sort(() => 0.5 - Math.random()).slice(0, 12);

  return (
    <StoreLayout>
      <motion.section
        className="hero-section relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero)" }}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl" />
          <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[#c9a76b]/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#1a1613]/10 to-transparent" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:px-8 lg:py-20 min-h-[560px]">
          <motion.div
            className="hero-content text-primary-foreground"
            initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
            whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
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
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.02 }} whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  <Link to="/categories">
                    Shop Prints Now <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={prefersReducedMotion ? {} : { scale: 1.02 }} whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-nude bg-transparent text-primary-foreground transition-all duration-300 hover:bg-primary-light hover:text-primary-foreground hover:scale-105"
                >
                  <Link to="/templates">Explore Categories</Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
          <motion.div
            className="hero-image relative z-10 order-first flex items-center justify-center lg:order-none lg:-mr-8"
            initial={prefersReducedMotion ? false : { opacity: 0, x: 20 }}
            whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ y: heroParallaxY }}
          >
            <div className="relative w-full max-w-[1100px]">
              <div className="absolute inset-x-8 inset-y-6 rounded-[2rem] border border-white/15 bg-white/5 shadow-[0_30px_80px_rgba(26,22,19,0.18)] backdrop-blur-[1px]" />
              <img
                src={heroSrc}
                alt="Hero artwork"
                width={1600}
                height={1200}
                className="relative z-10 mx-auto w-full max-w-[1100px] rounded-[1.5rem] object-contain transition-transform duration-700 floating-image"
                style={{ mixBlendMode: "normal" }}
              />
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="bg-background"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {trust.map((item, index) => (
            <motion.div
              key={item.title}
              className={`trust-item flex items-start gap-3 rounded-2xl p-3 transition-all duration-300 sm:p-4 ${index % 2 === 1 ? "sm:mt-6" : ""}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nude text-accent shadow-[inset_0_0_0_1px_rgba(122,36,54,0.08)]">
                <item.icon className="h-5 w-5 transition-colors duration-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold leading-snug">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="bg-nude/60"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <SectionHead
            eyebrow="Categories"
            title="Shop by category"
            action={{ to: "/categories", label: "All categories" }}
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesList
              .filter((cat) => {
                const count = productsList.filter((p) => {
                  const catName = (cat.name || "").toString();
                  return p.category && (p.category === catName || p.category === cat.slug);
                }).length;
                return count > 0;
              })
              .map((cat, index) => {
                const featured = index % 4 === 0 || index % 4 === 2;
                const count = productsList.filter((p) => {
                  const catName = (cat.name || "").toString();
                  return p.category && (p.category === catName || p.category === cat.slug);
                }).length;

                const representative = productsList.find((p) => {
                  const catName = (cat.name || "").toString();
                  return p.category && (p.category === catName || p.category === cat.slug);
                });
                const imgSrc = getOptimizedImageUrl(
                  (representative &&
                    ((representative.images && representative.images[0]?.url) ||
                      representative.image ||
                      (representative.previewPaths && representative.previewPaths[0]))) ||
                    cat.image ||
                    heroImage,
                );

                return (
                  <motion.div
                    key={cat.slug}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
                    whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.42, delay: index * 0.06, ease: "easeOut" }}
                  >
                    <Link
                      to={`/categories?category=${encodeURIComponent(cat.slug || cat.name)}`}
                      className={`group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[var(--shadow-lift)] ${featured ? "lg:col-span-2" : ""}`}
                    >
                      <div className={`overflow-hidden bg-nude ${featured ? "aspect-[1.4/1]" : "aspect-4/3"}`}>
                        <img
                          src={imgSrc}
                          alt={`${cat.name} printing mockup`}
                          loading="lazy"
                          width={800}
                          height={800}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-semibold transition-colors duration-300 group-hover:text-accent">
                          {cat.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{cat.blurb}</p>
                        <p className="mt-2 text-[11px] tracking-wide text-accent uppercase">
                          {count} product{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </motion.section>

      {/* Two-row horizontal swipe area */}
      <motion.div
        className="mx-auto max-w-7xl px-4 py-8 lg:px-8"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <SectionHead eyebrow="Featured" title="Curated picks" />
        <TwoRowCarousel items={shuffled} />
      </motion.div>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-14 lg:px-8"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div
          className="relative overflow-hidden rounded-[1.75rem] p-8 text-primary-foreground sm:p-12"
          style={{ backgroundImage: "var(--gradient-maroon)" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%,rgba(255,255,255,0.04))]" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/15 bg-white/5" />
          <div className="absolute bottom-0 right-0 h-32 w-32 rotate-12 border-l border-t border-white/10 bg-white/5" />
          <div className="relative grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
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
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              animate={prefersReducedMotion ? {} : { boxShadow: ["0 0 0 rgba(255,255,255,0)", "0 0 18px rgba(255,255,255,0.12)", "0 0 0 rgba(255,255,255,0)"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Button asChild size="lg" variant="secondary" className="relative overflow-hidden">
                <Link to="/offers">See Offer Tiers</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {Object.keys(themesMap)
          .filter((t) => t && t !== "other")
          .map((t, idx) => (
            <motion.div
              key={t}
              className={idx % 2 === 0 ? "rounded-[1.5rem] bg-background/80 py-2" : "rounded-[1.5rem] bg-nude/40 py-2"}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <SimpleCarousel
                title={t.charAt(0).toUpperCase() + t.slice(1)}
                products={themesMap[t]}
                themeSlug={t}
              />
            </motion.div>
          ))}
      </div>

      <motion.section
        className="bg-nude/60"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <SectionHead
            eyebrow="Most loved"
            title="Best sellers"
            action={{ to: "/categories", label: "Shop all prints" }}
          />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {productsList.slice(0, 5).map((p, index) => (
              <motion.div
                key={p.id}
                className="mx-auto w-full max-w-[220px] sm:max-w-none"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.38, delay: index * 0.08, ease: "easeOut" }}
              >
                <ProductCard product={p} cta="Customize" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
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
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
    >
      <div className="min-w-0">
        <motion.p
          className="text-xs font-semibold tracking-[0.24em] text-primary uppercase"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {eyebrow}
        </motion.p>
        <motion.h2
          className="mt-2 font-display text-3xl font-semibold sm:text-4xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.4, delay: 0.04, ease: "easeOut" }}
        >
          {title}
        </motion.h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="hidden shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline sm:block"
        >
          {action.label}
        </Link>
      )}
    </motion.div>
  );
}
