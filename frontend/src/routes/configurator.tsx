import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StoreLayout } from "@/components/store-layout";
import { ProductConfigurator } from "@/components/product-configurator";

export const Route = createFileRoute("/configurator")({
  head: () => ({ meta: [{ title: "Product Configurator — Avril Forme" }] }),
  component: ConfiguratorPage,
});

function ConfiguratorPage() {
  const [id, setId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const readId = () => setId(new URLSearchParams(window.location.search).get("id") ?? undefined);
    // initialize
    readId();
    // support SPA navigation via pushState/popstate
    window.addEventListener("popstate", readId);
    return () => window.removeEventListener("popstate", readId);
  }, []);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Configure your product</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload artwork or add text to preview your customised product.
        </p>
        <div className="mt-8">
          <ProductConfigurator initialId={id ?? undefined} />
        </div>
      </div>
    </StoreLayout>
  );
}
