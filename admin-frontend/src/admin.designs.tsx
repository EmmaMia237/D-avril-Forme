import { UploadCloud, Edit2, Copy, Trash2, Image as ImageIcon, Plus, Search, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "./lib/api-client";
import { PageTitle, Panel, StatusPill, KpiCard } from "./components/admin-ui";
import AdminDataTable from "./components/admin-data-table";
import { useEffect, useState, useMemo } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { Badge } from "./components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog";

function DesignsPage() {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  // delete & wipe confirmation dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  // undo hint for deletes
  const [undoItem, setUndoItem] = useState<any>(null);
  const [undoTimeout, setUndoTimeout] = useState<number | null>(null);

  const statusOptions = ["All", "Published", "Draft", "Out of Stock"];
  const categoryOptions = useMemo(
    () =>
      categoriesList.map((category: any) => {
        const value = category.slug || category.name || category._id || category.id || '';
        return {
          id: category.id || category._id || value,
          value,
          label: category.name || category.title || category.slug || 'Unnamed category',
        };
      }),
    [categoriesList]
  );

  function normalizeThemeValue(value: string | null | undefined) {
   const v = String(value || '').trim();
   const map: Record<string, string> = {
     'Kids Collection': 'kids',
     'Halloween Collection': 'halloween',
     'Fall / Autumn Collection': 'autumn',
     'Fall Collection': 'autumn',
     'Anime Collection': 'anime',
     'kids': 'kids',
     'halloween': 'halloween',
     'autumn': 'autumn',
     'anime': 'anime',
   };
   return map[v] || v;
  }

  function resolveProductImage(product: any) {
   if (!product) return "";
   const images = Array.isArray(product.images) ? product.images : [];
   const primaryImage =
     images.find((img: any) => typeof img === 'string' ? !!img : !!(img?.url || img?.src)) ||
     images[0];
   const candidates = [
     product.image,
     product.imageUrl,
     product.thumbnail,
     product.previewUrl,
     product.coverImage,
     product.images?.[0]?.url,
     product.images?.[0]?.src,
     typeof primaryImage === 'string' ? primaryImage : primaryImage?.url || primaryImage?.src,
     product.previewPaths?.[0],
   ];

   const raw = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
   if (!raw) return "";

   const url = raw.trim();
   if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
     return url;
   }
   if (url.startsWith('/')) {
     return `${window.location.origin}${url}`;
   }

   const base = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || window.location.origin || '').replace(/\/$/, '');
   if (base) {
     return `${base.replace(/\/$/, '')}/${url.replace(/^\.?\//, '')}`;
   }
   return url;
  }

  // form state for create/edit
  const [form, setForm] = useState<any>({
   name: "",
   sku: "",
   category: "",
   material: "",
   price: 0,
   salePrice: undefined,
   stock: 0,
   status: "Draft",
   productType: "pre-designed",
   theme: "",
   description: "",
   images: [] as Array<{ id: string; url: string; role?: string }>,
  });

  useEffect(() => {
    fetchProducts();
    // load categories for product creation dropdown
    (async function loadCategories() {
      try {
        const res = await apiFetch('/api/admin/categories');
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data?.categories)) {
          setCategoriesList(
            data.categories.map((c:any) => ({
              id: c._id || c.id,
              slug: c.slug || c.name,
              name: c.name || c.title || c.slug,
            }))
          );
        }
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
        // Request a limited result set to avoid huge payloads (server defaults to 200)
        const res = await apiFetch('/api/products?limit=25&summary=1');
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('Failed to load products', res.status, text);
          toast.error('Failed to load products');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (data?.ok) setProductsList(data.products || []);
      } catch (err) {
        console.error('Error fetching products', err);
        toast.error('Unable to load products');
      } finally {
        setLoading(false);
      }
    }

  function openNew() {
    const firstCategory = categoryOptions[0]?.value || "";
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      category: firstCategory,
      material: "",
      price: 0,
      salePrice: undefined,
      stock: 0,
      status: "Draft",
      productType: "pre-designed",
      theme: "",
      description: "",
      images: [],
    });
    setOpenDialog(true);
  }

  function openEdit(p: any) {
    const productCategory = String(p.category || categoryOptions[0]?.value || "");
    setEditing(p);
    setForm({
      name: p.name || "",
      sku: p.sku || p._id || "",
      category: productCategory,
      material: p.material || "",
      price: p.price || 0,
      salePrice: p.salePrice,
      stock: p.stock || 0,
      status: p.status || "Draft",
      productType: p.productType || "pre-designed",
      theme: normalizeThemeValue(p.theme),
      description: p.description || "",
      images: (p.images || p.previewPaths || []).map((u: any, i: number) => ({
        id: String(i) + '-' + Date.now(),
        url: typeof u === 'string' ? u : u.url,
        role: (u && u.role) ? u.role : (i === 0 ? 'front' : 'gallery'),
        variantLabel: (u && u.variantLabel) ? u.variantLabel : undefined,
      })),
      });
    setOpenDialog(true);
  }

  async function saveProduct(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (saving) return; // guard against duplicate submits
    setSaving(true);

    // Basic client-side validation
    if (!form.name || String(form.name).trim().length === 0) {
      toast.error('Please enter a product name');
      setSaving(false);
      return;
    }

    try {
      // If there are any file objects in the images array, upload them first to the server (which will push to Cloudinary)
      let images = Array.isArray(form.images) ? [...form.images] : [];
      const filesToUpload = images.filter((im: any) => im && (im.file instanceof File));
      if (filesToUpload.length > 0) {
        try {
          const fd = new FormData();
          filesToUpload.forEach((im: any) => fd.append('files', im.file));
          const upRes = await apiFetch('/api/admin/upload', { method: 'POST', body: fd });
          const upData = await upRes.json().catch(() => ({}));
          if (!upRes.ok || !upData?.ok) {
            toast.error('Image upload failed: ' + (upData?.error || ''));
            setSaving(false);
            return;
          }
          // Map returned uploaded URLs back into the images array in the same order
          let uploadIndex = 0;
          images = images.map((im: any) => {
            if (im && (im.file instanceof File)) {
              const uploaded = upData.files && upData.files[uploadIndex++];
              return { ...im, url: uploaded?.url || im.url };
            }
            return im;
          });
        } catch (upErr) {
          console.error('Upload failed', upErr);
          toast.error('Image upload failed');
          setSaving(false);
          return;
        }
      }

      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        material: form.material || '',
        description: form.description,
        price: Number(form.price) || 0,
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        stock: Number(form.stock) || 0,
        // No separate status control in the UI: products saved as Published by default
        status: 'Published',
        productType: form.productType || 'pre-designed',
        theme: form.theme ? normalizeThemeValue(form.theme) : undefined,
        images: images.map((im: any) => ({ url: im.url, role: im.role, variantLabel: im.variantLabel })),
      };

      // Try primary API (apiFetch) first
      let res: Response | null = null;
      let data: any = null;
      try {
        if (editing && editing._id) {
          res = await apiFetch(`/api/admin/products/${editing._id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        } else {
          res = await apiFetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        }
      } catch (networkErr) {
        console.error('Primary apiFetch failed:', networkErr);
      }

      if (res) {
        try { data = await res.json().catch(() => ({})); } catch (e) { data = {}; }
        if (res.ok && data?.ok) {
          toast.success('Saved');
          // optimistic update: dispatch same CustomEvent the storefront listens for so pages update immediately
          try {
            if (editing && editing._id) {
              window.dispatchEvent(new CustomEvent('product-updated', { detail: data.product }));
            } else {
              window.dispatchEvent(new CustomEvent('product-created', { detail: data.product }));
            }
          } catch (evErr) { /* ignore */ }

          setOpenDialog(false);
          fetchProducts();
          setSaving(false);
          return;
        }

        // If request reached server but returned error, show it
        const message = data?.error || `HTTP ${res.status} ${res.statusText}`;
        toast.error(`Save failed: ${message}`);
        console.error('Save failed response', res.status, await (res.text().catch(() => '')));
        setSaving(false);
        return;
      }

      // Primary attempt failed to reach server (network error). Try fallback to localhost:4000 if available.
      try {
        const fallbackBase = (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).trim()) || 'http://localhost:4000';
        const url = editing && editing._id ? `${fallbackBase.replace(/\/$/, '')}/api/admin/products/${editing._id}` : `${fallbackBase.replace(/\/$/, '')}/api/admin/products`;
        console.warn('Attempting fallback POST to', url);
        const altRes = await fetch(url, { method: editing && editing._id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
        const altData = await altRes.json().catch(() => ({}));
        if (altRes.ok && altData?.ok) {
          toast.success('Saved (via fallback)');
          try {
            if (editing && editing._id) {
              window.dispatchEvent(new CustomEvent('product-updated', { detail: altData.product }));
            } else {
              window.dispatchEvent(new CustomEvent('product-created', { detail: altData.product }));
            }
          } catch (evErr) {}
          setOpenDialog(false);
          fetchProducts();
          setSaving(false);
          return;
        }
        toast.error(`Save failed (fallback): ${altData?.error || `HTTP ${altRes.status}`}`);
        console.error('Fallback response', altRes.status, await (altRes.text().catch(() => '')));
      } catch (err2) {
        console.error('Fallback attempt failed:', err2);
        toast.error('Save failed: network error contacting API');
      }
    } catch (err) {
      console.error('Unexpected save error:', err);
      toast.error('Save failed: unexpected error');
    } finally {
      setSaving(false);
    }
  }

  async function duplicateProduct(p: any) {
    try {
      const payload = {
        ...p,
        name: `${p.name || 'Product'} (Copy)`,
        _id: undefined,
        id: undefined,
        category: p.category || categoriesList[0]?.name || categoriesList[0]?.slug || '',
      };
      delete payload._id;
      delete payload.id;
      const res = await apiFetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        fetchProducts();
        toast.success('Product duplicated successfully');
      } else toast.error(data?.error || 'Duplicate failed');
    } catch (err) {
      toast.error('Duplicate failed');
    }
  }

  async function handleRefresh() {
    setSearch('');
    setFilterCategory('All');
    setFilterStatus('All');
    await fetchProducts();
  }

  // request delete -> open dialog
  function requestDeleteProduct(id: string) {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  }

  // perform delete after confirmation
  async function performDeleteProduct() {
    const id = deleteTargetId;
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
    if (!id) return;
    try {
      const res = await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        // keep an undo hint locally for a moment
        setUndoItem({ type: 'product', id, payload: data?.product || null });
        if (undoTimeout) window.clearTimeout(undoTimeout);
        const tid = window.setTimeout(() => setUndoItem(null), 10000);
        setUndoTimeout(tid);
        fetchProducts();
        toast.success('Deleted');
      } else {
        toast.error(data?.error || 'Delete failed');
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  function handleFiles(files: FileList | null) {
      if (!files || files.length === 0) return;
      const list = Array.from(files);
      // limit total images to 10
      const existing = (Array.isArray((form && form.images)) ? form.images.length : 0);
      const allowed = Math.max(0, 10 - existing);
      list.slice(0, allowed).forEach((f, idx) => {
        // Use a lightweight object URL for preview and keep the File object for upload
        const preview = URL.createObjectURL(f);
        setForm((s: any) => ({ ...s, images: [...s.images, { id: `${Date.now()}-${Math.random()}`, url: preview, file: f, role: s.images.length === 0 ? 'front' : 'gallery' }] }));
      });
    }

  function removeImage(id: string) {
    setForm((s: any) => ({ ...s, images: s.images.filter((im: any) => im.id !== id) }));
  }

  function moveImage(index: number, dir: number) {
    setForm((s: any) => {
      const images = [...s.images];
      const to = index + dir;
      if (to < 0 || to >= images.length) return s;
      const [item] = images.splice(index, 1);
      images.splice(to, 0, item);
      return { ...s, images };
    });
  }

  function setImageRole(id: string, role: string) {
    setForm((s: any) => ({ ...s, images: s.images.map((im: any) => ({ ...im, role: im.id === id ? role : im.role })) }));
  }

  const stats = useMemo(() => {
    const total = productsList.length;
    const published = productsList.filter((p) => (p.status || '').toLowerCase() === 'published').length;
    const draft = total - published;
    const lowStock = productsList.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const outOfStock = productsList.filter((p) => (p.stock || 0) === 0).length;
    return { total, published, draft, lowStock, outOfStock };
  }, [productsList]);

  const filtered = productsList.filter((p) => {
    const searchText = [p.name, p.sku, p.category, p._id, p.id].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !search || searchText.includes(search.toLowerCase());

    const categoryValue = (p.category || '').toLowerCase();
    const matchesCategory = filterCategory === 'All' || categoryValue === filterCategory.toLowerCase();

    const stockLevel = Number(p.stock || 0);
    const statusValue = String(p.status || 'Draft').toLowerCase();
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Published' && statusValue === 'published') ||
      (filterStatus === 'Draft' && statusValue === 'draft') ||
      (filterStatus === 'Out of Stock' && stockLevel === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <>
      <PageTitle title="Manage Print Designs" subtitle="Upload artwork, manage products, and control catalog availability." />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <KpiCard icon={ImageIcon} label="Total Designs" value={`${stats.total}`} delta="Updated live" />
        <KpiCard icon={UploadCloud} label="Published / Drafts" value={`${stats.published} / ${stats.draft}`} delta="Visibility" />
        <KpiCard icon={UploadCloud} label="Low / Out of stock" value={`${stats.lowStock} / ${stats.outOfStock}`} delta="Inventory alerts" />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 pb-1">
          <h2 className="truncate text-base font-semibold">Inventory & product catalog</h2>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-card dark:border-slate-800">
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 md:gap-3">
            <div className="relative w-[170px] shrink-0 sm:w-[200px] md:w-[220px] xl:w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                placeholder="Search by name, SKU..."
                className="w-full bg-card pl-9 text-sm"
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto md:gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilterStatus(option)}
                  className={
                    option === filterStatus
                      ? 'shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-sm md:px-3.5 md:text-sm dark:bg-white dark:text-slate-900'
                      : 'shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 md:px-3.5 md:text-sm'
                  }
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRefresh} className="inline-flex items-center gap-2 whitespace-nowrap">
                <RotateCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={openNew} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                <Plus className="h-4 w-4" />Add New
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800">
            <AdminDataTable
              showToolbar={false}
              columns={[
                {
                  key: 'thumbnail',
                  title: 'Preview',
                  width: '72px',
                  render: (p:any) => {
                    const thumbnail = resolveProductImage(p);
                    return (
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                        {thumbnail ? (
                          <img src={thumbnail} alt={p.name} className="h-12 w-12 object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    );
                  }
                },
                { key: 'name', title: 'Product / SKU', render: (p:any) => (<div className="font-semibold"><div>{p.name}</div><div className="text-xs text-muted-foreground">{p.sku || p._id}</div></div>) },
                { key: 'price', title: 'Price', render: (p:any) => (<div>${Number(p.price || 0).toFixed(2)}{p.salePrice ? <div className="text-xs text-muted-foreground">Sale ${Number(p.salePrice || 0).toFixed(2)}</div> : null}</div>) },
                { key: 'stock', title: 'Inventory', render: (p:any) => ((p.stock || 0) <=0 ? <Badge variant="destructive">Out</Badge> : (p.stock <=5 ? <Badge variant="outline">Low ({p.stock})</Badge> : <Badge variant="secondary">{p.stock}</Badge>)) },
                { key: 'status', title: 'Status', render: (p:any) => <StatusPill status={p.status || 'Draft'} /> },
                { key: 'created', title: 'Created', render: (p:any) => new Date(p.createdAt || p.created || p.created_at || Date.now()).toLocaleDateString() },
              ]}
              rows={filtered}
              loading={loading}
              total={filtered.length}
              page={1}
              pageSize={25}
              onView={(p) => setPreviewProduct(p)}
              onAdd={openNew}
              onEdit={openEdit}
              onDuplicate={duplicateProduct}
              onDelete={(p) => requestDeleteProduct(String((p as any)._id || (p as any).id))}
            />
          </div>
        </div>
      </section>

      {/* Delete confirmation dialog for single product */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
            <DialogDescription>Delete this product? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={performDeleteProduct}>Delete</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewProduct)} onOpenChange={(value) => !value && setPreviewProduct(null)}>
        <DialogContent className="max-w-3xl overflow-hidden">
          <div className="mt-2 grid gap-5 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {previewProduct ? (
                <img
                  src={resolveProductImage(previewProduct)}
                  alt={previewProduct.name}
                  className="h-56 w-full object-cover md:h-full"
                />
              ) : null}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Product preview</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{previewProduct?.name || 'Product'}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">{previewProduct?.category || 'Uncategorized'}</span>
                  <StatusPill status={previewProduct?.status || 'Draft'} />
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p>{previewProduct?.description || 'No description available.'}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Price</span>
                    <span className="font-semibold text-slate-900">${Number(previewProduct?.price || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Stock</span>
                    <span className="font-semibold text-slate-900">{previewProduct?.stock ?? 0} units</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    const productId = previewProduct?._id || previewProduct?.id;
                    if (!productId) return;
                    const storefrontUrl = `/product?id=${encodeURIComponent(productId)}`;
                    window.open(storefrontUrl, '_blank', 'noopener,noreferrer');
                    setPreviewProduct(null);
                  }}
                >
                  Open in Storefront
                </Button>
                <Button type="button" variant="outline" onClick={() => setPreviewProduct(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog} onOpenChange={(v) => setOpenDialog(v)}>
        <DialogContent className="max-h-[80vh] w-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit product' : 'Add new product'}</DialogTitle>
            <DialogDescription>Fill the product details and media. Images are stored as data URLs in dev.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={saveProduct}>
            <div>
              <Label>Media upload (add up to 10 images)</Label>
              <div className="mt-2 grid gap-2">
                <label className="grid cursor-pointer place-items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-nude px-4 py-6 text-center">
                  <div className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-primary" /><span className="text-sm">Drag & drop or click to add images</span></div>
                  <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} accept="image/*" />
                </label>

                <div className="grid gap-2">
                  {form.images.map((im:any, i:number) => (
                    <div key={im.id} className="flex items-start gap-3">
                      <img src={im.url} alt="preview" className="h-20 w-28 rounded object-cover" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{i===0 ? 'Primary' : `Image ${i+1}`}</span>
                          <select className="ml-2 rounded border px-2" value={im.role || 'gallery'} onChange={(e) => setImageRole(im.id, (e.target as HTMLSelectElement).value)}>
                            <option value="front">Front Image</option>
                            <option value="back">Back Image</option>
                            <option value="variant">Color variant</option>
                            <option value="gallery">Gallery</option>
                          </select>
                          {/* allow variant label */}
                          { (im.role === 'variant') && (
                            <input placeholder="Variant label (e.g. White)" className="ml-2 rounded border px-2" value={im.variantLabel || ''} onChange={(e) => setForm((s:any) => ({ ...s, images: s.images.map((img:any) => img.id === im.id ? { ...img, variantLabel: (e.target as HTMLInputElement).value } : img) }))} />
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" className="rounded border px-2 py-1" onClick={() => moveImage(i, -1)}>Move left</button>
                          <button type="button" className="rounded border px-2 py-1" onClick={() => moveImage(i, 1)}>Move right</button>
                          <button type="button" className="rounded border px-2 py-1 text-destructive" onClick={() => removeImage(im.id)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Basic information</Label>
              <Input placeholder="Title" value={form.name} onChange={(e) => setForm((s:any) => ({ ...s, name: (e.target as HTMLInputElement).value }))} />
              <Input placeholder="SKU (optional)" value={form.sku} onChange={(e) => setForm((s:any) => ({ ...s, sku: (e.target as HTMLInputElement).value }))} />
              <div className="grid gap-2">
                <Label>Category</Label>
                <select
                  className="w-full rounded border p-2"
                  value={form.category || categoryOptions[0]?.value || ''}
                  onChange={(e) => setForm((s:any) => ({ ...s, category: (e.target as HTMLSelectElement).value }))}
                >
                  {categoryOptions.length > 0 ? (
                    categoryOptions.map((category) => (
                      <option key={category.id} value={category.value}>{category.label}</option>
                    ))
                  ) : (
                    <option value="" disabled>No categories found — create one first</option>
                  )}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Material</Label>
                <Input
                  placeholder="e.g. 100% Cotton, Ceramic, Ring-spun cotton blend"
                  value={form.material || ""}
                  onChange={(e) => setForm((s:any) => ({ ...s, material: (e.target as HTMLInputElement).value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Theme (optional)</Label>
                <select
                  className="w-full rounded border p-2"
                  value={normalizeThemeValue(form.theme || '') || ''}
                  onChange={(e) => setForm((s:any) => ({ ...s, theme: (e.target as HTMLSelectElement).value }))}
                >
                  <option value="">None</option>
                  <option value="kids">Kids Collection</option>
                  <option value="anime">Anime</option>
                  <option value="halloween">Halloween</option>
                  <option value="autumn">Autumn / Fall Collection</option>
                </select>
              </div>
              <textarea className="mt-2 w-full rounded border p-2" placeholder="Description" value={form.description} onChange={(e) => setForm((s:any) => ({ ...s, description: (e.target as HTMLTextAreaElement).value }))} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Pricing</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((s:any) => ({ ...s, price: Number((e.target as HTMLInputElement).value || 0) }))} />
                <Input type="number" value={form.salePrice ?? ''} onChange={(e) => setForm((s:any) => ({ ...s, salePrice: e.target.value ? Number((e.target as HTMLInputElement).value) : undefined }))} placeholder="Sale price (optional)" className="mt-2" />
              </div>
              <div>
                <Label>Inventory</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm((s:any) => ({ ...s, stock: Number((e.target as HTMLInputElement).value || 0) }))} />

                <div className="mt-3 grid gap-2">
                  <Label>Product Type</Label>
                  <select
                    className="w-full rounded border p-2"
                    value={form.productType || 'pre-designed'}
                    onChange={(e) => setForm((s:any) => ({ ...s, productType: (e.target as HTMLSelectElement).value }))}
                  >
                    <option value="pre-designed">Pre-designed</option>
                    <option value="blank">Blank / Customizable Template</option>
                  </select>
                </div>

              </div>
            </div>

            <DialogFooter className="sticky bottom-0 mt-4 flex gap-2 bg-card/80">
              <Button variant="ghost" onClick={() => setOpenDialog(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DesignsPage;
