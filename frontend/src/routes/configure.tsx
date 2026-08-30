import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ProductConfigurator, type ConfiguratorProduct } from "@/components/product-configurator-fabric";
import { StoreLayout } from "@/components/store-layout";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/configure")({
  head: () => ({ meta: [{ title: "Product Configurator - OsanPrints" }] }),
  component: ConfiguratorPage,
});

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeProduct(raw: any): ConfiguratorProduct {
  const metadata = raw?.metadata || {};
  const image =
    raw?.image ||
    raw?.images?.find?.((item: any) => item?.role === "front")?.url ||
    raw?.images?.[0]?.url ||
    raw?.previewPaths?.[0] ||
    "";

  return {
    id: raw?.id || raw?._id,
    _id: raw?._id,
    name: raw?.name,
    sku: raw?.sku,
    price: Number(raw?.price || 0),
    salePrice: raw?.salePrice == null ? undefined : Number(raw.salePrice),
    productType: raw?.productType,
    colors: normalizeList(raw?.colors).length
      ? normalizeList(raw.colors)
      : normalizeList(metadata.colors || metadata.colorOptions || metadata.availableColors),
    sizes: normalizeList(raw?.sizes).length
      ? normalizeList(raw.sizes)
      : normalizeList(metadata.sizes || metadata.sizeOptions || metadata.availableSizes),
    image,
    images: Array.isArray(raw?.images) ? raw.images : [],
    previewPaths: Array.isArray(raw?.previewPaths) ? raw.previewPaths : [],
    imageByColor: raw?.imageByColor || metadata.imageByColor || {},
  };
}

function ConfiguratorPage() {
  const search = useSearch({ from: "/configure" }) as { id?: string };
  const productId = typeof search?.id === "string" ? search.id.trim() : "";
  const [product, setProduct] = useState<ConfiguratorProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!productId) {
        setProduct(null);
        setError("No product selected for configuration.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await apiFetch(`/api/products/${encodeURIComponent(productId)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.product) {
          throw new Error(data?.error || "Product not found.");
        }

        if (active) {
          setProduct(normalizeProduct(data.product));
        }
      } catch (err: any) {
        if (active) {
          setProduct(null);
          setError(err?.message || "Unable to load product.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [productId]);

  return (
    <StoreLayout>
      {isLoading ? (
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm font-medium text-slate-600 lg:px-8">
          Loading product...
        </div>
      ) : error ? (
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h1 className="text-lg font-semibold text-slate-950">Product unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        </div>
      ) : (
        <ProductConfigurator product={product} />
      )}
    </StoreLayout>
  );
}
