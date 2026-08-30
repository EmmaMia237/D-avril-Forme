import { createFileRoute, useSearch } from "@tanstack/react-router";
import { StoreLayout } from "@/components/store-layout";
import { ProductCard } from "@/components/product-card";
import { templates, templateCategories } from "@/lib/shop-data";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — OsanPrints" },
      { property: "og:title", content: "Collections — OsanPrints" },
    ],
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const search = useSearch({ from: "/collections" });
  const theme = (search as any)?.theme || null;
  const [productsList, setProductsList] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const q = theme ? `?theme=${encodeURIComponent(theme)}` : "";
        const res = await apiFetch(`/api/products${q}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && active)
          setProductsList((data.products || []).map((p: any) => ({ ...p, id: p.id || p._id })));
      } catch (e) {
        // ignore
      }
    }
    load();

    // Realtime updates from SSE via StoreLayout dispatching DOM events
    function onCreated(e: any) {
      const p = e.detail;
      if (!p) return;
      const id = p._id || p.id;
      const belongs = (p.theme || "").toLowerCase() === (theme || "").toLowerCase();
      if (!belongs) return;
      setProductsList((prev) => {
        if (prev.some((x) => (x._id || x.id) === id)) return prev;
        return [...prev, { ...p, id }];
      });
    }

    function onUpdated(e: any) {
      const p = e.detail;
      if (!p) return;
      const id = p._id || p.id;
      const belongs = (p.theme || "").toLowerCase() === (theme || "").toLowerCase();
      setProductsList((prev) => {
        if (!belongs) {
          // if previously present but no longer belongs, remove it
          return prev.filter((x) => (x._id || x.id) !== id);
        }
        if (prev.some((x) => (x._id || x.id) === id))
          return prev.map((x) => ((x._id || x.id) === id ? { ...x, ...p, id } : x));
        return [...prev, { ...p, id }];
      });
    }

    function onDeleted(e: any) {
      const payload = e.detail || {};
      const id = payload?.id || payload?._id;
      if (!id) return;
      if (id === "all") {
        setProductsList([]);
        return;
      }
      setProductsList((prev) => prev.filter((x) => (x._id || x.id) !== id));
    }

    window.addEventListener("product-created", onCreated as any);
    window.addEventListener("product-updated", onUpdated as any);
    window.addEventListener("product-deleted", onDeleted as any);

    return () => {
      active = false;
      window.removeEventListener("product-created", onCreated as any);
      window.removeEventListener("product-updated", onUpdated as any);
      window.removeEventListener("product-deleted", onDeleted as any);
    };
  }, [theme]);

  const themeMap: Record<string, string> = {
    kids: "Kids Collection",
    halloween: "Halloween Collection",
    autumn: "Fall / Autumn Collection",
    anime: "Anime Collection",
  };

  const filtered = theme ? productsList : productsList;

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">
          {theme ? themeMap[theme] || "Theme" : "Collections & Themes"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {theme
            ? `Products assigned to the ${themeMap[theme] || theme} theme.`
            : "Browse curated collections and seasonal themes."}
        </p>

        {!theme && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Kids Collection", slug: "kids" },
              { name: "Halloween Collection", slug: "halloween" },
              { name: "Fall / Autumn Collection", slug: "autumn" },
              { name: "Anime Collection", slug: "anime" },
            ].map((c) => (
              <Link
                key={c.slug}
                to="/collections"
                search={{ theme: c.slug }}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-[var(--shadow-lift)]"
              >
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Explore {c.name} themed products.
                </p>
              </Link>
            ))}
          </div>
        )}

        {theme && (
          <div className="mt-8">
            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No products assigned to this theme yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} cta="Customize" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
