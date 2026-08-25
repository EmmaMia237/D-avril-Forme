import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/product")({
  head: () => ({ meta: [{ title: "Product — Avril Forme" }] }),
  component: ProductPage,
});

function ProductPage() {
  const formatEur = (v: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(v);
  const [id, setId] = useState<string | undefined>(undefined);
  const [product, setProduct] = useState<any | null>(null);
  const navigate = useNavigate();
  const { addItem, closeCart } = useCart();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readId = () => setId(new URLSearchParams(window.location.search).get("id") ?? undefined);
    readId();
    window.addEventListener("popstate", readId);
    return () => window.removeEventListener("popstate", readId);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return setProduct(null);
      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && active) setProduct(data.product || null);
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const currentProduct = product ?? null;

  if (!currentProduct) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">Product not found.</p>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <img
              src={currentProduct.image}
              alt={currentProduct.name}
              className="w-full rounded-md object-cover"
            />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold">{currentProduct.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{currentProduct.options}</p>
            <p className="mt-4 font-display text-2xl font-semibold text-primary">
              {formatEur(Number(currentProduct.price || 0))}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                onClick={() => {
                  // Navigate to configurator with product preselected
                  try {
                    navigate({
                      to: "/configure",
                      search: {
                        id: currentProduct._id || currentProduct.id,
                        color: (currentProduct.colors || [])[0] ?? "",
                      },
                    });
                  } catch (e) {
                    const pid = encodeURIComponent(currentProduct._id || currentProduct.id);
                    const color = encodeURIComponent((currentProduct.colors || [])[0] ?? "");
                    window.location.href = `/configure?id=${pid}&color=${color}`;
                  }
                }}
              >
                Configure &amp; Order
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  addItem(currentProduct, 1, {
                    productType: currentProduct.productType ?? "pre-designed",
                  });
                  try {
                    closeCart();
                  } catch (err) {}
                  try {
                    toast.success("Added to cart");
                  } catch {}
                }}
              >
                Add to Cart
              </Button>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold">Details</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Category: {currentProduct.category}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Material: {currentProduct.material}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Available colors: {(currentProduct.colors || []).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
