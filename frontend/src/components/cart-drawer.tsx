import { Minus, Plus, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useCart, writeOrderSnapshot } from "@/lib/cart";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
import { formatPrice } from "@/lib/currency";
import { toast } from "sonner";

export function CartDrawer() {
  const formatEur = formatPrice;
  const { items, open, closeCart, removeItem, updateQuantity, clear, totalAmount } = useCart();
  const subtotal = totalAmount();
  const estimatedShipping = items.length && subtotal < 120 ? 8 : 0;
  const [promoCode, setPromoCode] = useState("");
  const [applying, setApplying] = useState(false);
  type Offer = { code?: string; amountOff?: number; subtotal?: number; newTotal?: number };
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const discountedSubtotal = appliedOffer
    ? Math.max(0, subtotal - (appliedOffer.amountOff || 0))
    : subtotal;
  const total = discountedSubtotal + estimatedShipping;

  useEffect(() => {
    // If cart contents change, clear any previously applied promo — require re-apply to validate against new cart
    setAppliedOffer(null);
    setPromoError(null);
  }, [items]);

  async function applyPromo(auto = false) {
    if (!promoCode || promoCode.trim().length === 0) {
      if (!auto) setPromoError("Enter a promo code");
      return;
    }
    setApplying(true);
    setPromoError(null);
    try {
      const res = await apiFetch("/api/offers/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: promoCode.trim(),
          items: items.map((it) => ({
            productId: it.productId || it.id || it.cartId || "",
            amount: it.price,
            quantity: it.quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setAppliedOffer(null);
        setPromoError(data?.error || "Invalid promo code");
        toast.error(data?.error || "Invalid promo code");
      } else {
        setAppliedOffer({
          ...data.offer,
          amountOff: data.amountOff,
          subtotal: data.subtotal,
          newTotal: data.newTotal,
        });
        setPromoError(null);
        toast.success(`Promo ${data.offer.code} applied`);
      }
    } catch (err) {
      console.error("Apply promo failed", err);
      setPromoError("Unable to validate promo code");
      setAppliedOffer(null);
      if (!auto) toast.error("Unable to validate promo code");
    } finally {
      setApplying(false);
    }
  }

  async function handleCheckout() {
    try {
      const customer = (() => {
        if (typeof window === "undefined") return "Guest customer";
        try {
          const current = window.localStorage.getItem("af_customer_current");
          return current ? JSON.parse(current).email || "Guest customer" : "Guest customer";
        } catch {
          return "Guest customer";
        }
      })();

      const orderSnapshot = {
        id: `AF-${Date.now()}`,
        customer,
        status: "Awaiting Print",
        payment: "Pending",
        createdAt: new Date().toISOString(),
        items: items.map((it) => `${it.name} x${it.quantity}`).join(", "),
        previewImage:
          items.find((it) => it.customization?.image)?.customization?.image || items[0]?.image,
        customization: items.map((it) => it.customization).filter(Boolean),
        productName: items.map((it) => it.name).join(", "),
      };
      writeOrderSnapshot(orderSnapshot);

      const origin = window.location.origin;
      let res: Response | null = null;
      try {
        res = await apiFetch("/api/payment/create-checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: items.map((it) => ({
              productId: it.productId || it.id || it.cartId || "",
              name: it.name,
              amount: it.price,
              quantity: it.quantity,
              currency: it.currency,
              customization: it.customization,
              size: it.size,
              color: it.color,
            })),
            promoCode: appliedOffer ? appliedOffer.code : promoCode || undefined,
            success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/categories`,
          }),
        });
      } catch (err) {
        console.error("Checkout request failed:", err);
        alert(
          "Unable to contact the backend to create a checkout session. Your order has been saved locally and can be reviewed in the admin orders fallback.\n\nProceeding with a simulated checkout redirect for now.",
        );
        // fallback: simulate a checkout session so user can continue in frontend-only mode
        window.location.href = `${origin}/order-success?session_id=SIMULATED-${Date.now()}`;
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : null;

      if (payload?.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }

      // If we get here, backend responded but didn't return a usable url. Fall back safely.
      console.warn("Unexpected checkout response", payload, res.status);
      alert(payload?.error || "Failed to create checkout session; order saved locally.");
      window.location.href = `${origin}/order-success?session_id=SIMULATED-${Date.now()}`;
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert(String(err));
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-foreground/30">
      <div className="flex-1" onClick={closeCart} />
      <aside className="flex h-full w-[440px] max-w-full flex-col border-l border-border bg-card shadow-[var(--shadow-lift)]">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold">Your Cart</h3>
              <p className="text-xs text-muted-foreground">
                {items.length} item{items.length === 1 ? "" : "s"} ready for checkout
              </p>
            </div>
            <Button variant="ghost" onClick={closeCart} size="icon" aria-label="Close cart">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-nude/50 p-8 text-center">
              <p className="font-semibold">Your cart is empty.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a product or customize a blank item to begin.
              </p>
            </div>
          )}

          {items.map((it) => (
            <div key={it.cartId} className="mb-3 rounded-lg border border-border bg-background p-3">
              <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-3">
                {it.image && (
                  <img
                    src={getOptimizedImageUrl(it.image)}
                    alt={it.name}
                    className="h-[72px] w-[72px] rounded-md object-cover"
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{it.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatEur(it.price)} each
                  </div>
                  {it.customization && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {it.customization.color && (
                        <span className="rounded-sm bg-nude px-2 py-0.5 text-[11px]">
                          Color: {it.customization.color}
                        </span>
                      )}
                      {it.customization.size && (
                        <span className="rounded-sm bg-nude px-2 py-0.5 text-[11px]">
                          Size: {it.customization.size}
                        </span>
                      )}
                      {it.customization.text && (
                        <span className="rounded-sm bg-nude px-2 py-0.5 text-[11px]">
                          Text: {it.customization.text}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(it.cartId)}
                  aria-label={`Remove ${it.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex h-9 items-center rounded-md border border-border bg-card">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(it.cartId, it.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-9 text-center text-sm font-semibold">{it.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateQuantity(it.cartId, it.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="font-semibold">{formatEur(it.price * it.quantity)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-nude/50 p-5">
          <div className="grid gap-3 text-sm">
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo / Offer Code"
                className="flex-1 rounded border p-2"
              />
              <Button onClick={applyPromo} disabled={applying || items.length === 0}>
                {applying ? "Applying…" : "Apply"}
              </Button>
            </div>
            {promoError && <div className="text-xs text-destructive">{promoError}</div>}
            {appliedOffer && (
              <div className="rounded-md border border-border bg-nude p-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{appliedOffer.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {appliedOffer.discountPercent}% off — min {appliedOffer.minimumQty || 0} items
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setAppliedOffer(null);
                      setPromoCode("");
                    }}
                    aria-label="Remove promo"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatEur(subtotal)}</span>
            </div>

            {appliedOffer && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount ({appliedOffer.discountPercent}%)</span>
                <span>-{formatEur(appliedOffer.amountOff || 0)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated shipping</span>
              <span>{estimatedShipping ? formatEur(estimatedShipping) : "Free"}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatEur(total)}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <Button onClick={handleCheckout} disabled={items.length === 0} size="lg">
              Proceed to Checkout
            </Button>
            <Button variant="outline" onClick={clear} disabled={items.length === 0}>
              Clear cart
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
