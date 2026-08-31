import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { StoreLayout } from "@/components/store-layout";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/categories/$slug")({
  head: () => ({
    meta: [
      { title: "Category — OsanPrints" },
      { name: "description", content: "Browse products in this print category." },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [category, setCategory] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCategory() {
      setLoading(true);
      try {
        const categoriesResponse = await apiFetch("/api/categories");
        const categoriesData = await categoriesResponse.json().catch(() => ({}));
        const categories = Array.isArray(categoriesData?.categories) ? categoriesData.categories : [];
        const matchedCategory = categories.find(
          (item: any) => String(item.slug || "").toLowerCase() === String(slug).toLowerCase(),
        );

        if (!matchedCategory) {
          if (active) {
            setCategory(null);
            setProducts([]);
            setLoading(false);
          }
          return;
        }

        const values = [matchedCategory.slug, matchedCategory.name].filter(
          (value, index, array) => value && array.indexOf(value) === index,
        );
        let matchedProducts: any[] = [];
        for (const value of values) {
          const response = await apiFetch(`/api/products?category=${encodeURIComponent(value)}&limit=1000`);
          const data = await response.json().catch(() => ({}));
          if (response.ok && Array.isArray(data?.products) && data.products.length > 0) {
            matchedProducts = data.products;
            break;
          }
        }

        if (active) {
          setCategory(matchedCategory);
          setProducts(matchedProducts.map((product: any) => ({ ...product, id: product.id || product._id })));
          setLoading(false);
        }
      } catch (error) {
        console.error("Unable to load category", error);
        if (active) {
          setCategory(null);
          setProducts([]);
          setLoading(false);
        }
      }
    }

    loadCategory();
    return () => {
      active = false;
    };
  }, [slug]);

  const categoryName = category?.name || slug;

  return (
    <StoreLayout>
      <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-4 w-4" /> Home
          </Link>
          <span>/</span>
          <Link to="/categories" className="hover:text-primary">
            Print Categories
          </Link>
          <span>/</span>
          <span className="text-foreground">{categoryName}</span>
        </nav>

        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">Category</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{categoryName}</h1>
            {category?.description && (
              <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
            )}
          </div>
          <Link
            to="/categories"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Categories
          </Link>
        </div>

        {loading ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Loading products...
          </p>
        ) : !category ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Category not found.
          </p>
        ) : products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No products in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </StoreLayout>
  );
}
