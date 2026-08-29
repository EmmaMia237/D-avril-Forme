import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import type { Product } from "@/lib/shop-data";
import { useCart } from "@/lib/cart";

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

export function ProductCard({ product, cta = "Add to Cart" }: { product: Product; cta?: string }) {
  const formatEur = (v: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(v);
  const { addItem, closeCart } = useCart();
  const navigate = useNavigate();

  const imageSrc =
    (product.images && product.images[0]?.url) ||
    product.image ||
    (product.previewPaths && product.previewPaths[0]) ||
    "";
  const shortDescription = product.description
    ? String(product.description).slice(0, 80) +
      (String(product.description).length > 80 ? "…" : "")
    : product.options || "";

  return (
    <article className="group flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative h-40 w-full overflow-hidden bg-nude">
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
      <div className="flex flex-1 flex-col gap-1 p-4 min-h-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
          {product.category}
        </p>
        <h3 className="text-base leading-snug font-semibold">{product.name}</h3>
        <Stars rating={product.rating ?? 0} reviews={product.reviews ?? 0} />
        <p className="text-sm text-muted-foreground">{shortDescription}</p>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex-1">
            <span className="font-display text-xl font-semibold text-primary">
              {formatEur(Number(product.price || 0))}
            </span>
          </div>

          <div className="flex gap-2">
            {/* Show Configure only for configurable products */}
            {product.configurable === true ||
            product.productType === "blank" ||
            product.customizable === true ? (
              <Button
                size="sm"
                variant="outline"
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Go to product detail page
                  const pid = product.id || product._id;
                  if (!pid) {
                    try {
                      toast.error("Product details not available");
                    } catch (e) {
                      /* ignore */
                    }
                    return;
                  }
                  // Always navigate using path-based canonical URL
                  try {
                    navigate({ to: `/product/${encodeURIComponent(String(pid))}` });
                  } catch (e) {
                    window.location.href = `/product/${encodeURIComponent(String(pid))}`;
                  }
                }}
              >
                Details
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => {
                // Add to cart in background and show quick feedback; keep user on page and avoid auto-opening cart drawer
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
              {cta || "Add to cart"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
