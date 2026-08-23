import { UploadCloud, Edit2, Copy, Trash2, Image as ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "./lib/api-client";
import { PageTitle, Panel, StatusPill, KpiCard } from "./components/admin-ui";
import { useEffect, useState, useMemo } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
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
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

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

  // form state for create/edit
  const [form, setForm] = useState<any>({
    name: "",
    sku: "",
    category: "Apparel",
    price: 0,
    salePrice: undefined,
    stock: 0,
    status: "Draft",
    theme: "",
    description: "",
    images: [] as Array<{ id: string; url: string; role?: string }>,
    is_customizable: false,
  });

  useEffect(() => {
    fetchProducts();
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
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      category: "Apparel",
      price: 0,
      salePrice: undefined,
      stock: 0,
      status: "Draft",
      theme: "",
      description: "",
      images: [],
      is_customizable: false,
    });
    setOpenDialog(true);
  }

  function openEdit(p: any) {
    setEditing(p);
    setForm({
      name: p.name || "",
      sku: p.sku || p._id || "",
      category: p.category || "Apparel",
      price: p.price || 0,
      salePrice: p.salePrice,
      stock: p.stock || 0,
      status: p.status || "Draft",
      theme: normalizeThemeValue(p.theme),
      description: p.description || "",
      images: (p.images || p.previewPaths || []).map((u: any, i: number) => ({
        id: String(i) + '-' + Date.now(),
        url: typeof u === 'string' ? u : u.url,
        role: (u && u.role) ? u.role : (i === 0 ? 'front' : 'gallery'),
        variantLabel: (u && u.variantLabel) ? u.variantLabel : undefined,
      })),
        is_customizable: !!p.is_customizable,
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
        description: form.description,
        price: Number(form.price) || 0,
        salePrice: form.salePrice ? Number(form.salePrice) : undefined,
        stock: Number(form.stock) || 0,
        // No separate status control in the UI: products saved as Published by default
        status: 'Published',
        theme: form.theme ? normalizeThemeValue(form.theme) : undefined,
        images: images.map((im: any) => ({ url: im.url, role: im.role, variantLabel: im.variantLabel })),
        is_customizable: !!form.is_customizable,
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
      const payload = { ...p, name: `${p.name} (Copy)` };
      delete payload._id;
      const res = await apiFetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        fetchProducts();
        toast.success('Duplicated');
      } else toast.error(data?.error || 'Duplicate failed');
    } catch (err) {
      toast.error('Duplicate failed');
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
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
    if (search && !(String(p.name || '') + String(p._id || '')).toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && (p.category || '') !== filterCategory) return false;
    if (filterStatus) {
      const st = (p.status || '').toLowerCase();
      if (filterStatus === 'published' && st !== 'published') return false;
      if (filterStatus === 'draft' && st !== 'draft') return false;
    }
    return true;
  });

  return (
    <>
      <PageTitle title="Manage Print Designs" subtitle="Upload artwork, manage products, and control catalog availability." />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <KpiCard icon={ImageIcon} label="Total Designs" value={`${stats.total}`} delta="Updated live" />
        <KpiCard icon={UploadCloud} label="Published / Drafts" value={`${stats.published} / ${stats.draft}`} delta="Visibility" />
        <KpiCard icon={UploadCloud} label="Low / Out of stock" value={`${stats.lowStock} / ${stats.outOfStock}`} delta="Inventory alerts" />
      </div>

        <div className="mb-4 flex items-center justify-between gap-3">
        <div />
        <div className="flex gap-2">
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add New Product / Design</Button>
          <Button variant="ghost" onClick={async () => {
            if (!confirm('Remove demo/mock products from the database? This cannot be undone.')) return;
            try {
              const res = await apiFetch('/api/admin/clean-demo-products', { method: 'POST' });
              const data = await res.json().catch(() => ({}));
              if (res.ok && data?.ok) {
                toast.success(`Removed ${data.deleted || 0} demo products`);
                fetchProducts();
              } else {
                toast.error(data?.error || 'Failed to remove demo products');
              }
            } catch (err) {
              toast.error('Failed to remove demo products');
            }
          }}>Remove demo products</Button>
          <Button variant="destructive" onClick={async () => {
            if (!confirm('WIPE ENTIRE CATALOG? This will permanently delete ALL products. This action is irreversible.')) return;
            try {
              const res = await apiFetch('/api/admin/wipe-all-products', { method: 'POST' });
              const data = await res.json().catch(() => ({}));
              if (res.ok && data?.ok) {
                toast.success(`Wiped ${data.deleted || 0} products`);
                fetchProducts();
              } else {
                toast.error(data?.error || 'Failed to wipe products');
              }
            } catch (err) {
              toast.error('Failed to wipe products');
            }
          }}>Wipe catalog</Button>
        </div>
      </div>

      <Panel title="Inventory & product catalog">
        <div className="p-4">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input placeholder="Search by name or SKU" value={search} onChange={(e) => setSearch((e.target as HTMLInputElement).value)} />
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                <SelectItem value="Apparel">Apparel</SelectItem>
                <SelectItem value="Drinkware">Drinkware</SelectItem>
                <SelectItem value="Phone Cases">Phone Cases</SelectItem>
                <SelectItem value="Stationery">Stationery</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <div />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell>Loading…</TableCell></TableRow>
                ) : (
                  filtered.map((p) => {
                    const thumbnail = (p.images && p.images.find((im:any) => im.role==='front'))?.url || (p.previewPaths && p.previewPaths[0]) || '';
                    return (
                      <TableRow key={String(p._id)}>
                        <TableCell>
                          <div className="h-12 w-12 overflow-hidden rounded-md bg-muted/10">
                            {thumbnail ? <img src={thumbnail} alt={p.name} className="h-12 w-12 object-cover" /> : <div className="grid h-12 w-12 place-items-center text-xs text-muted-foreground">No image</div>}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div>{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku || p._id}</div>
                        </TableCell>
                        <TableCell>${p.price}{p.salePrice ? <div className="text-xs text-muted-foreground">Sale ${p.salePrice}</div> : null}</TableCell>
                        <TableCell>
                          { (p.stock || 0) <=0 ? <Badge variant="destructive">Out</Badge> : (p.stock <=5 ? <Badge variant="outline">Low ({p.stock})</Badge> : <Badge variant="secondary">{p.stock}</Badge>) }
                        </TableCell>
                        <TableCell><StatusPill status={p.status || 'Draft'} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => duplicateProduct(p)}><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteProduct(String(p._id))}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Panel>

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
                  value={form.category || 'Apparel'}
                  onChange={(e) => setForm((s:any) => ({ ...s, category: (e.target as HTMLSelectElement).value }))}
                >
                  <option value="Apparel">Apparel</option>
                  <option value="Dress">Dress</option>
                  <option value="T-shirt">T-shirt</option>
                  <option value="Sweatpants">Sweatpants</option>
                  <option value="Cup">Cup</option>
                  <option value="Mug">Mug</option>
                  <option value="Phone Case">Phone Case</option>
                  <option value="Wall Art">Wall Art</option>
                  <option value="Stationery">Stationery</option>
                </select>
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

                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!form.is_customizable} onChange={(e) => setForm((f: any) => ({ ...f, is_customizable: e.target.checked }))} />
                    <span>Available as a customizable / blank template</span>
                  </label>
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