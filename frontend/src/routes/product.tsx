import {
  ArrowLeft,
  ChevronRight,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { Link, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { apiFetch } from "@/lib/api-client";
import { products as fallbackProducts, type Product } from "@/lib/shop-data";

export const Route = createFileRoute("/product")({
  head: () => ({ meta: [{ title: "Product — Avril Forme" }] }),
  component: ProductPage,
});

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "for",
  "with",
  "in",
  "on",
  "of",
  "to",
  "by",
  "our",
  "your",
  "from",
  "print",
  "design",
  "collection",
  "custom",
]);

function getProductImage(product?: Product | null, colorOverride?: string) {
  if (!product) return "";
  const map = (product as any)?.imageByColor ?? {};
  const selected = colorOverride ? map[colorOverride] : null;
  const directImage =
    selected ||
    (product as any)?.image ||
    (product as any)?.images?.[0]?.url ||
    (product as any)?.previewPaths?.[0] ||
    "";
  return directImage;
}

function getKeywordSet(label: string) {
  return (label || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word));
}

function getSimilarProducts(currentProduct: Product | null, allProducts: Product[]) {
  if (!currentProduct) return [];

  const currentKeywords = new Set(getKeywordSet(currentProduct.name));
  const scored = allProducts
    .filter((product) => product.id !== currentProduct.id)
    .map((product) => {
      let score = 0;
      if (product.category === currentProduct.category) score += 8;
      if ((product as any)?.theme === (currentProduct as any)?.theme) score += 2;

      const keywords = getKeywordSet(product.name);
      const overlap = keywords.filter((word) => currentKeywords.has(word));
      score += overlap.length * 3;

      if (product.category?.toLowerCase().includes(currentProduct.category.toLowerCase())) score += 2;
      if (currentProduct.name.toLowerCase().includes(product.category.toLowerCase())) score += 1;

      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.product);

  if (scored.length >= 4) return scored;

  const fallback = allProducts
    .filter((product) => product.id !== currentProduct.id)
    .sort((a, b) => Number(b.rating || 0) * Number(b.reviews || 0) - Number(a.rating || 0) * Number(a.reviews || 0));

  return [...scored, ...fallback].filter((product, index, arr) => arr.findIndex((item) => item.id === product.id) === index).slice(0, 6);
}

function ProductPage() {
  const formatEur = (v: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(v);
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, closeCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>(fallbackProducts);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [activeImage, setActiveImage] = useState<string>("");
  const [expandedSection, setExpandedSection] = useState<"details" | "care" | "shipping">("details");
  const [liked, setLiked] = useState(false);

  const productId = useMemo(() => {
    const searchId = (location.search as Record<string, string | undefined>)?.id;
    if (searchId) return searchId;
    const fallbackPath = window.location.pathname.match(/\/product\/([^/?]+)/)?.[1];
    return fallbackPath || "";
  }, [location.pathname, location.search]);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!productId) {
        setProduct(null);
        return;
      }

      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(productId)}`);
        const data = await res.json().catch(() => ({}));
        const serverProduct = data?.product ?? null;
        const localMatch = fallbackProducts.find(
          (item) =>
            item.id === productId ||
            item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === productId.toLowerCase() ||
            item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") === productId.toLowerCase(),
        );

        const nextProduct = serverProduct || localMatch;

        if (active) {
          setProduct(nextProduct ?? null);
          setAllProducts(fallbackProducts);
        }
      } catch (error) {
        const localMatch = fallbackProducts.find(
          (item) => item.id === productId || item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === productId.toLowerCase(),
        );
        if (active) setProduct(localMatch ?? null);
      }
    }

    loadProduct();
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    const nextColor = product.colors?.[0] || "";
    setSelectedColor(nextColor);
    setSelectedSize(product.sizes?.[0] || "M");
    const initialImage = getProductImage(product, nextColor) || product.image || "";
    setActiveImage(initialImage);
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const set = new Set<string>();
    const images = [
      getProductImage(product, selectedColor),
      product.image,
      ...Object.values(product.imageByColor || {}),
      ...(Array.isArray((product as any)?.images) ? (product as any).images.map((item: any) => item?.url || item) : []),
      ...(Array.isArray((product as any)?.previewPaths) ? (product as any).previewPaths : []),
    ]
      .filter(Boolean)
      .map((item) => String(item));

    images.forEach((image) => set.add(image));
    return Array.from(set).slice(0, 6);
  }, [product, selectedColor]);

  useEffect(() => {
    if (galleryImages.length === 0) return;
    if (!galleryImages.includes(activeImage)) setActiveImage(galleryImages[0]);
  }, [galleryImages, activeImage]);

  const currentProduct = product ?? null;
  const sizeOptions = currentProduct?.sizes?.length ? currentProduct.sizes : ["S", "M", "L", "XL", "XXL"];
  const colorOptions = currentProduct?.colors?.length ? currentProduct.colors : ["Cream", "Maroon", "Charcoal"];
  const listPrice = Number(currentProduct?.price || 0) * 1.4;
  const discountValue = Math.max(10, Math.round(((listPrice - Number(currentProduct?.price || 0)) / listPrice) * 100));
  const similarProducts = useMemo(() => getSimilarProducts(currentProduct, allProducts), [currentProduct, allProducts]);

  const handleAddToCart = () => {
    if (!currentProduct) return;

    const variantImage = getProductImage(currentProduct, selectedColor) || activeImage || currentProduct.image;
    addItem(currentProduct, 1, {
      productType: currentProduct.productType ?? "pre-designed",
      size: selectedSize,
      color: selectedColor,
      image: variantImage,
    });
    closeCart();
    toast.success(`${currentProduct.name} added to cart`);
  };

  const goToProduct = (item: Product) => {
    const targetId = item.id || item.name;
    try {
        navigate({ to: `/product/${encodeURIComponent(String(targetId))}` });
      } catch (e) {
        window.location.href = `/product/${encodeURIComponent(String(targetId))}`;
      }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!currentProduct) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center lg:px-8">
          <p className="text-sm text-muted-foreground">Product not found.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Back to shop
          </Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="font-medium text-slate-600 hover:text-orange-500">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/categories" className="font-medium text-slate-600 hover:text-orange-500">
            Categories
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-700">{currentProduct.category}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate text-slate-900">{currentProduct.name}</span>
        </nav>

        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" className="flex items-center gap-2 px-0 text-slate-700 hover:text-black" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Button>
        </div>

        <div className="grid w-full grid-cols-1 gap-8 pb-24 md:pb-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm">
                SKU {currentProduct.id}
              </div>
              <img
                src={activeImage || getProductImage(currentProduct, selectedColor) || currentProduct.image}
                alt={currentProduct.name}
                className="h-[420px] w-full object-cover transition-transform duration-300 md:h-[560px]"
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {galleryImages.map((image) => (
                <button
                  key={image}
                  type="button"
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition-all ${
                    activeImage === image ? "border-orange-500 ring-2 ring-orange-200" : "border-slate-200 hover:border-orange-300"
                  }`}
                  onClick={() => setActiveImage(image)}
                >
                  <img src={image} alt="Product gallery" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">{currentProduct.category}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-black md:text-4xl">{currentProduct.name}</h1>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="flex items-center gap-1 text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <span className="font-medium text-black">{Number(currentProduct.rating || 4.8).toFixed(1)}</span>
              <span>({currentProduct.reviews || 0} reviews)</span>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-black">{formatEur(Number(currentProduct.price || 0))}</span>
              <span className="text-lg text-slate-400 line-through">{formatEur(Number(listPrice || currentProduct.price || 0))}</span>
              <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-semibold text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                Save {discountValue}%
              </span>
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-black">Size</p>
                  <button type="button" className="text-xs font-medium text-orange-500 hover:text-orange-600">
                    Size chart
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-all ${
                        selectedSize === size
                          ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-orange-400 hover:text-orange-500"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-pink-600">Only 2 left in this size</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-black">Color</p>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Select ${color}`}
                      onClick={() => {
                        setSelectedColor(color);
                        const nextImage = getProductImage(currentProduct, color) || getProductImage(currentProduct, selectedColor) || currentProduct.image;
                        setActiveImage(nextImage);
                      }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                        selectedColor === color ? "border-orange-500 ring-2 ring-orange-200" : "border-slate-200"
                      }`}
                    >
                      <span
                        className="block h-6 w-6 rounded-full border border-slate-200"
                        style={{ backgroundColor: color.toLowerCase().includes("maroon") ? "#7d2d3b" : color.toLowerCase().includes("charcoal") ? "#1f2937" : color.toLowerCase().includes("cream") ? "#f4e9dc" : "#d4d4d8" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-orange-600 active:scale-[0.99]"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3.5 text-slate-800 hover:bg-slate-50"
                onClick={() => setLiked((value) => !value)}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-pink-500 text-pink-500" : "text-slate-700"}`} />
                Wishlist
              </Button>
            </div>

            <div className="grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <span>Fast shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-orange-500" />
                <span>Protected quality</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>Print ready</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 mb-10 border-t border-slate-200 pt-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { key: "details", title: "Product Details", content: `${currentProduct.name} is crafted in ${currentProduct.material}. Designed for a premium everyday feel with a soft finish, vibrant print detail, and a tailored fit for modern gifting and branding needs.` },
              { key: "care", title: "Material & Care", content: "Machine wash cold on a gentle cycle. Wash inside out. Tumble dry low or air dry. Avoid bleach and direct high heat to preserve print quality." },
              { key: "shipping", title: "Store & Fulfillment", content: "Every order is proudly printed in-house and shipped with secure packaging. We offer a 14-day return window for eligible products and a satisfaction guarantee on every order." },
            ].map((section) => (
              <div key={section.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedSection(expandedSection === section.key ? "details" : (section.key as any))}
                >
                  <span className="font-semibold text-black">{section.title}</span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${expandedSection === section.key ? "rotate-90" : ""}`} />
                </button>
                {expandedSection === section.key && <p className="mt-3 text-sm leading-6 text-slate-600">{section.content}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-black">Similar Products</h2>
            <span className="text-sm text-slate-500">More like this</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {similarProducts.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <button type="button" onClick={() => goToProduct(item)} className="block w-full text-left">
                  <div className="overflow-hidden bg-slate-50">
                    <img
                      src={getProductImage(item, item.colors?.[0]) || item.image}
                      alt={item.name}
                      className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-500">{item.category}</p>
                    <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-500 font-bold">{formatEur(Number(item.price || 0))}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{item.colors?.length || 1} colors</span>
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setLiked((value) => !value)}>
            <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-pink-500 text-pink-500" : "text-slate-700"}`} />
            Save
          </Button>
          <Button className="flex-1 bg-orange-500 text-white hover:bg-orange-600" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}

export { ProductPage };
