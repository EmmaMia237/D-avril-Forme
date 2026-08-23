import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { products } from "@/lib/shop-data";
import { apiFetch } from "@/lib/api-client";

const fontOptions = ["sans-serif", "serif", "monospace", "cursive"];

type Placement = { x: number; y: number; rotation: number; scale: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snapRotation = (degrees: number) => {
  const snapped = Math.round(degrees / 15) * 15;
  return snapped % 360;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const removeBackgroundFromImage = async (src: string) => {
  if (typeof document === "undefined") return src;

  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return src;

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const samples = [
    [0, 0],
    [canvas.width - 1, 0],
    [0, canvas.height - 1],
    [canvas.width - 1, canvas.height - 1],
    [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)],
  ];

  const bgColor = samples.reduce(
    (acc, [x, y]) => {
      const index = (y * canvas.width + x) * 4;
      acc.r += pixels[index];
      acc.g += pixels[index + 1];
      acc.b += pixels[index + 2];
      acc.count += 1;
      return acc;
    },
    { r: 0, g: 0, b: 0, count: 0 },
  );

  const base = {
    r: Math.round(bgColor.r / bgColor.count),
    g: Math.round(bgColor.g / bgColor.count),
    b: Math.round(bgColor.b / bgColor.count),
  };

  for (let i = 0; i < pixels.length; i += 4) {
    const distance = Math.sqrt(
      (pixels[i] - base.r) ** 2 +
        (pixels[i + 1] - base.g) ** 2 +
        (pixels[i + 2] - base.b) ** 2,
    );

    if (distance < 48) {
      pixels[i + 3] = 0;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

export function ProductConfigurator({ initialId, initialBlank, initialOpenUpload }: { initialId?: string; initialBlank?: boolean; initialOpenUpload?: boolean }) {
  const [productId, setProductId] = useState(initialId ?? (initialBlank ? '__blank__' : products[0]?.id) ?? "");
  const [productData, setProductData] = useState<any | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!productId) return setProductData(null);
      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(productId)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && active) setProductData(data.product || null);
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { active = false; };
  }, [productId]);

  useEffect(() => {
    if (initialId) setProductId(initialId);
  }, [initialId]);

  useEffect(() => {
    // If the page requested a blank canvas, ensure productId reflects that
    if (initialBlank) setProductId('__blank__');
  }, [initialBlank]);

  useEffect(() => {
    if (initialOpenUpload) {
      // small timeout to ensure the input is mounted
      setTimeout(() => uploadInputRef.current?.click(), 120);
    }
  }, [initialOpenUpload]);

  const [uploaded, setUploaded] = useState<string | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState("Standard");
  const [quantity, setQuantity] = useState(1);
  const [text, setText] = useState("D'AVRIL");
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [textColor, setTextColor] = useState("#1E1D1B");
  const [textPlacement, setTextPlacement] = useState<Placement>({ x: 50, y: 50, rotation: 0, scale: 1 });
  const [imagePlacement, setImagePlacement] = useState<Placement>({ x: 50, y: 50, rotation: 0, scale: 1 });
  const [draggingTarget, setDraggingTarget] = useState<"text" | "image" | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initial: Placement } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const blankProduct = { id: '__blank__', name: 'Blank canvas', image: null, images: [], colors: [], sizes: ['Standard'], productType: 'blank' } as any;
  const product = productData ?? (productId === '__blank__' ? blankProduct : products.find((p) => p.id === productId)) ?? products[0];
  const { addItem } = useCart();
  const sizes = product?.sizes?.length ? product.sizes : ["Standard", "Small", "Medium", "Large"];

  const previewImage = useMemo(
    () => (product?.imageByColor && selectedColor ? product.imageByColor[selectedColor] : null) ?? product.image,
    [product, selectedColor],
  );

  useEffect(() => {
    setSelectedColor(product?.colors?.[0] ?? null);
    setSelectedSize(sizes[0] ?? "Standard");
  }, [productId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const colorParam = query.get("color");
    if (colorParam && product?.colors?.includes(colorParam)) {
      setSelectedColor(colorParam);
    }
  }, [product]);

  useEffect(() => {
    if (!draggingTarget || !dragStart || !stageRef.current) return;

    const handleMove = (event: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((event.clientX - dragStart.x) / rect.width) * 100;
      const dy = ((event.clientY - dragStart.y) / rect.height) * 100;
      const next = { ...dragStart.initial };

      next.x = clamp(dragStart.initial.x + dx, 8, 92);
      next.y = clamp(dragStart.initial.y + dy, 8, 92);

      if (draggingTarget === "text") setTextPlacement(next);
      if (draggingTarget === "image") setImagePlacement(next);
    };

    const stopDrag = () => {
      setDraggingTarget(null);
      setDragStart(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [draggingTarget, dragStart]);

  const startDrag = (target: "text" | "image", event: React.PointerEvent) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const source = target === "text" ? textPlacement : imagePlacement;
    setDraggingTarget(target);
    setDragStart({
      x: event.clientX,
      y: event.clientY,
      initial: { ...source },
    });
    event.preventDefault();
    event.stopPropagation();
  };

  const placeAtPointer = (event: React.PointerEvent) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 10, 90);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 10, 90);

    if (uploaded) {
      setImagePlacement((prev) => ({ ...prev, x, y }));
      return;
    }

    if (text.trim()) {
      setTextPlacement((prev) => ({ ...prev, x, y }));
    }
  };

  const handleUpload = async (file: File | null | undefined) => {
    if (!file) return;
    const nextImage = URL.createObjectURL(file);
    setUploaded(nextImage);
    setImagePlacement((prev) => ({ ...prev, x: 50, y: 50 }));
  };

  const handleRemoveBackground = async () => {
    if (!uploaded) return;
    setIsRemovingBackground(true);
    try {
      const cleaned = await removeBackgroundFromImage(uploaded);
      setUploaded(cleaned);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  const generateComposite = async (): Promise<string | null> => {
    try {
      const canvasW = 1200;
      const canvasH = 900;
      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // draw preview/base product
      if (previewImage) {
        try {
          const baseImg = await loadImage(previewImage);
          ctx.drawImage(baseImg, 0, 0, canvasW, canvasH);
        } catch (err) {
          // ignore base image draw failures
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }

      // draw uploaded image
      if (uploaded) {
        try {
          const img = await loadImage(uploaded);
          // calculate size similar to preview logic
          const widthPercent = Math.max(16, 28 * imagePlacement.scale) / 100;
          const drawW = canvasW * (widthPercent);
          const drawH = (img.naturalHeight / img.naturalWidth) * drawW;
          const cx = (imagePlacement.x / 100) * canvasW;
          const cy = (imagePlacement.y / 100) * canvasH;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((imagePlacement.rotation * Math.PI) / 180);
          ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        } catch (err) {
          // ignore upload draw errors
        }
      }

      // draw text
      if (text.trim()) {
        const fontPx = Math.max(18, fontSize * textPlacement.scale);
        ctx.save();
        ctx.translate((textPlacement.x / 100) * canvasW, (textPlacement.y / 100) * canvasH);
        ctx.rotate((textPlacement.rotation * Math.PI) / 180);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor || '#000';
        ctx.font = `${fontPx}px ${fontFamily}, sans-serif`;
        // add slight shadow for visibility
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to generate composite image', err);
      return null;
    }
  };

  const handleConfirm = async () => {
    let composite: string | null = null;
    try {
      composite = await generateComposite();
    } catch (err) {
      // proceed even if composite generation fails
      console.warn('Composite generation failed, proceeding without it', err);
    }

    addItem(product, quantity, {
      text: text.trim(),
      fontSize,
      fontFamily,
      fontColor: textColor,
      textPlacement,
      image: uploaded,
      imagePlacement,
      composite, // generated composite image (data URL) of product + edits
      color: selectedColor,
      size: selectedSize,
      productType: product.productType ?? "pre-designed",
      variant: "custom-configured",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-5">
        <div>
          <label className="block text-sm font-semibold">Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-2 w-full cursor-pointer rounded border border-border bg-background p-2">
            {initialBlank && <option value="__blank__">Blank canvas</option>}
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold">Size</label>
            <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="mt-2 w-full cursor-pointer rounded border border-border bg-background p-2">
              {sizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Color</label>
            <select value={selectedColor ?? ""} onChange={(e) => setSelectedColor(e.target.value)} className="mt-2 w-full cursor-pointer rounded border border-border bg-background p-2">
              {(product.colors ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold">Quantity</label>
            <input type="number" min={1} max={99} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))} className="mt-2 w-full rounded border border-border bg-background p-2" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold">Upload artwork or logo</label>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleUpload(e.target.files?.[0])}
            className="mt-2 block w-full cursor-pointer text-sm"
          />
          {uploaded && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void handleRemoveBackground()}
              disabled={isRemovingBackground}
            >
              {isRemovingBackground ? "Removing background..." : "Remove background"}
            </Button>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold">Custom text</label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, phrase, initials..." className="mt-2 w-full rounded border border-border bg-background p-2" />
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input type="number" min={12} max={96} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value || 16))} className="rounded border border-border bg-background p-2" aria-label="Font size" />
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="cursor-pointer rounded border border-border bg-background p-2" aria-label="Font type">
              {fontOptions.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 w-full rounded border border-border bg-background p-1" aria-label="Text color" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Text rotation</label>
            <input
              type="range"
              min={-180}
              max={180}
              value={textPlacement.rotation}
              onChange={(e) => setTextPlacement((prev) => ({ ...prev, rotation: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Text scale</label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={textPlacement.scale}
              onChange={(e) => setTextPlacement((prev) => ({ ...prev, scale: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image rotation</label>
            <input
              type="range"
              min={-180}
              max={180}
              value={imagePlacement.rotation}
              onChange={(e) => setImagePlacement((prev) => ({ ...prev, rotation: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image scale</label>
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.05}
              value={imagePlacement.scale}
              onChange={(e) => setImagePlacement((prev) => ({ ...prev, scale: Number(e.target.value) }))}
              className="mt-2 w-full"
            />
          </div>
        </div>

        <Button className="mt-6 w-full" size="lg" onClick={handleConfirm}>Confirm &amp; Add to Cart</Button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Live preview</p>
        <div className="rounded-lg border border-border bg-card p-4">
          <div
            ref={stageRef}
            onPointerDown={placeAtPointer}
            className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-white"
            style={{ touchAction: "none" }}
          >
            {previewImage && (
              <img
                src={previewImage}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}

            {uploaded && (
              <img
                src={uploaded}
                alt="Uploaded artwork"
                onPointerDown={(event) => startDrag("image", event)}
                className="absolute cursor-grab select-none rounded-md border border-white/50 bg-white/10 shadow-lg"
                style={{
                  left: `${imagePlacement.x}%`,
                  top: `${imagePlacement.y}%`,
                  width: `${Math.max(16, 28 * imagePlacement.scale)}%`,
                  transform: `translate(-50%, -50%) rotate(${imagePlacement.rotation}deg)`,
                  maxWidth: "38%",
                  objectFit: "contain",
                }}
              />
            )}

            {text.trim() && (
              <div
                onPointerDown={(event) => startDrag("text", event)}
                className="absolute cursor-grab select-none whitespace-pre-wrap text-center font-medium"
                style={{
                  left: `${textPlacement.x}%`,
                  top: `${textPlacement.y}%`,
                  color: textColor,
                  fontFamily,
                  fontSize: `${Math.max(18, fontSize * textPlacement.scale)}px`,
                  transform: `translate(-50%, -50%) rotate(${snapRotation(textPlacement.rotation)}deg)`,
                  textShadow: "0 2px 10px rgba(0,0,0,0.15)",
                  maxWidth: "60%",
                  lineHeight: 1.2,
                  touchAction: "none",
                }}
              >
                {text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
