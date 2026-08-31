import { Outlet, createFileRoute, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, List, Filter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProductCard, Stars } from "@/components/product-card";
import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { apiFetch } from "@/lib/api-client";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Print Categories — OsanPrints Custom Printing" },
      {
        name: "description",
        content:
          "Browse OsanPrints print categories: apparel, mugs, phone cases, stickers and stationery. Filter by material, colour and price.",
      },
      { property: "og:title", content: "Print Categories — OsanPrints" },
      {
        property: "og:description",
        content: "Filter custom print products by category, material, colour and price range.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const isCategoryDetail = useRouterState({
    select: (state) => state.location.pathname.startsWith("/categories/"),
  });
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(80);
  const [sort, setSort] = useState("popularity");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await apiFetch("/api/products");
        const data = await res.json().catch(() => ({}));
        if (res.ok && active)
          setProductsList((data.products || []).map((p: any) => ({ ...p, id: p.id || p._id })));
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const res = await apiFetch("/api/categories");
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !active) return;

        const categories = Array.isArray(data?.categories) ? data.categories : [];
        const mapped = categories
          .map((category: any) => {
            const value = category.name || category.slug || "";
            if (!value) return null;
            return { value, label: category.name || category.slug || value };
          })
          .filter(Boolean) as Array<{ value: string; label: string }>;

        setCategoryOptions(mapped);
      } catch (e) {
        // ignore
      }
    }
    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // Keep `query` state in sync with the current location.search so filtering updates
  // when navigation changes only the search params (client-side). Listen to popstate
  // so updates caused by pushState are captured as well.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const setFromSearch = () => {
      setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    };

    // Initialize
    setFromSearch();

    // Listen for back/forward and manual pushState dispatches
    window.addEventListener("popstate", setFromSearch);
    return () => window.removeEventListener("popstate", setFromSearch);
  }, []);

  const normalizeFilterValue = (value: string | null | undefined) =>
    String(value ?? "").trim().toLowerCase();

  const materialOptions = useMemo(
    () =>
      Array.from(
        new Set(
          productsList.flatMap((product) => {
            const value = String(product?.material ?? "").trim();
            return value ? [value] : [];
          }),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [productsList],
  );

  const colorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          productsList.flatMap((product) =>
            Array.isArray(product?.colors)
              ? product.colors
                  .map((color: string) => String(color ?? "").trim())
                  .filter(Boolean)
              : [],
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [productsList],
  );

  const filtered = useMemo(() => {
    const source = productsList || [];
    const result = source.filter((p) => {
      const matchesCat =
        !selectedCats.length ||
        selectedCats.some(
          (selected) => normalizeFilterValue(p.category) === normalizeFilterValue(selected),
        );
      const matchesMaterial =
        !selectedMaterials.length ||
        selectedMaterials.some(
          (selected) => normalizeFilterValue(p.material) === normalizeFilterValue(selected),
        );
      const matchesColor =
        !selectedColors.length ||
        (Array.isArray(p.colors) &&
          p.colors.some((c) =>
            selectedColors.some((selected) => normalizeFilterValue(c) === normalizeFilterValue(selected)),
          ));
      const matchesPrice = (p.price || 0) <= maxPrice;
      const q = (query ?? "").trim().toLowerCase();
      const matchesQuery =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && String(p.category).toLowerCase().includes(q)) ||
        (p.options || "").toLowerCase().includes(q);
      return matchesCat && matchesMaterial && matchesColor && matchesPrice && matchesQuery;
    });
    if (sort === "price-asc") return [...result].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "newest") return [...result].reverse();
    return [...result].sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
  }, [productsList, selectedCats, selectedMaterials, selectedColors, maxPrice, sort, query]);

  const activeFilterCount = useMemo(
    () =>
      selectedCats.length +
      selectedMaterials.length +
      selectedColors.length +
      (maxPrice < 80 ? 1 : 0),
    [selectedCats.length, selectedMaterials.length, selectedColors.length, maxPrice],
  );

  if (isCategoryDetail) return <Outlet />;

  const filterPanel = (
    <>
      <FilterGroup title="Category">
        {categoryOptions.length > 0 ? (
          categoryOptions.map((c) => (
            <FilterCheck
              key={c.value}
              id={`cat-${c.value}-${mobileFilterOpen ? "mobile" : "desktop"}`}
              label={c.label}
              checked={selectedCats.includes(c.value)}
              onChange={() => toggle(selectedCats, setSelectedCats, c.value)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No categories available yet.</p>
        )}
      </FilterGroup>

      <FilterGroup title={`Price range — up to $${maxPrice}`}>
        <Slider
          value={[maxPrice]}
          min={10}
          max={80}
          step={1}
          onValueChange={(v) => setMaxPrice(v[0] ?? 80)}
          aria-label="Maximum price"
        />
      </FilterGroup>

      <FilterGroup title="Material">
        {materialOptions.length > 0 ? (
          materialOptions.map((m) => (
            <FilterCheck
              key={m}
              id={`mat-${m}-${mobileFilterOpen ? "mobile" : "desktop"}`}
              label={m}
              checked={selectedMaterials.includes(m)}
              onChange={() => toggle(selectedMaterials, setSelectedMaterials, m)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No material data available yet.</p>
        )}
      </FilterGroup>

      <FilterGroup title="Colour" last>
        {colorOptions.length > 0 ? (
          colorOptions.map((c) => (
            <FilterCheck
              key={c}
              id={`col-${c}-${mobileFilterOpen ? "mobile" : "desktop"}`}
              label={c}
              checked={selectedColors.includes(c)}
              onChange={() => toggle(selectedColors, setSelectedColors, c)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No colours available yet.</p>
        )}
      </FilterGroup>
    </>
  );

  return (
    <StoreLayout>
      <div className="border-b border-border bg-nude">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
          <h1 className="font-display text-4xl font-semibold">Print Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every product is print-ready. Pick a base item, upload artwork, and configure your run.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <section className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-nude px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm text-muted-foreground">
                {filtered.length} products available{query.trim() ? ` for "${query.trim()}"` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant={activeFilterCount > 0 ? "default" : "outline"}
                    size="sm"
                    className="inline-flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[90vw] overflow-y-auto p-4 sm:max-w-md">
                  <SheetHeader className="mb-6 text-left">
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Refine products by category, price, material and colour.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-0">{filterPanel}</div>
                  <Button size="lg" className="mt-6 w-full" onClick={() => setMobileFilterOpen(false)}>
                    Apply Filters
                  </Button>
                </SheetContent>
              </Sheet>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-44 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="newest">Newest Arrivals</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={view === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {view === "grid" ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {filtered.map((p) => {
                const isConfigurable =
                  p.productType === "blank" || p.customizable === true || p.configurable === true;
                return (
                  <article
                    key={p.id}
                    className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                  >
                    <img
                      src={getOptimizedImageUrl(
                        p.image || p.images?.[0]?.url || p.previewPaths?.[0] || "",
                      )}
                      alt={`${p.name} mockup`}
                      loading="lazy"
                      width={800}
                      height={800}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] tracking-[0.14em] text-primary uppercase">
                        {p.category} · {p.material}
                      </p>
                      <h3 className="truncate text-base font-semibold">{p.name}</h3>
                      <Stars rating={p.rating} reviews={p.reviews} />
                      <p className="mt-1 text-xs text-muted-foreground">{p.options}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                      <span className="font-display text-xl font-semibold text-primary">
                        ${p.price}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (isConfigurable) {
                            navigate({
                              to: "/configure",
                              search: { id: p.id, color: p.colors?.[0] ?? "" },
                            });
                            return;
                          }
                          navigate({ to: `/product/${encodeURIComponent(String(p.id || p._id))}` });
                        }}
                      >
                        {isConfigurable ? "Configure" : "Details"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <p className="mt-10 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No products match those filters yet.
            </p>
          )}

          <Pagination className="mt-10">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              {[1, 2, 3, 4].map((n) => (
                <PaginationItem key={n}>
                  <PaginationLink href="#" isActive={n === 1}>
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </div>
    </StoreLayout>
  );
}

function FilterGroup({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-6 border-b border-border pb-6"}>
      <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">{title}</p>
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}

function FilterCheck({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}
