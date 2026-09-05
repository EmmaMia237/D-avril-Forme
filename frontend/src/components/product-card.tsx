import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import type { Product } from "@/lib/shop-data";
import { useCart } from "@/lib/cart";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
import { apiFetch } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  const r = Math.max(0, Math.min(5, Number(rating || 0)));
  return (
    <div className="flex items-center gap-2">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={
              i <= Math.round(r)
                ? "h-4 w-4 fill-current text-yellow-400"
                : "h-4 w-4 text-muted-foreground"
            }
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">
        {r.toFixed(1)}
        {reviews ? ` (${reviews})` : ""}
      </span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const formatEur = formatPrice;
  const { addItem, closeCart } = useCart();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const isConfigurable = product.productType === "blank";

  const imageSrc = getOptimizedImageUrl(
    (product.images && product.images[0]?.url) ||
      product.image ||
      (product.previewPaths && product.previewPaths[0]) ||
      "",
  );
  const shortDescription = product.description
    ? String(product.description).slice(0, 80) +
      (String(product.description).length > 80 ? "…" : "")
    : product.options || "";

  const productId = String(product.id || product._id || "");

  useEffect(() => {
    if (!productId || !window.localStorage.getItem("af_auth_token")) return;
    let active = true;
    apiFetch("/api/favorites")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.productIds)) setLiked(data.productIds.includes(productId));
      })
      .catch((error) => console.error("Failed to load favorite state", error));
    return () => {
      active = false;
    };
  }, [productId]);

  async function toggleFavorite() {
    if (!productId) return;
    if (!window.localStorage.getItem("af_auth_token")) {
      toast("Log in to save favorites");
      navigate({ to: "/auth" });
      return;
    }
    if (favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const response = await apiFetch(`/api/favorites/${encodeURIComponent(productId)}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "Unable to update wishlist");
        return;
      }
      setLiked(Boolean(data.favorited));
      toast.success(data.favorited ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      console.error("Failed to update favorite", error);
      toast.error("Unable to update wishlist");
    } finally {
      setFavoriteLoading(false);
    }
  }

  return (
    <article className="group flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] active:translate-y-0">
      <div className="relative h-40 w-full overflow-hidden bg-nude">
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          onClick={toggleFavorite}
          disabled={favoriteLoading}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/90 p-2 text-primary shadow-sm transition hover:bg-background"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
        </button>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        {product.badge && (
          <span className="absolute top-3 left-3 rounded-sm bg-accent px-2 py-1 text-[11px] font-bold tracking-wide text-accent-foreground uppercase">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
          {product.category}
        </p>
        <h3 className="text-base leading-snug font-semibold">{product.name}</h3>
        <Stars rating={product.rating ?? 0} reviews={product.reviewCount ?? product.reviews ?? 0} />
        <p className="text-sm text-muted-foreground">{shortDescription}</p>

        <div className="flex min-w-0 items-center justify-between gap-3 pt-2">
          <div className="min-w-0 flex-1">
            <span className="font-display text-xl font-semibold text-primary">
              {formatEur(Number(product.price || 0))}
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {isConfigurable ? (
              <Button
                size="sm"
                variant="outline"
                className="min-w-0"
                onClick={() => {
                  const pid = product.id || product._id;
                  if (!pid) {
                    try {
                      toast.error("Product details not available");
                    } catch (e) {
                      /* ignore */
                    }
                    return;
                  }
                  try {
                    navigate({ to: "/configure", search: { id: pid } });
                  } catch (e) {
                    window.location.href = `/configure?id=${encodeURIComponent(pid)}`;
                  }
                }}
              >
                Configure
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-0"
                  onClick={() => {
                    const pid = product.id || product._id;
                    if (!pid) {
                      try {
                        toast.error("Product details not available");
                      } catch (e) {
                        /* ignore */
                      }
                      return;
                    }
                    try {
                      navigate({ to: `/product/${encodeURIComponent(String(pid))}` });
                    } catch (e) {
                      window.location.href = `/product/${encodeURIComponent(String(pid))}`;
                    }
                  }}
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  className="min-w-0"
                  onClick={() => {
                    addItem(product);
                    try {
                      closeCart();
                    } catch (e) {
                      /* ignore */
                    }
                    try {
                      toast.success("Added to cart");
                    } catch (e) {
                      /* ignore */
                    }
                  }}
                >
                  Add to Cart
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
