import { createFileRoute, useSearch } from "@tanstack/react-router";
import { StoreLayout } from "@/components/store-layout";
import { ProductCard } from "@/components/product-card";
import { normalizeThemeSlug, themes } from "@/lib/shop-data";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

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
  const requestedTheme = String((search as any)?.theme || "").trim();
  const theme = requestedTheme ? normalizeThemeSlug(requestedTheme) : "";
  const themeDefinition = themes.find((entry) => entry.slug === theme);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  const overviewThemes = useMemo(
    () =>
      themes
        .map((themeDefinition) => {
          const themeProducts = productsList.filter(
            (product) => normalizeThemeSlug(product.theme) === themeDefinition.slug,
          );
          const productWithImage = themeProducts.find((product) => {
            const image =
              product.images?.[0]?.url || product.image || product.previewPaths?.[0];
            return typeof image === "string" && image.trim().length > 0;
          });
          const image =
            productWithImage?.images?.[0]?.url ||
            productWithImage?.image ||
            productWithImage?.previewPaths?.[0] ||
            "";

          return {
            ...themeDefinition,
            count: themeProducts.length,
            image: image ? getOptimizedImageUrl(image) : "",
          };
        })
        .filter((themeDefinition) => themeDefinition.count > 0 && themeDefinition.image),
    [productsList],
  );

  useEffect(() => {
    if (requestedTheme && !themeDefinition) {
      setProductsList([]);
      setLoading(false);
      setError("");
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const q = theme ? `?theme=${encodeURIComponent(theme)}` : "";
        const res = await apiFetch(`/api/products${q}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Unable to load this collection.");
        if (active) {
          setProductsList((data.products || []).map((p: any) => ({ ...p, id: p.id || p._id })));
          setLoading(false);
        }
      } catch (e) {
        if (active) {
          setProductsList([]);
          setError("We couldn't load this collection. Please try again.");
          setLoading(false);
        }
      }
    }
    load();

    // Realtime updates from SSE via StoreLayout dispatching DOM events
    function onCreated(e: any) {
      const p = e.detail;
      if (!p) return;
      const id = p._id || p.id;
      const belongs = !theme || normalizeThemeSlug(p.theme) === theme;
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
      const belongs = !theme || normalizeThemeSlug(p.theme) === theme;
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
  }, [requestedTheme, theme, themeDefinition, retryToken]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">
          {themeDefinition ? themeDefinition.name : requestedTheme ? "Theme not found" : "Collections & Themes"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {themeDefinition
            ? themeDefinition.description
            : requestedTheme
              ? "The requested theme is not available."
            : "Browse curated collections and seasonal themes."}
        </p>

        {requestedTheme && !themeDefinition && (
          <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Choose one of the available themes to browse its products.</p>
            <Link to="/collections" className="mt-4 inline-block text-sm font-semibold text-primary underline">
              View all collections
            </Link>
          </div>
        )}

        {!requestedTheme && (
          <div className="mt-8">
            {loading ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Loading collections...
              </p>
            ) : error ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => setRetryToken((value) => value + 1)}
                  className="mt-3 font-semibold text-primary underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {overviewThemes.map((themeCard) => (
                  <Link
                    key={themeCard.slug}
                    to="/collections"
                    search={{ theme: themeCard.slug }}
                    className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[var(--shadow-lift)]"
                  >
                    <div className="aspect-[1.4/1] overflow-hidden bg-nude">
                      <img
                        src={themeCard.image}
                        alt={`${themeCard.name} product`}
                        loading="lazy"
                        width={800}
                        height={800}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <h2 className="text-sm font-semibold transition-colors duration-300 group-hover:text-accent">
                        {themeCard.name}
                      </h2>
                      <p className="mt-2 text-[11px] tracking-wide text-accent uppercase">
                        {themeCard.count} product{themeCard.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {themeDefinition && (
          <div className="mt-8">
            {loading ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                Loading products...
              </p>
            ) : error ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <p>{error}</p>
                <button type="button" onClick={() => setRetryToken((value) => value + 1)} className="mt-3 font-semibold text-primary underline">
                  Try again
                </button>
              </div>
            ) : productsList.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                No products assigned to this theme yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {productsList.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
