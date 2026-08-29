import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Image,
  RotateCcw,
  RotateCw,
  Shirt,
  SlidersHorizontal,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { useCart } from "@/lib/cart";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

const views = ["Front", "Back", "Right Sleeve", "Left Sleeve", "Neck Tag"] as const;
const defaultSizes = ["S", "M", "L", "XL", "XXL"];
const defaultColors = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#111827" },
  { name: "Orange", value: "#f97316" },
  { name: "Rose", value: "#f472b6" },
  { name: "Cream", value: "#f7efe3" },
];
const textColors = ["#111827", "#f97316", "#ec4899", "#2563eb", "#16a34a"];
const acceptedArtworkExtensions = [".png", ".jpg", ".jpeg", ".webp"];
const acceptedArtworkTypes = ["image/png", "image/jpeg", "image/webp"];
const defaultRotation = 0;
const defaultDesignSize = 72;

type Tab = "variants" | "design" | "text";
type View = (typeof views)[number];
type UploadStatus = "idle" | "uploading" | "success" | "error";
type ArtworkPosition = {
  x: number;
  y: number;
};
type ArtworkState = {
  imageUrl: string;
  rotation: number;
  size: number;
  position: ArtworkPosition;
  uploadStatus: UploadStatus;
  uploadError?: string;
  localObjectUrl?: string;
};
type ArtworkByView = Partial<Record<View, ArtworkState>>;
type UploadErrorsByView = Partial<Record<View, string>>;
type ProductImage = string | { url?: string; role?: string };
export type ConfiguratorProduct = {
  id?: string;
  _id?: string;
  name?: string;
  sku?: string;
  price?: number;
  salePrice?: number;
  productType?: "pre-designed" | "blank" | string;
  colors?: string[];
  sizes?: string[];
  image?: string;
  images?: ProductImage[];
  previewPaths?: string[];
  imageByColor?: Record<string, string>;
};
type ArtworkInteraction =
  | {
      mode: "move";
      view: View;
      startClientX: number;
      startClientY: number;
      startPosition: ArtworkPosition;
      startSize: number;
      previewRect: DOMRect;
    }
  | {
      mode: "resize";
      view: View;
      startSize: number;
      startDistance: number;
      centerX: number;
      centerY: number;
    }
  | {
      mode: "rotate";
      view: View;
      startRotation: number;
      startAngle: number;
      centerX: number;
      centerY: number;
    };

