import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/custom-templates")({
  head: () => ({
    meta: [
      { title: "Custom Templates — D'avril Forme" },
      { name: "description", content: "Choose a product to customize in our Web-to-Print studio." },
    ],
  }),
  component: CustomTemplatesPage,
});

const TABS = [
  { id: "all", label: "All" },
  { id: "apparel", label: "Apparel" },
  { id: "stationery", label: "Stationery / Flyers" },
  { id: "accessories", label: "Accessories" },
];

function CustomTemplatesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Fetch active/customizable products for use in configurator
        const res = await fetch("/api/products?active=true&customizable=1&limit=200");
        const data = await res.json().catch(() => ({}));
        let list = [] as any[];
        if (res.ok) {
          // api may return { products: [...] } or an array
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data.products)) list = data.products;
        }
        if (mounted)
          setProducts(
            list.filter((p) => (p.status || "").toLowerCase() === "published" || p.active === true),
          );
      } catch (err) {
        console.error("Failed to load products", err);
        if (mounted) setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  function filterProducts() {
    if (activeTab === "all") return products;
    const key = activeTab;
    return products.filter((p) => {
      const cats = ((p.categories || []) as string[]).map((s) => String(s).toLowerCase()).join(" ");
      const tags = ((p.tags || []) as string[]).map((s) => String(s).toLowerCase()).join(" ");
      return cats.includes(key) || tags.includes(key) || (p.type || "").toLowerCase().includes(key);
    });
  }

  const visible = filterProducts();

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Customize a Product</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a base product and start designing in our Web-to-Print studio.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <nav className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-border/30 text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading products…</div>
        ) : visible.length === 0 ? (
          <div className="text-gray-500">No products found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visible.map((p) => {
              const id = p._id || p.id;
              const img =
                (p.images && p.images[0] && (p.images[0].url || p.images[0])) ||
                p.image ||
                "/placeholder-product.png";
              const basePrice =
                p.price || p.basePrice || (p.variants && p.variants[0] && p.variants[0].price) || 0;
              const colors =
                p.colors || (p.variants || []).map((v: any) => v.color).filter(Boolean) || [];

              return (
                <article
                  key={id}
                  className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm flex flex-col"
                >
                  <div className="relative aspect-4/3 overflow-hidden bg-nude">
                    <img
                      src={img}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-3 bg-primary/70 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        onClick={() => {
                          try {
                            navigate({ to: `/configure/${encodeURIComponent(id)}` });
                          } catch (e) {
                            window.location.href = `/configure/${encodeURIComponent(id)}`;
                          }
                        }}
                      >
                        Customize This Product
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          From ${Number(basePrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {colors.slice(0, 6).map((c: any, idx: number) => {
                        const hex = typeof c === "string" ? c : c.hex || c.color || "#eee";
                        return (
                          <span
                            key={idx}
                            title={String(hex)}
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: hex }}
                          />
                        );
                      })}
                      {colors.length > 6 && (
                        <span className="text-xs text-muted-foreground">+{colors.length - 6}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
