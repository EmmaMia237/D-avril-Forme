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
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { apiFetch } from "@/lib/api-client";
import { getOptimizedImageUrl } from "@/lib/cloudinary";
import { products as fallbackProducts, type Product } from "@/lib/shop-data";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/printing-image.png";

type ProductReview = {
  id: string;
  isMine?: boolean;
  userName: string;
  rating: number;
  comment: string;
  createdAt?: string;
};

function ReviewStars({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = <Star className={`h-4 w-4 ${star <= Math.round(rating) ? "fill-current text-accent" : "text-muted-foreground"}`} />;
        return interactive ? (
          <button key={star} type="button" aria-label={`Rate ${star} out of 5`} onClick={() => onSelect?.(star)}>
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        );
      })}
    </div>
  );
}

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
  return getOptimizedImageUrl(directImage);
}

function getProductId(product?: Product | null) {
  return String(product?.id || (product as any)?._id || (product as any)?.sku || "");
}

function normalizeProduct(raw: any): Product {
  const image =
    raw?.image ||
    raw?.images?.find?.((item: any) => item?.role === "front")?.url ||
    raw?.images?.[0]?.url ||
    raw?.previewPaths?.[0] ||
    "";

  return {
    ...raw,
    id: getProductId(raw),
    category: raw?.category || "Products",
    material: raw?.material || "Premium print-ready material",
    colors: Array.isArray(raw?.colors) ? raw.colors : [],
    price: Number(raw?.price || 0),
    rating: Number(raw?.rating ?? 0),
    reviews: Number(raw?.reviewCount ?? raw?.reviews ?? 0),
    reviewCount: Number(raw?.reviewCount ?? raw?.reviews ?? 0),
    options: raw?.options || "",
    image,
    sizes: Array.isArray(raw?.sizes) ? raw.sizes : [],
    imageByColor: raw?.imageByColor || {},
  };
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
  const currentId = getProductId(currentProduct);
  const currentCategory = currentProduct.category?.toLowerCase();
  const scored = allProducts
    .filter((product) => getProductId(product) !== currentId)
    .filter((product) => !currentCategory || product.category?.toLowerCase() === currentCategory)
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => entry.product);

  return scored;
}

