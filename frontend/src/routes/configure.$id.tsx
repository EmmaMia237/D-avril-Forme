import { createFileRoute } from "@tanstack/react-router";
import ProductConfigurator from "@/components/product-configurator-fabric";
import { StoreLayout } from "@/components/store-layout";

export const Route = createFileRoute("/configure/:id")({
  head: () => ({ meta: [{ title: "Product Configurator — D'avril Forme" }] }),
  component: ConfigureById,
});

function ConfigureById({ params }: any) {
  const productId = params?.id;
  return (
    <StoreLayout>
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">Configure your product</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upload artwork or add text to preview your customised product.</p>
        <div className="mt-8">
          <ProductConfigurator initialId={productId} initialBlank={false} />
        </div>
      </div>
    </StoreLayout>
  );
}
