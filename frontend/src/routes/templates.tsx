import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { templateCategories } from "@/lib/shop-data";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Custom Design Templates — OsanPrints" },
      {
        name: "description",
        content:
          "Start from an editable OsanPrints design template — birthday, corporate branding, typography, minimalist art and holiday artwork — or upload your own.",
      },
      { property: "og:title", content: "Custom Design Templates — OsanPrints" },
      {
        property: "og:description",
        content: "Editable print templates for t-shirts, mugs, cases and stationery.",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const [active, setActive] = useState("All");
  const [products, setProducts] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          "/api/products?productType=blank&customizable=1&limit=100&summary=1",
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok)
          setProducts(
            (data.products || []).filter(
              (p: any) => (p.status || "").toLowerCase() === "published",
            ),
          );
        else setProducts([]);
      } catch (err) {
        setProducts([]);
      }
    }
    load();
  }, []);

  const filtered = active === "All" ? products : products.filter((t) => t.category === active);

  const popular = products.slice(0, 8);

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="border-b border-border bg-nude">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:px-8">
          <p className="text-xs font-semibold tracking-[0.26em] text-primary uppercase">
            Print Shop
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl leading-tight font-semibold sm:text-5xl">
            Personalize Custom Apparel
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground">
            Personalize products, bring your own artwork, or design directly in the browser. Choose
            from blank T‑shirts, hoodies, tote bags and more — we print and ship the garments to
            you.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate({ to: "/categories", search: (q) => ({ ...q, q: "blank" }) })}
            >
              Browse All Blank Products
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                navigate({
                  to: "/configure",
                  search: (q) => ({ ...q, blank: "1", type: "t-shirt" }),
                })
              }
            >
              Start with a T‑Shirt
            </Button>
          </div>
        </div>
      </section>

      {/* Popular blanks */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h2 className="text-2xl font-semibold mb-4">Start with Popular Blanks</h2>
        {products.length === 0 ? (
          <div className="text-sm text-muted-foreground">No blank products available yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {popular.map((p) => {
              const id = p._id || p.id;
              const img = getOptimizedImageUrl(
                (p.images && p.images[0] && (p.images[0].url || p.images[0])) ||
                  p.image ||
                  "/placeholder-product.png",
              );
              return (
                <article
                  key={id}
                  className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-nude">
                    <img
                      src={img}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        onClick={() =>
                          navigate({ to: "/configure", search: (q) => ({ ...q, id }) })
                        }
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      From ${Number(p.price || p.basePrice || 0).toFixed(2)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Answers */}
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Answers</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">How long does it take to receive my order?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Typical turnaround is about 7 business days depending on your location and shipping
              method. Rush options may be available at checkout.
            </p>
          </article>

          <article className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">Will my colours match the screen?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We aim for accurate colours, but displays vary. For critical colour matching, request
              a printed sample or contact our support for color profiled workflows.
            </p>
          </article>

          <article className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">Which file formats should I upload?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              PNG (with transparency), JPEG, and SVG are preferred. For best results upload vector
              artwork or high-resolution images (300 DPI for the print area).
            </p>
          </article>

          <article className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">What is the minimum order?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You can order as few as one item. Bulk discounts are available for larger runs —
              contact sales for volume pricing.
            </p>
          </article>
        </div>
      </div>
    </StoreLayout>
  );
}
