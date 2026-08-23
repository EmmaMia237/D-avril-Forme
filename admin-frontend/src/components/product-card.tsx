import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import type { Product } from "@/lib/shop-data";
import { useCart } from "@/lib/cart";

export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={
              i <= Math.round(rating)
                ? "h-3.5 w-3.5 fill-accent text-accent"
                : "h-3.5 w-3.5 text-nude-deep"
            }
          />
        ))}
      </span>
      <span>
        {rating.toFixed(1)}
        {reviews ? ` (${reviews})` : ""}
      </span>
    </div>
  );
}

export function ProductCard({ product, cta = "Add to Cart" }: { product: Product; cta?: string }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-square overflow-hidden bg-nude">
        <img
          src={product.image}
          alt={`${product.name} print mockup`}
          loading="lazy"
          width={800}
          height={800}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.badge && (
          <span className="absolute top-3 left-3 rounded-sm bg-accent px-2 py-1 text-[11px] font-bold tracking-wide text-accent-foreground uppercase">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
          {product.category}
        </p>
        <h3 className="text-base leading-snug font-semibold">{product.name}</h3>
        <Stars rating={product.rating} reviews={product.reviews} />
        <p className="text-xs text-muted-foreground">{product.options}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-xl font-semibold text-primary">${product.price}</span>
          <Button size="sm" onClick={() => {
            if (cta.toLowerCase().includes('configure')) {
              // Debug log to verify handler runs
              try {
                console.log('ProductCard: configure click for', product.id);
              } catch (err) {
                /* ignore */
              }

              let navigated = false;

              try {
                // Attempt client-side router navigation
                navigate({ to: '/configure', search: { id: product.id, color: product.colors?.[0] ?? '' } });
                navigated = true;
              } catch (e) {
                // ignore, fallbacks below
              }

              // If router navigation didn't update the URL within a short time, fallback
              // to history API and finally full navigation.
              setTimeout(() => {
                try {
                  const params = new URLSearchParams(window.location.search);
                  if (params.get('id') !== product.id || window.location.pathname !== '/configure') {
                    try {
                      window.history.pushState(null, '', `/configure?id=${encodeURIComponent(product.id)}&color=${encodeURIComponent(product.colors?.[0] ?? '')}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                      navigated = true;
                    } catch (e) {
                      window.location.href = `/configure?id=${encodeURIComponent(product.id)}&color=${encodeURIComponent(product.colors?.[0] ?? '')}`;
                      navigated = true;
                    }
                  }
                } catch (e) {
                  // last resort
                  try {
                    window.location.href = `/configure?id=${encodeURIComponent(product.id)}&color=${encodeURIComponent(product.colors?.[0] ?? '')}`;
                    navigated = true;
                  } catch (err) {
                    /* ignore */
                  }
                }
              }, 120);

              return;
            }

            addItem(product);
          }}>{cta}</Button>
        </div>
      </div>
    </article>
  );
}