function ProductPage() {
  const { id } = useParams({}) as { id?: string };
  const formatEur = (v: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(v);
  const navigate = useNavigate();
  const { addItem, closeCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [activeImage, setActiveImage] = useState<string>("");
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"details" | "care" | "shipping">("details");
  const [liked, setLiked] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewUserId, setReviewUserId] = useState<string | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);

  // Use router params for the id
  const productId = id ?? "";


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
        const serverProduct = data?.product ? normalizeProduct(data.product) : null;
        const localMatch = fallbackProducts.find(
          (item) =>
            item.id === productId ||
            item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === productId.toLowerCase() ||
            item.category.toLowerCase().replace(/[^a-z0-9]+/g, "-") === productId.toLowerCase(),
        );

        const nextProduct = serverProduct || localMatch;

        if (active) {
          setProduct(nextProduct ?? null);
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
    if (!productId || !window.localStorage.getItem("af_auth_token")) return;
    let active = true;
    apiFetch("/api/favorites")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.productIds)) setLiked(data.productIds.includes(productId));
      })
      .catch((error) => console.error("Failed to load favorite state", error));
    return () => {
      active = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    async function loadReviewAccess() {
      try {
        const reviewResponse = await apiFetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
        const reviewData = await reviewResponse.json().catch(() => ({}));
        if (!active) return;
        setReviews(Array.isArray(reviewData?.reviews) ? reviewData.reviews : []);

        const meResponse = await apiFetch("/api/auth/me");
        const me = await meResponse.json().catch(() => ({}));
        const userId = me?.authenticated && me?.user?.id ? String(me.user.id) : null;
        setReviewUserId(userId);
        if (!userId) return;

        const ordersResponse = await apiFetch("/api/my-orders");
        const ordersData = await ordersResponse.json().catch(() => ({}));
        setHasPurchased(
          Array.isArray(ordersData?.orders) &&
            ordersData.orders.some((order: any) =>
              order.items?.some((item: any) => String(item.productId || "") === String(productId)),
            ),
        );
      } catch (error) {
        console.error("Failed to load product reviews", error);
      }
    }
    loadReviewAccess();
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
    setImageLoadFailed(false);
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

    images.forEach((image) => set.add(getOptimizedImageUrl(image)));
    return Array.from(set).slice(0, 6);
  }, [product, selectedColor]);

  useEffect(() => {
    if (galleryImages.length === 0) return;
    if (!galleryImages.includes(activeImage)) setActiveImage(galleryImages[0] ?? "");
    setImageLoadFailed(false);
  }, [galleryImages, activeImage]);

  const currentProduct = product ?? null;
  useEffect(() => {
    let active = true;

    async function loadSimilarProducts() {
      if (!currentProduct) {
        setAllProducts([]);
        return;
      }

      try {
        const query = currentProduct.category
          ? `?category=${encodeURIComponent(currentProduct.category)}&limit=8`
          : "?limit=8";
        const res = await apiFetch(`/api/products${query}`);
        const data = await res.json().catch(() => ({}));
        const serverProducts = Array.isArray(data?.products)
          ? data.products.map((item: any) => normalizeProduct({ category: currentProduct.category, ...item }))
          : [];

        if (active) setAllProducts(serverProducts);
      } catch (error) {
        if (active) setAllProducts([]);
      }
    }

    loadSimilarProducts();
    return () => {
      active = false;
    };
  }, [currentProduct]);

  const sizeOptions = currentProduct?.sizes?.length ? currentProduct.sizes : ["S", "M", "L", "XL", "XXL"];
  const colorOptions = currentProduct?.colors?.length ? currentProduct.colors : ["Cream", "Maroon", "Charcoal"];
  const listPrice = Number(currentProduct?.price || 0) * 1.4;
  const discountValue = Math.max(10, Math.round(((listPrice - Number(currentProduct?.price || 0)) / listPrice) * 100));
  const similarProducts = useMemo(() => getSimilarProducts(currentProduct, allProducts), [currentProduct, allProducts]);
  const mainImage = currentProduct ? activeImage || getProductImage(currentProduct, selectedColor) || currentProduct.image : "";
  const existingReview = reviews.find((review) => review.isMine);

  async function toggleFavorite() {
    if (!productId) return;
    if (!window.localStorage.getItem("af_auth_token")) {
      toast("Log in to save favorites");
      navigate({ to: "/auth" });
      return;
    }
    try {
      const response = await apiFetch(`/api/favorites/${encodeURIComponent(productId)}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "Unable to update wishlist");
        return;
      }
      setLiked(Boolean(data.favorited));
      toast.success(data.favorited ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      console.error("Failed to update favorite", error);
      toast.error("Unable to update wishlist");
    }
  }

  async function submitReview() {
    if (!reviewRating || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      const response = await apiFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating: reviewRating, comment: reviewComment }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "Unable to submit review");
        return;
      }
      setReviews((current) => [data.review, ...current]);
      setProduct((current) => {
        if (!current) return current;
        const nextCount = Number(current.reviewCount ?? current.reviews ?? 0) + 1;
        const nextRating =
          (Number(current.rating ?? 0) * (nextCount - 1) + Number(data.review.rating)) / nextCount;
        return { ...current, rating: Number(nextRating.toFixed(2)), reviews: nextCount, reviewCount: nextCount };
      });
      setReviewRating(0);
      setReviewComment("");
      toast.success("Review submitted");
    } catch (error) {
      console.error("Submit review failed", error);
      toast.error("Unable to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

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
          <Link to="/" className="font-medium text-muted-foreground hover:text-accent">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/categories" className="font-medium text-muted-foreground hover:text-accent">
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
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm">
                SKU {getProductId(currentProduct)}
              </div>
              {mainImage && !imageLoadFailed ? (
                <img
                  src={mainImage}
                  alt={currentProduct.name}
                  className="block h-auto min-h-[280px] w-full object-cover transition-transform duration-300 sm:h-[420px] md:h-[560px]"
                  onError={() => setImageLoadFailed(true)}
                />
              ) : (
                <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 bg-muted px-6 text-center sm:h-[420px] md:h-[560px]">
                  <img
                    src={PRODUCT_PLACEHOLDER_IMAGE}
                    alt=""
                    className="h-28 w-28 rounded-xl object-cover opacity-70"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">No product image available</p>
                    <p className="mt-1 text-xs text-muted-foreground">Image pending</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {galleryImages.map((image) => (
                <button
                  key={image}
                  type="button"
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition-all ${
                    activeImage === image ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-accent"
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{currentProduct.category}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{currentProduct.name}</h1>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ReviewStars rating={Number(currentProduct.rating ?? 0)} />
              <span className="font-medium text-foreground">{Number(currentProduct.rating ?? 0).toFixed(1)}</span>
              <span>({currentProduct.reviewCount ?? currentProduct.reviews ?? 0} reviews)</span>
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
                  <button type="button" className="text-xs font-medium text-accent hover:text-primary">
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
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-foreground hover:border-accent hover:text-accent"
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
                        selectedColor === color ? "border-accent ring-2 ring-accent/20" : "border-border"
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary-deep active:scale-[0.99]"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3.5 text-foreground hover:bg-muted"
                onClick={toggleFavorite}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current text-primary" : "text-slate-700"}`} />
                Wishlist
              </Button>
            </div>

            <div className="grid gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" />
                <span>Fast shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>Protected quality</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
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

        <section className="border-t border-border pt-8">
          <h2 className="text-2xl font-bold text-foreground">Reviews</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reviews.length ? `${reviews.length} customer review${reviews.length === 1 ? "" : "s"}` : "No reviews yet"}
          </p>
          {reviewUserId && hasPurchased && !existingReview ? (
            <div className="my-6 rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground">Write a Review</h3>
              <div className="mt-3"><ReviewStars rating={reviewRating} interactive onSelect={setReviewRating} /></div>
              <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Tell other customers what you think (optional)" className="mt-4 min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary" />
              <Button className="mt-3" disabled={!reviewRating || reviewSubmitting} onClick={submitReview}>
                {reviewSubmitting ? "Submitting..." : "Submit review"}
              </Button>
            </div>
          ) : !reviewUserId ? (
            <p className="my-6 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
              <Link to="/auth" className="font-semibold text-primary hover:underline">Log in</Link> to leave a review.
            </p>
          ) : existingReview ? (
            <p className="my-6 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">You have already reviewed this product.</p>
          ) : null}
          <div className="grid gap-4">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-semibold text-foreground">{review.userName}</p><ReviewStars rating={review.rating} /></div>
                  <time className="text-xs text-muted-foreground">{review.createdAt ? new Intl.DateTimeFormat("en-IE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(review.createdAt)) : "—"}</time>
                </div>
                {review.comment ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <div className="border-t border-slate-200 pt-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-black">Similar Products</h2>
            <span className="text-sm text-slate-500">More like this</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {similarProducts.map((item) => {
              const itemImage = getProductImage(item, item.colors?.[0]) || item.image;

              return (
                <article key={getProductId(item)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <button type="button" onClick={() => goToProduct(item)} className="block w-full text-left">
                    <div className="overflow-hidden bg-slate-50">
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={item.name}
                          className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-56 w-full flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
                          <img src={PRODUCT_PLACEHOLDER_IMAGE} alt="" className="h-16 w-16 rounded-lg object-cover opacity-70" />
                          <span className="text-xs font-medium text-slate-500">No image available</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{item.category}</p>
                      <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-accent">{formatEur(Number(item.price || 0))}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{item.colors?.length || 1} colors</span>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button variant="outline" className="flex-1" onClick={toggleFavorite}>
            <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current text-primary" : "text-slate-700"}`} />
            Save
          </Button>
          <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-deep" onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}

export { ProductPage };
