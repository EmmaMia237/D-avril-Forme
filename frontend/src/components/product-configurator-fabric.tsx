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
import { formatPrice } from "@/lib/currency";

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
type ArtworkBase = {
  rotation: number;
  size: number;
  position: ArtworkPosition;
};
type ImageArtworkState = ArtworkBase & {
  type: "image";
  imageUrl: string;
  uploadStatus: UploadStatus;
  uploadError?: string;
  localObjectUrl?: string;
};
type TextArtworkState = ArtworkBase & {
  type: "text";
  text: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
};
type ArtworkState = ImageArtworkState | TextArtworkState;
type ArtworkSettings = Partial<
  Pick<ArtworkBase, "rotation" | "size" | "position"> &
    Pick<TextArtworkState, "fontSize" | "textColor">
>;
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
      startSnapshot: EditorSnapshot;
    }
  | {
      mode: "resize";
      view: View;
      startSize: number;
      startDistance: number;
      centerX: number;
      centerY: number;
      startSnapshot: EditorSnapshot;
    }
  | {
      mode: "rotate";
      view: View;
      startRotation: number;
      startAngle: number;
      centerX: number;
      centerY: number;
      startSnapshot: EditorSnapshot;
    };

type EditorSnapshot = {
  artworkByView: ArtworkByView;
  selectedSize: string;
  selectedColor: string;
  activeView: View;
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

function cloneArtworkByView(artworkByView: ArtworkByView): ArtworkByView {
  const next: ArtworkByView = {};

  for (const [view, artwork] of Object.entries(artworkByView) as Array<[View, ArtworkState | undefined]>) {
    if (!artwork) continue;

    next[view] = {
      ...artwork,
      position: artwork.position ? { ...artwork.position } : { ...defaultArtworkPosition },
    };
  }

  return next;
}

function buildDefaultEditorSnapshot(availableSizes: string[], availableColors: Array<{ name: string; value: string }>): EditorSnapshot {
  return {
    artworkByView: {},
    selectedSize: availableSizes[0] || "M",
    selectedColor: availableColors[0]?.name || "White",
    activeView: "Front",
  };
}

function snapshotEditorState(
  artworkByView: ArtworkByView,
  selectedSize: string,
  selectedColor: string,
  activeView: View,
): EditorSnapshot {
  return {
    artworkByView: cloneArtworkByView(artworkByView),
    selectedSize,
    selectedColor,
    activeView,
  };
}

function areSnapshotsEqual(a: EditorSnapshot, b: EditorSnapshot) {
  return (
    JSON.stringify({
      artworkByView: a.artworkByView,
      selectedSize: a.selectedSize,
      selectedColor: a.selectedColor,
      activeView: a.activeView,
    }) ===
    JSON.stringify({
      artworkByView: b.artworkByView,
      selectedSize: b.selectedSize,
      selectedColor: b.selectedColor,
      activeView: b.activeView,
    })
  );
}

function revokeArtworkObjectUrl(artwork: ArtworkState | undefined) {
  if (!artwork || artwork.type !== "image") return;
  const objectUrl = artwork.localObjectUrl || (artwork.imageUrl.startsWith("blob:") ? artwork.imageUrl : "");
  if (objectUrl) URL.revokeObjectURL(objectUrl);
}

function collectBlobUrls(artworkByView: ArtworkByView) {
  const urls = new Set<string>();

  Object.values(artworkByView).forEach((artwork) => {
    if (!artwork || artwork.type !== "image") return;
    if (artwork.localObjectUrl?.startsWith("blob:")) urls.add(artwork.localObjectUrl);
    if (artwork.imageUrl?.startsWith("blob:")) urls.add(artwork.imageUrl);
  });

  return urls;
}

function getObjectUrlsInArtworks(artworkByView: ArtworkByView) {
  return collectBlobUrls(artworkByView);
}

function revokeUnusedObjectUrls(
  currentArtworks: ArtworkByView,
  pastSnapshots: EditorSnapshot[],
  futureSnapshots: EditorSnapshot[],
  urlToCheck: string | undefined,
) {
  if (!urlToCheck || !urlToCheck.startsWith("blob:")) {
    return;
  }

  const keepUrls = new Set<string>();
  [currentArtworks, ...pastSnapshots.map((snapshot) => snapshot.artworkByView), ...futureSnapshots.map((snapshot) => snapshot.artworkByView)].forEach((artworks) => {
    getObjectUrlsInArtworks(artworks).forEach((value) => keepUrls.add(value));
  });

  if (!keepUrls.has(urlToCheck)) {
    URL.revokeObjectURL(urlToCheck);
  }
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

  const normalizedSelectedColor = selectedColor.trim().toLowerCase();
  const selectedColorImage = normalizedSelectedColor
    ? Object.entries(product.imageByColor || {}).find(
        ([color]) => color.trim().toLowerCase() === normalizedSelectedColor,
      )?.[1] || ""
    : "";
  const viewRole = getViewRole(activeView);
  const roleImage = product.images?.find((image) => {
    if (typeof image === "string") return false;
    const role = String(image.role || "").trim().toLowerCase();
    return role === viewRole;
  });
  const frontImage = product.images?.find((image) => {
    if (typeof image === "string") return false;
    const role = String(image.role || "").trim().toLowerCase();
    return role === "front";
  });

  if (activeView === "Front") {
    const directImage =
      selectedColorImage ||
      getImageUrl(roleImage) ||
      getImageUrl(frontImage) ||
      product.image ||
      getImageUrl(product.images?.[0]) ||
      product.previewPaths?.[0] ||
      "";

    return directImage ? getOptimizedImageUrl(directImage) : "";
  }

  const directImage = selectedColorImage || getImageUrl(roleImage) || "";
  return directImage ? getOptimizedImageUrl(directImage) : "";
}

function loadImageFromSrc(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

async function generateProductMockupDataUrl(
  baseImageUrl: string,
  artworks: ArtworkState[],
) {
  if (!baseImageUrl && artworks.length === 0) {
    return "";
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  try {
    const baseImage = baseImageUrl ? await loadImageFromSrc(baseImageUrl) : null;

    canvas.width = 1200;
    canvas.height = 1200;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (baseImage) {
      const baseWidth = baseImage.naturalWidth || baseImage.width || canvas.width;
      const baseHeight = baseImage.naturalHeight || baseImage.height || canvas.height;
      const scale = Math.min(canvas.width / baseWidth, canvas.height / baseHeight);
      const drawWidth = baseWidth * scale;
      const drawHeight = baseHeight * scale;
      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;
      context.drawImage(baseImage, offsetX, offsetY, drawWidth, drawHeight);
    }

    for (const entry of artworks) {
      try {
        const centerX = canvas.width / 2 + (entry.position.x / 100) * canvas.width * 0.45;
        const centerY = canvas.height / 2 + (entry.position.y / 100) * canvas.height * 0.45;

        context.save();
        context.translate(centerX, centerY);
        context.rotate((entry.rotation * Math.PI) / 180);
        if (entry.type === "image") {
          const artworkImage = await loadImageFromSrc(entry.imageUrl);
          const artworkWidth = Math.max(80, (canvas.width * (entry.size / 100)) * 0.9);
          const artworkHeight =
            (artworkImage.naturalHeight / artworkImage.naturalWidth || 1) * artworkWidth;
          context.drawImage(artworkImage, -artworkWidth / 2, -artworkHeight / 2, artworkWidth, artworkHeight);
        } else {
          context.fillStyle = entry.textColor;
          context.font = `${entry.fontSize * (entry.size / defaultDesignSize)}px ${entry.fontFamily}, sans-serif`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(entry.text, 0, 0);
        }
        context.restore();
      } catch (artErr) {
        console.warn("Unable to render mockup artwork", artErr);
      }
    }

    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("Unable to generate product mockup", err);
    return "";
  }
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
  const [past, setPast] = useState<EditorSnapshot[]>([]);
  const [future, setFuture] = useState<EditorSnapshot[]>([]);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<ArtworkInteraction | null>(null);
  const artworkUrlsRef = useRef<ArtworkByView>({});
  const knownBlobUrlsRef = useRef<Set<string>>(new Set());
  const activeArtwork = artworkByView[activeView];
  const activeTextArtwork = activeArtwork?.type === "text" ? activeArtwork : null;
  const activeArtworkUrl = activeArtwork?.type === "image" ? activeArtwork.imageUrl : "";
  const activeRotation = activeArtwork?.rotation ?? defaultRotation;
  const activeDesignSize = activeArtwork?.size ?? defaultDesignSize;
  const activePosition = activeArtwork?.position ?? defaultArtworkPosition;
  const activeUploadStatus = activeArtwork?.type === "image" ? activeArtwork.uploadStatus : "idle";
  const activeUploadError =
    uploadErrorsByView[activeView] ||
    (activeArtwork?.type === "image" ? activeArtwork.uploadError : "") ||
    "";
  const isActiveArtworkSelected = selectedArtworkView === activeView && Boolean(activeArtwork);
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
  const currentEditorSnapshot = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
  const defaultEditorSnapshot = useMemo(
    () => buildDefaultEditorSnapshot(availableSizes, availableColors),
    [availableSizes, availableColors],
  );
  const productIdentity = product?.id || product?._id || "";
  const previousProductIdentityRef = useRef(productIdentity);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const canReset = !areSnapshotsEqual(currentEditorSnapshot, defaultEditorSnapshot);

  useEffect(() => {
    artworkUrlsRef.current = artworkByView;
  }, [artworkByView]);

  useEffect(() => {
    const keptUrls = new Set<string>();
    [artworkByView, ...past.map((snapshot) => snapshot.artworkByView), ...future.map((snapshot) => snapshot.artworkByView)].forEach((viewArtworks) => {
      collectBlobUrls(viewArtworks).forEach((url) => keptUrls.add(url));
    });

    Array.from(knownBlobUrlsRef.current).forEach((url) => {
      if (!keptUrls.has(url)) {
        URL.revokeObjectURL(url);
        knownBlobUrlsRef.current.delete(url);
      }
    });
  }, [artworkByView, past, future]);

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

  useEffect(() => {
    if (previousProductIdentityRef.current === productIdentity) return;

    previousProductIdentityRef.current = productIdentity;
    setSelectedSize(availableSizes[0] || "M");
    setSelectedColor(availableColors[0]?.name || "White");
    setPast([]);
    setFuture([]);
  }, [availableColors, availableSizes, productIdentity]);

  function restoreEditorSnapshot(snapshot: EditorSnapshot) {
    setArtworkByView(cloneArtworkByView(snapshot.artworkByView));
    setSelectedSize(snapshot.selectedSize);
    setSelectedColor(snapshot.selectedColor);
    setActiveView(snapshot.activeView);
    setSelectedArtworkView(null);
  }

  function commitEditorHistory(before: EditorSnapshot, after: EditorSnapshot) {
    if (areSnapshotsEqual(before, after)) {
      return;
    }

    setPast((currentPast) => [...currentPast, before]);
    setFuture([]);
  }

  function handleSelectSize(size: string) {
    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const after = snapshotEditorState(artworkByView, size, selectedColor, activeView);

    setSelectedSize(size);
    commitEditorHistory(before, after);
  }

  function handleSelectColor(color: string) {
    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const after = snapshotEditorState(artworkByView, selectedSize, color, activeView);

    setSelectedColor(color);
    commitEditorHistory(before, after);
  }

  function handleSelectView(view: View) {
    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const after = snapshotEditorState(artworkByView, selectedSize, selectedColor, view);

    setActiveView(view);
    commitEditorHistory(before, after);
  }

  function handleUndo() {
    if (!canUndo) {
      return;
    }

    const currentSnapshot = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const previousSnapshot = past[past.length - 1];

    setPast((currentPast) => currentPast.slice(0, -1));
    setFuture((currentFuture) => [currentSnapshot, ...currentFuture]);
    restoreEditorSnapshot(previousSnapshot);
  }

  function handleRedo() {
    if (!canRedo) {
      return;
    }

    const currentSnapshot = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const nextSnapshot = future[0];

    setPast((currentPast) => [...currentPast, currentSnapshot]);
    setFuture((currentFuture) => currentFuture.slice(1));
    restoreEditorSnapshot(nextSnapshot);
  }

  function handleReset() {
    const currentSnapshot = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const initialSnapshot = buildDefaultEditorSnapshot(availableSizes, availableColors);

    if (areSnapshotsEqual(currentSnapshot, initialSnapshot)) {
      return;
    }

    setPast((currentPast) => [...currentPast, currentSnapshot]);
    setFuture([]);
    restoreEditorSnapshot(initialSnapshot);
  }

  function handleArtworkSelected(file: File) {
    const objectUrl = URL.createObjectURL(file);
    const uploadView = activeView;
    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);

    setUploadErrorsByView((current) => {
      const next = { ...current };
      delete next[uploadView];
      return next;
    });

    knownBlobUrlsRef.current.add(objectUrl);
    setArtworkByView((current) => {
      const previousArtwork = current[uploadView];
      const nextArtworks = {
        ...current,
        [uploadView]: {
          imageUrl: objectUrl,
          type: "image",
          rotation: previousArtwork?.rotation ?? defaultRotation,
          size: previousArtwork?.size ?? defaultDesignSize,
          position: previousArtwork?.position ?? defaultArtworkPosition,
          uploadStatus: "uploading",
          localObjectUrl: objectUrl,
        },
      };

      return nextArtworks;
    });

    const after = snapshotEditorState(
      {
        ...artworkByView,
        [uploadView]: {
          imageUrl: objectUrl,
          type: "image",
          rotation: artworkByView[uploadView]?.rotation ?? defaultRotation,
          size: artworkByView[uploadView]?.size ?? defaultDesignSize,
          position: artworkByView[uploadView]?.position ?? defaultArtworkPosition,
          uploadStatus: "uploading",
          localObjectUrl: objectUrl,
        },
      },
      selectedSize,
      selectedColor,
      activeView,
    );

    commitEditorHistory(before, after);
    setSelectedArtworkView(uploadView);
    void uploadArtworkForView(file, uploadView, objectUrl);
  }

  function handleArtworkRejected(message: string) {
    setUploadErrorsByView((current) => ({ ...current, [activeView]: message }));
  }

  function handleAddText(text: string, textColor: string) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const nextArtwork: TextArtworkState = {
      type: "text",
      text: trimmedText,
      textColor,
      fontSize: 42,
      fontFamily: "sans-serif",
      rotation: defaultRotation,
      size: defaultDesignSize,
      position: defaultArtworkPosition,
    };
    const nextArtworks = { ...artworkByView, [activeView]: nextArtwork };

    setArtworkByView(nextArtworks);
    setSelectedArtworkView(activeView);
    commitEditorHistory(before, snapshotEditorState(nextArtworks, selectedSize, selectedColor, activeView));
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

        if (!currentArtwork || currentArtwork.type !== "image" || currentArtwork.imageUrl !== localObjectUrl) {
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
        revokeUnusedObjectUrls(artworkByView, past, future, localObjectUrl);
      }
    } catch (err: any) {
      const message = err?.message || "Upload failed. Please try again.";

      setUploadErrorsByView((current) => ({ ...current, [view]: `Upload failed: ${message}` }));
      let removedLocalPreview = false;
      setArtworkByView((current) => {
        const currentArtwork = current[view];

        if (!currentArtwork || currentArtwork.type !== "image" || currentArtwork.imageUrl !== localObjectUrl) {
          return current;
        }

        removedLocalPreview = true;
        const next = { ...current };
        delete next[view];
        return next;
      });

      if (removedLocalPreview) {
        revokeUnusedObjectUrls(artworkByView, past, future, localObjectUrl);
        if (selectedArtworkView === view) setSelectedArtworkView(null);
      }
    }
  }

  function updateArtworkForView(
    view: View,
    settings: ArtworkSettings,
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
    settings: ArtworkSettings,
  ) {
    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    updateArtworkForView(activeView, settings);
    const after = snapshotEditorState(
      {
        ...artworkByView,
        [activeView]: {
          ...artworkByView[activeView],
          ...settings,
        },
      },
      selectedSize,
      selectedColor,
      activeView,
    );
    commitEditorHistory(before, after);
  }

  function handleTextFontSizeChange(fontSize: number) {
    if (!activeTextArtwork) return;

    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const nextArtworks = {
      ...artworkByView,
      [activeView]: {
        ...activeTextArtwork,
        fontSize,
      },
    };

    updateArtworkForView(activeView, { fontSize });
    commitEditorHistory(before, snapshotEditorState(nextArtworks, selectedSize, selectedColor, activeView));
  }

  function handleTextColorChange(textColor: string) {
    if (!activeTextArtwork) return;

    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const nextArtworks = {
      ...artworkByView,
      [activeView]: {
        ...activeTextArtwork,
        textColor,
      },
    };

    updateArtworkForView(activeView, { textColor });
    commitEditorHistory(before, snapshotEditorState(nextArtworks, selectedSize, selectedColor, activeView));
  }

  function handleDeleteActiveArtwork() {
    const before = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);
    const nextArtworks = { ...artworkByView };
    delete nextArtworks[activeView];

    setArtworkByView(nextArtworks);
    setUploadErrorsByView((current) => {
      const next = { ...current };
      delete next[activeView];
      return next;
    });
    setSelectedArtworkView(null);
    commitEditorHistory(before, snapshotEditorState(nextArtworks, selectedSize, selectedColor, activeView));
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

    const startSnapshot = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);

    if (mode === "move") {
      interactionRef.current = {
        mode,
        view: activeView,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPosition: activePosition,
        startSize: activeDesignSize,
        previewRect,
        startSnapshot,
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
        startSnapshot,
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
        startSnapshot,
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
    const interaction = interactionRef.current;
    const currentSnapshot = snapshotEditorState(artworkByView, selectedSize, selectedColor, activeView);

    if (interaction && !areSnapshotsEqual(interaction.startSnapshot, currentSnapshot)) {
      setPast((currentPast) => [...currentPast, interaction.startSnapshot]);
      setFuture([]);
    }

    interactionRef.current = null;
    document.removeEventListener("pointermove", handleArtworkPointerMove);
    document.removeEventListener("pointerup", stopArtworkInteraction);
    document.removeEventListener("pointercancel", stopArtworkInteraction);
  }

  async function handleAddToCart() {
    const artworkEntries = views
      .map((view) => {
        const artwork = artworkByView[view];
        if (!artwork) return null;
        return { view, artwork };
      })
      .filter((entry): entry is { view: View; artwork: ArtworkState } => Boolean(entry));

    if (artworkEntries.some(({ artwork }) => artwork.type === "image" && artwork.uploadStatus === "uploading")) {
      toast.error("Please wait for your image to finish uploading.");
      return;
    }

    if (
      artworkEntries.some(
        ({ artwork }) => artwork.type === "image" && artwork.imageUrl.startsWith("blob:"),
      )
    ) {
      toast.error("Please wait for your image to finish uploading.");
      return;
    }

    if (product?.productType === "blank" && artworkEntries.length === 0) {
      toast.error("Please add your artwork before adding this custom item to your cart.");
      return;
    }

    const artworks = artworkEntries.map(({ view, artwork }) => ({ view, ...artwork }));
    const mockupArtworks = artworkEntries.map(({ artwork }) => artwork);
    const primaryArtworkUrl = artworkEntries.find(({ artwork }) => artwork.type === "image")?.artwork.imageUrl;
    const productId = product?.id || product?._id || productSku;
    const finalMockupUrl = await generateProductMockupDataUrl(productImage, mockupArtworks);
    const customizationPayload = {
      productType: product?.productType || "pre-designed",
      sku: productSku,
      size: selectedSize,
      color: selectedColor,
      printFee,
      basePrice: productPrice,
      totalPrice,
      image: finalMockupUrl || productImage,
      mockupUrl: finalMockupUrl || productImage,
      designUrl: primaryArtworkUrl || "",
      artworks,
      artworkByView,
      view: activeView,
      variantId: product?.id || product?._id || "",
    };
    const productArg = {
      id: String(productId),
      _id: product?._id,
      name: productName,
      sku: productSku,
      price: totalPrice,
      image: finalMockupUrl || productImage,
      category: "Custom",
      material: "",
      colors: availableColors.map((color) => color.name),
      rating: 0,
      reviews: 0,
      options: selectedSize,
      size: selectedSize,
      color: selectedColor,
      productType: product?.productType,
      sizes: availableSizes,
    };

    addItem(productArg as any, 1, customizationPayload);
    toast.success(`${productName} added to cart`);
  }

  return (
    <section className="bg-background text-foreground">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
              <Link to="/" className="hover:text-accent">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Customisable Blanks</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="truncate text-foreground">{productName}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 border-border"
                      onClick={handleUndo}
                      disabled={!canUndo}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Undo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 border-border"
                      onClick={handleRedo}
                      disabled={!canRedo}
                    >
                      <RotateCw className="h-4 w-4" />
                      Redo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 border-border text-destructive"
                      onClick={handleReset}
                      disabled={!canReset}
                    >
                      <X className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <Link to="/templates" className="text-sm font-semibold text-foreground hover:text-accent">
              &larr; Back to Product
            </Link>
            <div className="text-left lg:text-center">
              <h1 className="text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
                {productName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                SKU {productSku} / {selectedColor} / {selectedSize}
              </p>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="min-w-0">
          <div
            ref={previewAreaRef}
            onPointerDown={() => setSelectedArtworkView(null)}
            className="relative mx-auto aspect-[4/3] w-full max-w-[620px] overflow-hidden rounded-lg border border-border bg-nude shadow-sm sm:aspect-square lg:min-h-[560px]"
          >
            <div className="absolute left-4 top-4 z-10 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              {activeView}
            </div>
            {productImage ? (
              <img
                src={productImage}
                alt={`${productName} ${activeView.toLowerCase()} preview`}
                draggable={false}
                className="h-full w-full select-none object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">
                No image available for this view
              </div>
            )}
            {activeArtwork ? (
              <div
                className={`absolute touch-none text-foreground ${
                  isActiveArtworkSelected ? "outline outline-2 outline-accent" : ""
                }`}
                style={{
                  width: `${40 * (activeDesignSize / 100)}%`,
                  left: `calc(50% + ${activePosition.x}%)`,
                  top: `calc(50% + ${activePosition.y}%)`,
                  transform: `translate(-50%, -50%) rotate(${activeRotation}deg)`,
                }}
                onPointerDown={(event) => startArtworkInteraction(event, "move")}
              >
                {activeArtwork.type === "image" ? (
                  <>
                    <img
                      src={activeArtworkUrl}
                      alt={`${activeView} uploaded artwork preview`}
                      draggable={false}
                      className="block max-h-48 w-full select-none object-contain"
                    />
                    {activeUploadStatus === "uploading" ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-card/55">
                        <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-accent shadow-sm ring-1 ring-accent/20">
                          Uploading...
                        </span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    className="flex min-h-16 items-center justify-center whitespace-pre-wrap text-center"
                    style={{
                      color: activeArtwork.textColor,
                      fontFamily: activeArtwork.fontFamily,
                      fontSize: `${activeArtwork.fontSize}px`,
                      lineHeight: 1.1,
                    }}
                  >
                    {activeArtwork.text}
                  </div>
                )}
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
                      className="absolute -right-8 -top-8 flex h-7 w-7 items-center justify-center rounded-full bg-card text-destructive shadow ring-1 ring-destructive/20 hover:bg-accent/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Rotate artwork"
                      onPointerDown={(event) => startArtworkInteraction(event, "rotate")}
                      className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-8 rounded-full border-2 border-card bg-accent shadow"
                    />
                    {["left-0 top-0", "right-0 top-0", "bottom-0 left-0", "bottom-0 right-0"].map(
                      (positionClass) => (
                        <button
                          key={positionClass}
                          type="button"
                          aria-label="Resize artwork"
                          onPointerDown={(event) => startArtworkInteraction(event, "resize")}
                          className={`absolute h-4 w-4 rounded-full border-2 border-card bg-accent shadow ${positionClass} ${
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

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {views.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => handleSelectView(view)}
                className={`relative flex h-24 flex-col items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors ${
                  activeView === view
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-muted-foreground hover:border-accent"
                }`}
              >
                {artworkByView[view] ? (
                  <span
                    className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card"
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
          <div className="rounded-lg border border-border bg-card">
            <div className="grid grid-cols-3 border-b border-border">
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
                  onSelectSize={handleSelectSize}
                  onSelectColor={handleSelectColor}
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
              {activeTab === "text" ? (
                <TextPanel
                  activeFontSize={activeTextArtwork?.fontSize}
                  activeTextColor={activeTextArtwork?.textColor}
                  onAddText={handleAddText}
                  onFontSizeChange={handleTextFontSizeChange}
                  onTextColorChange={handleTextColorChange}
                />
              ) : null}
            </div>
          </div>

          <div className="sticky bottom-0 mt-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:top-24 lg:bottom-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{productName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatPrice(totalPrice)}</p>
              </div>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                Custom
              </span>
            </div>
            <Button
              className="mt-4 h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={handleAddToCart}
            >
              Add to Cart • {formatPrice(totalPrice)}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Configurator preview only</p>
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
          ? "border-accent bg-accent/10 text-accent"
          : "border-transparent text-muted-foreground hover:text-foreground"
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
          <h2 className="text-sm font-bold text-foreground">Size</h2>
          <span className="text-xs font-medium text-accent">Most ordered: M</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onSelectSize(size)}
              className={`h-10 min-w-12 rounded-full border px-4 text-sm font-semibold transition-colors ${
                selectedSize === size
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-accent"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">Color</h2>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => onSelectColor(color.name)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                selectedColor === color.name
                  ? "border-accent ring-2 ring-accent/20"
                  : "border-border"
              }`}
              aria-label={color.name}
            >
              <span
                className="h-8 w-8 rounded-full border border-border"
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
            ? "border-accent bg-accent/10"
            : "border-border bg-nude/50 hover:border-accent hover:bg-nude"
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
        <Upload className="h-9 w-9 text-accent" />
        <p className="mt-3 text-sm font-semibold text-foreground">Drop your artwork here</p>
        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP</p>
        <p className="mt-2 text-xs font-medium text-accent">{activeView}</p>
      </div>
      {uploadError ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
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

function TextPanel({
  activeFontSize,
  activeTextColor,
  onAddText,
  onFontSizeChange,
  onTextColorChange,
}: {
  activeFontSize?: number;
  activeTextColor?: string;
  onAddText: (text: string, textColor: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  onTextColorChange: (textColor: string) => void;
}) {
  const [text, setText] = useState("OsanPrints");
  const [textColor, setTextColor] = useState(textColors[0]);
  const [fontSize, setFontSize] = useState(42);

  useEffect(() => {
    if (activeFontSize !== undefined) {
      setFontSize(activeFontSize);
    }
    if (activeTextColor !== undefined) {
      setTextColor(activeTextColor);
    }
  }, [activeFontSize, activeTextColor]);

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-bold text-foreground" htmlFor="design-text">
          Text
        </label>
        <Input
          id="design-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-11 border-border"
        />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-bold text-foreground">Text Color</h2>
        <div className="flex gap-3">
          {textColors.map((color) => (
            <button
              type="button"
              key={color}
              onClick={() => {
                setTextColor(color);
                onTextColorChange(color);
              }}
              className={`h-9 w-9 rounded-full border ${
                textColor === color ? "border-accent ring-2 ring-accent/20" : "border-border"
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Use ${color} text`}
            />
          ))}
        </div>
      </div>
      <RangeControl
        icon={<Type className="h-4 w-4" />}
        label="Font Size"
        min={12}
        max={96}
        value={fontSize}
        displayValue={`${fontSize}px`}
        onChange={(value) => {
          setFontSize(value);
          onFontSizeChange(value);
        }}
      />
      <Button
        variant="outline"
        className="h-11 w-full border-accent font-semibold text-accent"
        onClick={() => onAddText(text, textColor)}
      >
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
        <span className="flex items-center gap-2 font-semibold text-foreground">
          {icon}
          {label}
        </span>
        <span className="text-muted-foreground">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full accent-accent disabled:cursor-not-allowed disabled:opacity-50"
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
        <span className="flex items-center gap-2 font-semibold text-foreground">
          {icon}
          {label}
        </span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 w-2/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}

export default ProductConfigurator;
