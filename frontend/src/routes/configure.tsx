import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ProductConfigurator } from "@/components/product-configurator-fabric";
import { StoreLayout } from "@/components/store-layout";

export const Route = createFileRoute("/configure")({
  head: () => ({ meta: [{ title: "Product Configurator — D’avril Forme" }] }),
  component: ConfiguratorPage,
});

function ConfiguratorPage() {
  const [id, setId] = useState<string | undefined>(undefined);
  const [blank, setBlank] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [typeParam, setTypeParam] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setId(params.get("id") ?? undefined);
      setBlank(params.get("blank") === "1" || params.get("blank") === "true");
      setOpenUpload(params.get("upload") === "1" || params.get("upload") === "true");
      const t = params.get("type");
      // pass through type as part of initial state by attaching to openUpload (we'll use a separate state)
      setTypeParam(t || undefined);
    };

    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Configure your product</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload artwork or add text to preview your customised product.
        </p>
        <div className="mt-8">
          <ProductConfigurator
            initialId={id ?? undefined}
            initialBlank={blank}
            initialOpenUpload={openUpload}
            initialType={typeParam}
          />
        </div>
      </div>
    </StoreLayout>
  );
}
