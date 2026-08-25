import React, { useEffect, useRef, useState } from "react";
import CanvasStage, { CanvasStageHandle } from "./product-configurator-canvas-stage";
import SidebarTabs from "./product-configurator-sidebar";
import { useConfiguratorState } from "./product-configurator-use-state";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";

export default function ProductConfiguratorContainer({
  product: initialProduct,
  productId: initialId,
  initialType,
}: any) {
  const {
    product,
    setProduct,
    activeViewId,
    setActiveViewId,
    views,
    viewStates,
    setViewJSON,
    pushUndo,
    popUndo,
    popRedo,
    setSelectedVariant,
    selectedVariant,
    selectedSize,
    setSelectedSize,
    quantity,
    setQuantity,
    totalPrice,
  } = useConfiguratorState(initialProduct);
  const stageRef = useRef<CanvasStageHandle | null>(null);
  const { addItem } = useCart();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // if initialProduct passed, set it
    if (initialProduct) setProduct(initialProduct);
  }, [initialProduct, setProduct]);

  useEffect(() => {
    // if productId was provided instead of full product, fetch it
    async function loadById(id?: string) {
      if (!id) return;
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.product) setProduct(json.product);
      } catch (e) {
        /* ignore */
      }
    }
    async function loadByType(t?: string) {
      if (!t) return;
      try {
        // Query blanks that match the requested type (best-effort)
        const res = await fetch(
          `/api/products?productType=blank&type=${encodeURIComponent(t)}&customizable=1&limit=1&summary=1`,
        );
        const j = await res.json().catch(() => ({}));
        const p = (j && j.products && j.products[0]) || null;
        if (p) setProduct(p);
      } catch (e) {
        /* ignore */
      }
    }
    if (initialId) loadById(initialId);
    else if (initialType) loadByType(initialType);
  }, [initialId, initialType, setProduct]);

  useEffect(() => {
    // when active view changes, load its saved JSON into canvas
    if (!activeViewId) return;
    const json = viewStates[activeViewId] || null;
    stageRef.current?.loadViewJson(json);
  }, [activeViewId, viewStates]);

  const handleSelectView = (id: string) => {
    // save current canvas state
    const prev = stageRef.current?.getViewJson();
    if (prev && activeViewId) setViewJSON(activeViewId, prev);
    setActiveViewId(id);
  };

  const handleUploadImage = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await stageRef.current?.addImageFromDataUrl(dataUrl);
      const json = stageRef.current?.getViewJson();
      if (json && activeViewId) setViewJSON(activeViewId, json);
      if (json && activeViewId) pushUndo(activeViewId, json);
    };
    if (f.type.includes("svg")) reader.readAsText(f);
    else reader.readAsDataURL(f);
  };

  const handleAddText = (text: string) => {
    stageRef.current?.addText(text);
    const json = stageRef.current?.getViewJson();
    if (json && activeViewId) setViewJSON(activeViewId, json);
    if (json && activeViewId) pushUndo(activeViewId, json);
  };

  const uploadDesign = async (dataUrl: string) => {
    const blob = dataURLToBlob(dataUrl);
    const fd = new FormData();
    fd.append("file", blob, `design_${product?._id || "custom"}_${Date.now()}.png`);
    const res = await fetch("/api/upload-design", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    return json.url || json.fileUrl || json.data?.url || null;
  };

  function dataURLToBlob(dataURL: string) {
    const parts = dataURL.split(",");
    const meta = parts[0].match(/:(.*?);/);
    const mime = meta ? meta[1] : "image/png";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }

  const handleAddToCart = async () => {
    if (!activeViewId) return alert("Select a view first");
    setUploading(true);
    try {
      // Ensure current view saved
      const json = stageRef.current?.getViewJson();
      if (json && activeViewId) setViewJSON(activeViewId, json);

      // export per-view design (only the current canvas) -- for multi-view export you'd loop views
      const designDataUrl = await stageRef.current?.exportDesignPNG(3);
      const designUrl = await uploadDesign(designDataUrl || "");

      // generate small preview
      const preview = designDataUrl;

      const payload = {
        productId: product?._id || product?.id || "__blank__",
        name: product?.name || "Custom Product",
        sku: product?.sku || null,
        price: product?.price || 0,
        size: selectedSize,
        variant: selectedVariant,
        quantity,
        designUrl,
        preview,
        viewId: activeViewId,
      };

      try {
        const productArg = product || {
          id: payload.productId,
          name: payload.name,
          price: payload.price,
        };
        if (addItem) {
          addItem(productArg, payload.quantity || 1, { ...payload, productType: "custom" });
        }
      } catch (e) {
        console.warn(e);
      }

      // Persist the custom item to backend checkout session (best-effort, non-blocking)
      (async () => {
        try {
          await fetch('/api/cart/custom-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (e) {
          // ignore backend persist failures
          console.warn('Failed to persist custom cart item', e);
        }
      })();

      try {
        toast.success('Added custom item to cart');
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error(e);
      alert("Failed to add to cart");
    } finally {
      setUploading(false);
    }
  };

  const handleUndo = () => {
    stageRef.current?.undo();
  };
  const handleRedo = () => {
    stageRef.current?.redo();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <a href="/templates" className="text-sm text-muted-foreground">
            ← Back to templates
          </a>
          <div className="text-sm">
            {product?.name || "Custom Product"} · {product?.sku || ""} ·{" "}
            {selectedVariant?.name || ""} · {selectedSize || ""}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <CanvasStage
            ref={stageRef}
            mockupUrl={views.find((v: any) => v.id === activeViewId)?.mockupUrl}
            printArea={views.find((v: any) => v.id === activeViewId)?.printArea}
          />
          <div className="mt-3 flex gap-2 overflow-auto">
            {views.map((v: any) => (
              <button
                key={v.id}
                onClick={() => handleSelectView(v.id)}
                className={`flex-shrink-0 rounded border px-3 py-1 text-sm ${v.id === activeViewId ? "bg-primary text-white" : "bg-gray-100"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside>
        <SidebarTabs
          views={views}
          activeViewId={activeViewId}
          onSelectView={handleSelectView}
          variants={product?.variants}
          selectedVariant={selectedVariant}
          onSelectVariant={(v: any) => {
            setSelectedVariant(v);
          }}
          sizes={product?.sizes || ["S", "M", "L", "XL"]}
          selectedSize={selectedSize}
          onSelectSize={(s: string) => setSelectedSize(s)}
          onUploadImage={handleUploadImage}
          onAddText={handleAddText}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        <div className="sticky top-24 mt-4 rounded-lg border border-border bg-card p-4">
          <div className="mb-4 text-sm">{product?.name || "Custom Design"}</div>
          <div className="mb-3 text-sm">Price: £{totalPrice.toFixed(2)}</div>
          <div className="flex gap-2">
            <Button onClick={handleAddToCart} className="w-full">
              {uploading ? "Adding…" : "ADD TO CART · £" + totalPrice.toFixed(2)}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