const defaultArtworkPosition = { x: 0, y: 0 };
const minDesignSize = 20;
const maxDesignSize = 140;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function constrainArtworkPosition(position: ArtworkPosition, size: number) {
  const artworkWidthPercent = 40 * (size / 100);
  const maxOffset = 50 + artworkWidthPercent / 2;

  return {
    x: clamp(position.x, -maxOffset, maxOffset),
    y: clamp(position.y, -maxOffset, maxOffset),
  };
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function normalizeOptionList(options: unknown) {
  return Array.isArray(options)
    ? options
        .map((option) => String(option || "").trim())
        .filter(Boolean)
    : [];
}

function getColorValue(colorName: string) {
  if (/^#[0-9a-f]{3,8}$/i.test(colorName)) {
    return colorName;
  }

  const knownColors: Record<string, string> = {
    black: "#111827",
    charcoal: "#374151",
    clear: "#f8fafc",
    cream: "#f7efe3",
    maroon: "#7f1d1d",
    navy: "#1e3a8a",
    nude: "#e6c8b8",
    orange: "#f97316",
    pink: "#f472b6",
    rose: "#f472b6",
    white: "#ffffff",
  };

  return knownColors[colorName.toLowerCase()] ?? "#e5e7eb";
}

function revokeArtworkObjectUrl(artwork: ArtworkState | undefined) {
  const objectUrl = artwork?.localObjectUrl || (artwork?.imageUrl?.startsWith("blob:") ? artwork.imageUrl : "");
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}

function getImageUrl(image: ProductImage | undefined) {
  if (!image) return "";
  return typeof image === "string" ? image : image.url || "";
}

function getViewRole(view: View) {
  const roles: Record<View, string> = {
    Front: "front",
    Back: "back",
    "Right Sleeve": "right-sleeve",
    "Left Sleeve": "left-sleeve",
    "Neck Tag": "neck-tag",
  };

  return roles[view];
}

function getConfiguratorProductImage(
  product: ConfiguratorProduct | null | undefined,
  selectedColor: string,
  activeView: View,
) {
  if (!product) return "";

  const selectedColorImage = selectedColor ? product.imageByColor?.[selectedColor] : "";
  const viewRole = getViewRole(activeView);
  const roleImage = product.images?.find((image) => {
    if (typeof image === "string") return false;
    return image.role?.toLowerCase() === viewRole;
  });
  const frontImage = product.images?.find((image) => {
    if (typeof image === "string") return false;
    return image.role?.toLowerCase() === "front";
  });
  const directImage =
    selectedColorImage ||
    getImageUrl(roleImage) ||
    getImageUrl(frontImage) ||
    product.image ||
    getImageUrl(product.images?.[0]) ||
    product.previewPaths?.[0] ||
    "";

  return getOptimizedImageUrl(directImage);
}

export function ProductConfigurator({ product }: { product?: ConfiguratorProduct | null }) {
  const { addItem } = useCart();
  const [activeTab, setActiveTab] = useState<Tab>("variants");
  const [activeView, setActiveView] = useState<View>("Front");
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("White");
  const [artworkByView, setArtworkByView] = useState<ArtworkByView>({});
  const [uploadErrorsByView, setUploadErrorsByView] = useState<UploadErrorsByView>({});
  const [selectedArtworkView, setSelectedArtworkView] = useState<View | null>(null);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<ArtworkInteraction | null>(null);
  const artworkUrlsRef = useRef<ArtworkByView>({});
  const activeArtwork = artworkByView[activeView];
  const activeArtworkUrl = activeArtwork?.imageUrl;
  const activeRotation = activeArtwork?.rotation ?? defaultRotation;
  const activeDesignSize = activeArtwork?.size ?? defaultDesignSize;
  const activePosition = activeArtwork?.position ?? defaultArtworkPosition;
  const activeUploadStatus = activeArtwork?.uploadStatus ?? "idle";
  const activeUploadError = uploadErrorsByView[activeView] || activeArtwork?.uploadError || "";
  const isActiveArtworkSelected = selectedArtworkView === activeView && Boolean(activeArtworkUrl);
  const productName = product?.name || "Custom Product";
  const productSku = product?.sku || product?.id || product?._id || "No SKU";
  const productPrice = Number(product?.salePrice ?? product?.price ?? 0);
  const printFee = 0;
  const totalPrice = productPrice + printFee;
  const productImage = getConfiguratorProductImage(product, selectedColor, activeView);
  const availableSizes = useMemo(() => {
    const sizeOptions = normalizeOptionList(product?.sizes);
    return sizeOptions.length ? sizeOptions : defaultSizes;
  }, [product?.sizes]);
  const availableColors = useMemo(() => {
    const colorOptions = normalizeOptionList(product?.colors);
    return colorOptions.length
      ? colorOptions.map((color) => ({ name: color, value: getColorValue(color) }))
      : defaultColors;
  }, [product?.colors]);

  useEffect(() => {
    artworkUrlsRef.current = artworkByView;
  }, [artworkByView]);

  useEffect(() => {
    return () => {
      Object.values(artworkUrlsRef.current).forEach((artwork) => {
        revokeArtworkObjectUrl(artwork);
      });
    };
  }, []);

  useEffect(() => {
    setSelectedSize((current) => (availableSizes.includes(current) ? current : availableSizes[0] || "M"));
    setSelectedColor((current) =>
      availableColors.some((color) => color.name === current) ? current : availableColors[0]?.name || "White",
    );
  }, [availableColors, availableSizes]);

  function handleArtworkSelected(file: File) {
    const objectUrl = URL.createObjectURL(file);
    const uploadView = activeView;

    setUploadErrorsByView((current) => {
      const next = { ...current };
      delete next[uploadView];
      return next;
    });

    setArtworkByView((current) => {
      const previousArtwork = current[uploadView];
      revokeArtworkObjectUrl(previousArtwork);

      return {
        ...current,
        [uploadView]: {
          imageUrl: objectUrl,
          rotation: previousArtwork?.rotation ?? defaultRotation,
          size: previousArtwork?.size ?? defaultDesignSize,
          position: previousArtwork?.position ?? defaultArtworkPosition,
          uploadStatus: "uploading",
          localObjectUrl: objectUrl,
        },
      };
    });
    setSelectedArtworkView(uploadView);
    void uploadArtworkForView(file, uploadView, objectUrl);
  }

  function handleArtworkRejected(message: string) {
    setUploadErrorsByView((current) => ({ ...current, [activeView]: message }));
  }

  async function uploadArtworkForView(file: File, view: View, localObjectUrl: string) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiFetch("/api/customer-upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok || !data?.file?.url) {
        throw new Error(data?.error || "Upload failed. Please try again.");
      }

      let replacedLocalPreview = false;
      setArtworkByView((current) => {
        const currentArtwork = current[view];

        if (!currentArtwork || currentArtwork.imageUrl !== localObjectUrl) {
          return current;
        }

        replacedLocalPreview = true;
        return {
          ...current,
          [view]: {
            ...currentArtwork,
            imageUrl: data.file.url,
            uploadStatus: "success",
            uploadError: undefined,
            localObjectUrl: undefined,
          },
        };
      });

      if (replacedLocalPreview) {
        URL.revokeObjectURL(localObjectUrl);
      }
    } catch (err: any) {
      const message = err?.message || "Upload failed. Please try again.";

      setUploadErrorsByView((current) => ({ ...current, [view]: `Upload failed: ${message}` }));
      let removedLocalPreview = false;
      setArtworkByView((current) => {
        const currentArtwork = current[view];

        if (!currentArtwork || currentArtwork.imageUrl !== localObjectUrl) {
          return current;
        }

        removedLocalPreview = true;
        const next = { ...current };
        delete next[view];
        return next;
      });

      if (removedLocalPreview) {
        URL.revokeObjectURL(localObjectUrl);
        if (selectedArtworkView === view) setSelectedArtworkView(null);
      }
    }
  }

  function updateArtworkForView(
    view: View,
    settings: Partial<Pick<ArtworkState, "rotation" | "size" | "position">>,
  ) {
    setArtworkByView((current) => {
      const currentArtwork = current[view];

      if (!currentArtwork) {
        return current;
      }

      return {
        ...current,
        [view]: {
          ...currentArtwork,
          ...settings,
        },
      };
    });
  }

  function updateActiveArtworkSettings(
    settings: Partial<Pick<ArtworkState, "rotation" | "size" | "position">>,
  ) {
    updateArtworkForView(activeView, settings);
  }

  function handleDeleteActiveArtwork() {
    const artworkToDelete = artworkByView[activeView];
    revokeArtworkObjectUrl(artworkToDelete);

    setArtworkByView((current) => {
      const next = { ...current };
      delete next[activeView];
      return next;
    });
    setUploadErrorsByView((current) => {
      const next = { ...current };
      delete next[activeView];
      return next;
    });
    setSelectedArtworkView(null);
  }

  function startArtworkInteraction(
    event: React.PointerEvent<HTMLElement>,
    mode: ArtworkInteraction["mode"],
  ) {
    if (!activeArtwork || !previewAreaRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedArtworkView(activeView);

    const previewRect = previewAreaRef.current.getBoundingClientRect();
    const centerX = previewRect.left + previewRect.width / 2 + (activePosition.x / 100) * previewRect.width;
    const centerY = previewRect.top + previewRect.height / 2 + (activePosition.y / 100) * previewRect.height;

    if (mode === "move") {
      interactionRef.current = {
        mode,
        view: activeView,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: activePosition,
        startSize: activeDesignSize,
        previewRect,
      };
    }

    if (mode === "resize") {
      interactionRef.current = {
        mode,
        view: activeView,
        startSize: activeDesignSize,
        startDistance: Math.max(1, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
        centerX,
        centerY,
      };
    }

    if (mode === "rotate") {
      interactionRef.current = {
        mode,
        view: activeView,
        startRotation: activeRotation,
        startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
        centerX,
        centerY,
      };
    }

    document.addEventListener("pointermove", handleArtworkPointerMove);
    document.addEventListener("pointerup", stopArtworkInteraction);
    document.addEventListener("pointercancel", stopArtworkInteraction);
  }

  function handleArtworkPointerMove(event: PointerEvent) {
    const interaction = interactionRef.current;

    if (!interaction) {
      return;
    }

    if (interaction.mode === "move") {
      const nextPosition = constrainArtworkPosition(
        {
          x:
            interaction.startPosition.x +
            ((event.clientX - interaction.startClientX) / interaction.previewRect.width) * 100,
          y:
            interaction.startPosition.y +
            ((event.clientY - interaction.startClientY) / interaction.previewRect.height) * 100,
        },
        interaction.startSize,
      );

      updateArtworkForView(interaction.view, { position: nextPosition });
      return;
    }

    if (interaction.mode === "resize") {
      const nextDistance = Math.hypot(event.clientX - interaction.centerX, event.clientY - interaction.centerY);
      const nextSize = clamp(
        Math.round(interaction.startSize * (nextDistance / interaction.startDistance)),
        minDesignSize,
        maxDesignSize,
      );

      updateArtworkForView(interaction.view, { size: nextSize });
      return;
    }

    const nextAngle = Math.atan2(event.clientY - interaction.centerY, event.clientX - interaction.centerX);
    const angleDelta = ((nextAngle - interaction.startAngle) * 180) / Math.PI;
    updateArtworkForView(interaction.view, {
      rotation: Math.round(interaction.startRotation + angleDelta),
    });
  }

  function stopArtworkInteraction() {
    interactionRef.current = null;
    document.removeEventListener("pointermove", handleArtworkPointerMove);
    document.removeEventListener("pointerup", stopArtworkInteraction);
    document.removeEventListener("pointercancel", stopArtworkInteraction);
  }

  function handleAddToCart() {
    const artworkEntries = views
      .map((view) => {
        const artwork = artworkByView[view];
        if (!artwork?.imageUrl) return null;
        return { view, artwork };
      })
      .filter((entry): entry is { view: View; artwork: ArtworkState } => Boolean(entry));

    if (artworkEntries.some(({ artwork }) => artwork.uploadStatus === "uploading")) {
      toast.error("Please wait for your image to finish uploading.");
      return;
    }

    if (artworkEntries.some(({ artwork }) => artwork.imageUrl.startsWith("blob:"))) {
      toast.error("Please wait for your image to finish uploading.");
      return;
    }

    if (product?.productType === "blank" && artworkEntries.length === 0) {
      toast.error("Please add your artwork before adding this custom item to your cart.");
      return;
    }

    const artworks = artworkEntries.map(({ view, artwork }) => ({
      view,
      imageUrl: artwork.imageUrl,
      rotation: artwork.rotation,
      size: artwork.size,
      position: artwork.position,
    }));
    const primaryArtworkUrl = artworks[0]?.imageUrl;
    const productId = product?.id || product?._id || productSku;
    const customizationPayload = {
      productType: product?.productType || "pre-designed",
      sku: productSku,
      size: selectedSize,
      color: selectedColor,
      printFee,
      basePrice: productPrice,
      totalPrice,
      image: primaryArtworkUrl || productImage,
      artworks,
    };
    const productArg = {
      id: String(productId),
      _id: product?._id,
      name: productName,
      sku: productSku,
      price: totalPrice,
      image: productImage,
      category: "Custom",
      material: "",
      colors: availableColors.map((color) => color.name),
      rating: 0,
      reviews: 0,
      options: selectedSize,
      productType: product?.productType,
      sizes: availableSizes,
    };

    addItem(productArg as any, 1, customizationPayload);
    toast.success(`${productName} added to cart`);
  }

  return (
    <section className="bg-white text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-medium text-slate-500">
              <Link to="/" className="hover:text-orange-500">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Customisable Blanks</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="truncate text-slate-800">{productName}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200">
                <RotateCcw className="h-4 w-4" />
                Undo
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200">
                <RotateCw className="h-4 w-4" />
                Redo
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 text-pink-600">
                <X className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <Link to="/templates" className="text-sm font-semibold text-slate-700 hover:text-orange-500">
              &larr; Back to Product
            </Link>
            <div className="text-left lg:text-center">
              <h1 className="text-2xl font-bold tracking-normal text-black sm:text-3xl">
                {productName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                SKU {productSku} / {selectedColor} / {selectedSize}
              </p>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex aspect-[4/3] min-h-[320px] items-center justify-center p-4 sm:aspect-square lg:min-h-[560px]">
              <div className="relative flex h-full w-full max-w-[620px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-white shadow-sm">
                <div className="absolute left-4 top-4 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                  {activeView}
                </div>
                <div className="flex flex-col items-center gap-5 text-center">
                  <div
                    ref={previewAreaRef}
                    onPointerDown={() => setSelectedArtworkView(null)}
                    className="relative flex h-64 w-56 items-center justify-center overflow-hidden rounded-[28px] border border-orange-100 bg-orange-50/50 text-orange-500 shadow-inner sm:h-80 sm:w-72"
                  >
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={`${productName} ${activeView.toLowerCase()} preview`}
                        draggable={false}
                        className="h-full w-full select-none object-contain"
                      />
                    ) : (
                      <Shirt className="h-40 w-40 stroke-[1.35] opacity-80 sm:h-52 sm:w-52" />
                    )}
                    {activeArtworkUrl ? (
                      <div
                        className={`absolute touch-none text-slate-950 ${
                          isActiveArtworkSelected ? "outline outline-2 outline-orange-500" : ""
                        }`}
                        style={{
                          width: `${40 * (activeDesignSize / 100)}%`,
                          left: `calc(50% + ${activePosition.x}%)`,
                          top: `calc(50% + ${activePosition.y}%)`,
                          transform: `translate(-50%, -50%) rotate(${activeRotation}deg)`,
                        }}
                        onPointerDown={(event) => startArtworkInteraction(event, "move")}
                      >
                        <img
                          src={activeArtworkUrl}
                          alt={`${activeView} uploaded artwork preview`}
                          draggable={false}
                          className="block max-h-48 w-full select-none object-contain"
                        />
                        {activeUploadStatus === "uploading" ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/55">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm ring-1 ring-orange-100">
                              Uploading...
                            </span>
                          </div>
                        ) : null}
                        {isActiveArtworkSelected ? (
                          <>
                            <button
                              type="button"
                              aria-label="Delete artwork"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteActiveArtwork();
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              className="absolute -right-8 -top-8 flex h-7 w-7 items-center justify-center rounded-full bg-white text-pink-600 shadow ring-1 ring-pink-100 hover:bg-pink-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Rotate artwork"
                              onPointerDown={(event) => startArtworkInteraction(event, "rotate")}
                              className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-8 rounded-full border-2 border-white bg-orange-500 shadow"
                            />
                            {["left-0 top-0", "right-0 top-0", "bottom-0 left-0", "bottom-0 right-0"].map(
                              (positionClass) => (
                                <button
                                  key={positionClass}
                                  type="button"
                                  aria-label="Resize artwork"
                                  onPointerDown={(event) => startArtworkInteraction(event, "resize")}
                                  className={`absolute h-4 w-4 rounded-full border-2 border-white bg-orange-500 shadow ${positionClass} ${
                                    positionClass.includes("left") ? "-translate-x-1/2" : "translate-x-1/2"
                                  } ${positionClass.includes("top") ? "-translate-y-1/2" : "translate-y-1/2"}`}
                                />
                              ),
                            )}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {activeArtworkUrl ? "Artwork preview" : "Garment preview placeholder"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activeArtworkUrl ? "Static placement only" : "Static layout only"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {views.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`relative flex h-24 flex-col items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors ${
                  activeView === view
                    ? "border-orange-500 bg-orange-50 text-orange-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
                }`}
              >
                {artworkByView[view]?.imageUrl ? (
                  <span
                    className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white"
                    aria-label={`${view} has uploaded artwork`}
                  />
                ) : null}
                <Image className="h-5 w-5" />
                <span>{view}</span>
              </button>
            ))}
          </div>
        </div>

        <aside className="min-w-0 lg:w-[360px]">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="grid grid-cols-3 border-b border-slate-200">
              <TabButton active={activeTab === "variants"} onClick={() => setActiveTab("variants")}>
                Variants
              </TabButton>
              <TabButton active={activeTab === "design"} onClick={() => setActiveTab("design")}>
                Design
              </TabButton>
              <TabButton active={activeTab === "text"} onClick={() => setActiveTab("text")}>
                Text
              </TabButton>
            </div>

            <div className="p-4 sm:p-5">
              {activeTab === "variants" ? (
                <VariantsPanel
                  sizes={availableSizes}
                  colors={availableColors}
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  onSelectSize={setSelectedSize}
                  onSelectColor={setSelectedColor}
                />
              ) : null}
              {activeTab === "design" ? (
                <DesignPanel
                  activeView={activeView}
                  rotation={activeRotation}
                  designSize={activeDesignSize}
                  hasArtwork={Boolean(activeArtworkUrl)}
                  uploadError={activeUploadError}
                  onArtworkSelected={handleArtworkSelected}
                  onArtworkRejected={handleArtworkRejected}
                  onRotationChange={(rotation) => updateActiveArtworkSettings({ rotation })}
                  onDesignSizeChange={(size) => updateActiveArtworkSettings({ size })}
                />
              ) : null}
              {activeTab === "text" ? <TextPanel /> : null}
            </div>
          </div>

          <div className="sticky bottom-0 mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:top-24 lg:bottom-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{productName}</p>
                <p className="mt-1 text-sm text-slate-500">{formatPrice(totalPrice)}</p>
              </div>
              <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-600">
                Custom
              </span>
            </div>
            <Button
              className="mt-4 h-12 w-full bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
              onClick={handleAddToCart}
            >
              Add to Cart • {formatPrice(totalPrice)}
            </Button>
            <p className="mt-2 text-center text-xs text-slate-500">Configurator preview only</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 border-b-2 text-sm font-semibold transition-colors ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-600"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function VariantsPanel({
  sizes,
  colors,
  selectedSize,
  selectedColor,
  onSelectSize,
  onSelectColor,
}: {
  sizes: string[];
  colors: Array<{ name: string; value: string }>;
  selectedSize: string;
  selectedColor: string;
  onSelectSize: (size: string) => void;
  onSelectColor: (color: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-950">Size</h2>
          <span className="text-xs font-medium text-pink-600">Most ordered: M</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onSelectSize(size)}
              className={`h-10 min-w-12 rounded-full border px-4 text-sm font-semibold transition-colors ${
                selectedSize === size
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-950">Color</h2>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => onSelectColor(color.name)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                selectedColor === color.name
                  ? "border-orange-500 ring-2 ring-orange-200"
                  : "border-slate-200"
              }`}
              aria-label={color.name}
            >
              <span
                className="h-8 w-8 rounded-full border border-slate-200"
                style={{ backgroundColor: color.value }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignPanel({
  activeView,
  rotation,
  designSize,
  hasArtwork,
  uploadError,
  onArtworkSelected,
  onArtworkRejected,
  onRotationChange,
  onDesignSizeChange,
}: {
  activeView: View;
  rotation: number;
  designSize: number;
  hasArtwork: boolean;
  uploadError: string;
  onArtworkSelected: (file: File) => void;
  onArtworkRejected: (message: string) => void;
  onRotationChange: (value: number) => void;
  onDesignSizeChange: (value: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isAcceptedType = acceptedArtworkTypes.includes(file.type);
    const isAcceptedExtension = acceptedArtworkExtensions.some((extension) =>
      lowerName.endsWith(extension),
    );

    if (!isAcceptedType && !isAcceptedExtension) {
      onArtworkRejected("Upload failed: please use a PNG, JPG, JPEG, or WEBP image.");
      return;
    }

    onArtworkSelected(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          isDragging
            ? "border-orange-500 bg-orange-100/70"
            : "border-orange-200 bg-orange-50/50 hover:border-orange-300 hover:bg-orange-50"
        }`}
        aria-label={`Upload artwork for ${activeView}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Upload className="h-9 w-9 text-orange-500" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Drop your artwork here</p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP</p>
        <p className="mt-2 text-xs font-medium text-orange-600">{activeView}</p>
      </div>
      {uploadError ? (
        <p className="rounded-md border border-pink-100 bg-pink-50 px-3 py-2 text-xs font-medium text-pink-700">
          {uploadError}
        </p>
      ) : null}
      <RangeControl
        icon={<RotateCw className="h-4 w-4" />}
        label="Rotation"
        min={-180}
        max={180}
        value={rotation}
        displayValue={`${rotation}Â°`}
        disabled={!hasArtwork}
        onChange={onRotationChange}
      />
      <RangeControl
        icon={<SlidersHorizontal className="h-4 w-4" />}
        label="Design Size"
        min={minDesignSize}
        max={maxDesignSize}
        value={designSize}
        displayValue={`${designSize}%`}
        disabled={!hasArtwork}
        onChange={onDesignSizeChange}
      />
    </div>
  );
}

function TextPanel() {
  const [text, setText] = useState("Avril Forme");

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-bold text-slate-950" htmlFor="design-text">
          Text
        </label>
        <Input
          id="design-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-11 border-slate-200"
        />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-950">Text Color</h2>
        <div className="flex gap-3">
          {textColors.map((color) => (
            <span
              key={color}
              className="h-9 w-9 rounded-full border border-slate-200"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <StaticSlider icon={<Type className="h-4 w-4" />} label="Font Size" value="42px" />
      <Button variant="outline" className="h-11 w-full border-orange-200 font-semibold text-orange-600">
        Add to Design +
      </Button>
    </div>
  );
}

function RangeControl({
  icon,
  label,
  value,
  displayValue,
  min,
  max,
  onChange,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          {icon}
          {label}
        </span>
        <span className="text-slate-500">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

function StaticSlider({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          {icon}
          {label}
        </span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 w-2/3 rounded-full bg-orange-500" />
      </div>
    </div>
  );
}

export default ProductConfigurator;


