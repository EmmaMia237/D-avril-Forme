import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import type { Product } from "@/lib/shop-data";
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
  const productId = String(product.id || product._id || "");

  useEffect(() => {
    if (!productId || !window.localStorage.getItem("af_auth_token")) return;
    let active = true;
    apiFetch("/api/favorites")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.productIds))
          setLiked(data.productIds.includes(productId));
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
      const response = await apiFetch(`/api/favorites/${encodeURIComponent(productId)}`, {
        method: "POST",
      });
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

  const openProductDetails = () => {
    const pid = product.id || product._id;
    if (!pid) {
      toast.error("Product details not available");
      return;
    }
    try {
      if (isConfigurable) {
        navigate({ to: "/configure", search: { id: String(pid) } });
      } else {
        navigate({ to: `/product/${encodeURIComponent(String(pid))}` });
      }
    } catch (error) {
      window.location.href = isConfigurable
        ? `/configure?id=${encodeURIComponent(String(pid))}`
        : `/product/${encodeURIComponent(String(pid))}`;
    }
  };

  return (
    <article
      className="group flex min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={openProductDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProductDetails();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`${isConfigurable ? "Configure" : "View details for"} ${product.name}`}
    >
      <div className="relative h-32 w-full overflow-hidden bg-nude sm:h-40">
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite();
          }}
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
        {isConfigurable && (
          <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold tracking-wide text-primary uppercase shadow-sm">
            Configure
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
        <h3 className="text-base leading-snug font-semibold">{product.name}</h3>
        <div className="flex min-w-0 items-center justify-between gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <span className="font-display text-xl font-semibold text-primary">
              {formatEur(Number(product.price || 0))}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
