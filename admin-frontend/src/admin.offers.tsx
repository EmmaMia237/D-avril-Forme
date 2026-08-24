import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTitle, Panel } from "./components/admin-ui";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog";
import { apiFetch } from "./lib/api-client";

function formatDateTimeLocal(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  // to input type=datetime-local format YYYY-MM-DDTHH:MM
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function OffersAdminPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  // delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteOfferId, setDeleteOfferId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    id: null,
    name: "",
    title: "",
    code: "",
    type: "coupon",
    description: "",
    discountPercent: 0,
    discountValue: 0,
    minimumQty: 0,
    maxItems: 0,
    tiers: [],
    isActive: true,
    startAt: null,
    endAt: null,
  });

  async function loadOffers() {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/offers');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) setOffers(data.offers || []);
    } catch (err) {
      console.error(err);
      toast.error('Unable to load offers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOffers(); }, []);

  function openNew() {
    setForm({
      id: null,
      name: '', title: '', code: '', type: 'coupon', description: '', discountPercent: 0, discountValue: 0, minimumQty: 0, maxItems: 0, isActive: true, startAt: null, endAt: null,
    });
    setShowModal(true);
  }

  function openEdit(o: any) {
    setForm({
      id: o.id,
      name: o.name || '',
      title: o.title || '',
      code: o.code || '',
      type: o.type || 'coupon',
      description: o.description || '',
      discountPercent: o.discountPercent || 0,
      discountValue: o.discountValue || 0,
      minimumQty: o.minimumQty || 0,
      maxItems: o.maxItems || 0,
      tiers: Array.isArray(o.tiers) ? o.tiers.map((t: any) => ({ minQty: Number(t.minQty || 0), discountPercent: Number(t.discountPercent || 0) })) : [],
      isActive: o.isActive !== false,
      startAt: o.startAt || null,
      endAt: o.endAt || null,
    });
    setShowModal(true);
  }

  async function saveOffer(e?: any) {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form };
      // normalize empty strings and tiers
      if (!payload.startAt) payload.startAt = null;
      if (!payload.endAt) payload.endAt = null;
      if (!Array.isArray(payload.tiers)) payload.tiers = [];
      // sanitize tiers: ensure numbers
      payload.tiers = payload.tiers.map((t: any) => ({ minQty: Number(t.minQty || 0), discountPercent: Number(t.discountPercent || 0) }));
      const method = payload.id ? 'PUT' : 'POST';
      const url = payload.id ? `/api/admin/offers/${payload.id}` : '/api/admin/offers';
      const res = await apiFetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to save offer');
      toast.success('Offer saved');
      setShowModal(false);
      loadOffers();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save offer');
    } finally { setSaving(false); }
  }

  // request delete -> opens dialog
  function requestDeleteOffer(id: string) {
    setDeleteOfferId(id);
    setDeleteDialogOpen(true);
  }

  // perform delete
  async function performDeleteOffer() {
    const id = deleteOfferId;
    setDeleteDialogOpen(false);
    setDeleteOfferId(null);
    if (!id) return;
    try {
      const res = await apiFetch(`/api/admin/offers/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to delete offer');
      toast.success('Offer removed');
      loadOffers();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to delete offer');
    }
  }

  return (
    <>
      <PageTitle title="Offer Management" subtitle="Create, schedule and manage storefront offers." />
      <div className="grid gap-6">
        <Panel title="Offers">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Manage coupons, bulk tiers and scheduled promotions.</div>
              <Button onClick={openNew}>Add offer</Button>
            </div>

            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : offers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No offers saved yet.</p>
            ) : (
              <div className="space-y-3">
                {offers.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-md border border-border bg-nude p-3">
                    <div>
                      <p className="font-semibold">{o.title || o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.code || 'No code'} · {o.type} · {o.isActive ? 'Active' : 'Inactive'}</p>
                      <p className="text-xs text-muted-foreground">{o.startAt ? new Date(o.startAt).toLocaleString() : 'Immediate'} → {o.endAt ? new Date(o.endAt).toLocaleString() : 'No end'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openEdit(o)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => requestDeleteOffer(o.id)}>Remove</Button>
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
              <DialogTitle>{form.id ? 'Edit offer' : 'New offer'}</DialogTitle>
              <DialogDescription className="mb-2">Create or schedule this offer.</DialogDescription>
            </DialogHeader>

            <div className="max-h-[70vh] overflow-auto pr-2">
              <form className="grid gap-3" onSubmit={saveOffer}>
                <div>
                  <Label>Offer name</Label>
                  <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Coupon code</Label>
                  <Input value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <Label>Type</Label>
                  <select value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} className="w-full rounded border p-2">
                    <option value="coupon">Coupon</option>
                    <option value="tier">Bulk tier</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Discount % (base)</Label>
                    <Input type="number" value={String(form.discountPercent)} onChange={(e) => setForm((s) => ({ ...s, discountPercent: Number(e.target.value || 0) }))} />
                  </div>
                  <div>
                    <Label>Discount value</Label>
                    <Input type="number" value={String(form.discountValue)} onChange={(e) => setForm((s) => ({ ...s, discountValue: Number(e.target.value || 0) }))} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Minimum qty</Label>
                    <Input type="number" value={String(form.minimumQty)} onChange={(e) => setForm((s) => ({ ...s, minimumQty: Number(e.target.value || 0) }))} />
                  </div>
                  <div>
                    <Label>Max items</Label>
                    <Input type="number" value={String(form.maxItems)} onChange={(e) => setForm((s) => ({ ...s, maxItems: Number(e.target.value || 0) }))} />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
                
                <div>
                  <Label>Tiered thresholds (optional) — each tier applies when cart qty {'>='} minQty</Label>
                  <div className="mt-2 space-y-2">
                    {(form.tiers || []).map((t: any, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <Input type="number" value={String(t.minQty)} onChange={(e) => setForm((s) => ({ ...s, tiers: s.tiers.map((tt:any,i:number) => i===idx?{ ...tt, minQty: Number(e.target.value||0)}:tt) }))} placeholder="min qty" />
                        <Input type="number" value={String(t.discountPercent)} onChange={(e) => setForm((s) => ({ ...s, tiers: s.tiers.map((tt:any,i:number) => i===idx?{ ...tt, discountPercent: Number(e.target.value||0)}:tt) }))} placeholder="discount %" />
                        <Button variant="destructive" size="sm" onClick={() => setForm((s) => ({ ...s, tiers: s.tiers.filter((_:any,i:number) => i!==idx) }))}>Remove</Button>
                      </div>
                    ))}
                    <Button size="sm" onClick={() => setForm((s) => ({ ...s, tiers: [ ...(s.tiers||[]), { minQty: 0, discountPercent: 0 } ] }))}>Add tier</Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Start (optional)</Label>
                    <Input type="datetime-local" value={formatDateTimeLocal(form.startAt)} onChange={(e) => setForm((s) => ({ ...s, startAt: e.target.value || null }))} />
                  </div>
                  <div>
                    <Label>End (optional)</Label>
                    <Input type="datetime-local" value={formatDateTimeLocal(form.endAt)} onChange={(e) => setForm((s) => ({ ...s, endAt: e.target.value || null }))} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((s) => ({ ...s, isActive: !!checked }))} />
                  <span>Active</span>
                </div>

                <DialogFooter>
                  <div className="mt-4 flex gap-2">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog for offers */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm remove</DialogTitle>
              <DialogDescription>Remove this offer? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className="flex w-full justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={performDeleteOffer}>Delete</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
}