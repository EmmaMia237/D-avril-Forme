import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, Panel } from "./components/admin-ui";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog";
import { apiFetch } from "./lib/api-client";

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ id: null, slug: '', name: '', description: '', imageUrl: '', isPublished: false, items: 0 });

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/categories');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) setCategories(data.categories || []);
      else setCategories([]);
    } catch (err) {
      console.error(err);
      toast.error('Unable to load categories');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ id: null, slug: '', name: '', description: '', imageUrl: '', isPublished: false, items: 0 });
    setShowModal(true);
  }

  function openEdit(c: any) {
    setForm({ id: c._id || c.id, slug: c.slug || '', name: c.name || '', description: c.description || '', imageUrl: c.imageUrl || c.image || '', isPublished: !!c.isPublished, items: c.items || 0 });
    setShowModal(true);
  }

  async function uploadImage(file: File) {
    try {
      const fd = new FormData();
      fd.append('files', file);
      const res = await apiFetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Upload failed');
      return data.files && data.files[0] && data.files[0].url ? data.files[0].url : null;
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
      return null;
    }
  }

  async function saveCategory(e?: any) {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form };
      const method = payload.id ? 'PUT' : 'POST';
      const url = payload.id ? `/api/admin/categories/${payload.id}` : '/api/admin/categories';
      const res = await apiFetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to save category');
      toast.success('Category saved');
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save category');
    } finally { setSaving(false); }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return;
    try {
      const res = await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to delete');
      toast.success('Category deleted');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to delete category');
    }
  }

  return (
    <>
      <PageTitle title="Categories" subtitle="Manage storefront categories and images." />
      <div className="grid gap-6">
        <Panel title="Categories">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Create and publish categories shown on the storefront.</div>
              <Button onClick={openNew}>Add category</Button>
            </div>

            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories found.</p>
            ) : (
              <div className="space-y-3">
                {categories.map((c) => (
                  <div key={c._id || c.id} className="flex items-center justify-between rounded-md border border-border bg-nude p-3">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-24 overflow-hidden rounded bg-muted">
                        {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
                      </div>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.slug} · {c.items || 0} products</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch checked={!!c.isPublished} onCheckedChange={async (v:any) => {
                        try {
                          const res = await apiFetch(`/api/admin/categories/${c._id || c.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ isPublished: !!v }) });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to update');
                          toast.success('Updated');
                          load();
                        } catch (err:any) { toast.error(err?.message || 'Unable to update'); }
                      }} />
                      <Button size="sm" onClick={() => openEdit(c)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteCategory(c._id || c.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit category' : 'New category'}</DialogTitle>
              <DialogDescription className="mb-2">Add or update a storefront category.</DialogDescription>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-auto pr-2">
              <form className="grid gap-3" onSubmit={saveCategory}>
                <div>
                  <Label>Slug (url-friendly)</Label>
                  <Input value={form.slug} onChange={(e) => setForm((s:any) => ({ ...s, slug: e.target.value }))} />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm((s:any) => ({ ...s, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((s:any) => ({ ...s, description: e.target.value }))} />
                </div>
                <div>
                  <Label>Image</Label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.target.files && e.target.files[0];
                      if (!f) return;
                      const url = await uploadImage(f);
                      if (url) setForm((s:any) => ({ ...s, imageUrl: url }));
                    }} />
                    {form.imageUrl ? <img src={form.imageUrl} alt="preview" className="h-12 w-16 object-cover" /> : null}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Published</Label>
                    <div className="mt-1"><Switch checked={!!form.isPublished} onCheckedChange={(v:any) => setForm((s:any) => ({ ...s, isPublished: !!v }))} /></div>
                  </div>
                  <div>
                    <Label>Items count</Label>
                    <Input type="number" value={String(form.items || 0)} onChange={(e) => setForm((s:any) => ({ ...s, items: Number(e.target.value || 0) }))} />
                  </div>
                </div>

                <DialogFooter>
                  <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
