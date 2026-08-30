import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageTitle, Panel } from "./components/admin-ui";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { apiFetch } from "./lib/api-client";

function SettingsPage() {
  const [accountForm, setAccountForm] = useState({ email: "", password: "", currentPassword: "" });
  const [offerForm, setOfferForm] = useState({
    name: "Bulk Offer",
    code: "BULK30",
    type: "coupon",
    title: "Bulk print offer",
    description: "15% off for 30+ items",
    discountPercent: "15",
    discountValue: "0",
    minimumQty: "30",
    maxItems: "0",
    isActive: true,
  });
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  async function loadOffers() {
    try {
      setLoadingOffers(true);
      const res = await apiFetch('/api/admin/offers');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) setOffers(data.offers || []);
    } catch (err) {
      console.error('Unable to load offers', err);
    } finally {
      setLoadingOffers(false);
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

  async function handleAccountSave(event: React.FormEvent) {
    event.preventDefault();
    try {
      const res = await apiFetch('/api/admin/account', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: accountForm.email,
          password: accountForm.password || undefined,
          currentPassword: accountForm.currentPassword || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to update admin credentials');
      }
      toast.success('Admin account updated');
      setAccountForm({ email: data.admin?.email || accountForm.email, password: '', currentPassword: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update admin account');
    }
  }

  async function handleOfferSave(event: React.FormEvent) {
    event.preventDefault();
    try {
      const res = await apiFetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: offerForm.name,
          title: offerForm.title,
          code: offerForm.code,
          type: offerForm.type,
          description: offerForm.description,
          discountPercent: Number(offerForm.discountPercent || 0),
          discountValue: Number(offerForm.discountValue || 0),
          minimumQty: Number(offerForm.minimumQty || 0),
          maxItems: Number(offerForm.maxItems || 0),
          isActive: offerForm.isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to save offer');
      toast.success('Offer saved');
      setOfferForm({
        name: 'Bulk Offer',
        code: 'BULK30',
        type: 'coupon',
        title: 'Bulk print offer',
        description: '15% off for 30+ items',
        discountPercent: '15',
        discountValue: '0',
        minimumQty: '30',
        maxItems: '0',
        isActive: true,
      });
      loadOffers();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save offer');
    }
  }

  async function deleteOffer(id: string) {
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
      <PageTitle
        title="Settings"
        subtitle="Studio profile, security, offers and owner account controls."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Admin account & security">
          <form className="grid gap-4 p-5" onSubmit={handleAccountSave}>
            <div>
              <Label htmlFor="admin-email">Admin email</Label>
              <Input id="admin-email" className="mt-1.5" value={accountForm.email} onChange={(e) => setAccountForm((s) => ({ ...s, email: e.target.value }))} placeholder="admin@yourdomain.com" />
            </div>
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" className="mt-1.5" value={accountForm.currentPassword} onChange={(e) => setAccountForm((s) => ({ ...s, currentPassword: e.target.value }))} placeholder="Current password" />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" className="mt-1.5" value={accountForm.password} onChange={(e) => setAccountForm((s) => ({ ...s, password: e.target.value }))} placeholder="Leave blank to keep current password" />
            </div>
            <Button type="submit">Save admin account</Button>
          </form>
        </Panel>

        {/* Offer management moved to a dedicated page in the admin sidebar: "Offer Management" */}

        <Panel title="Studio profile">
          <form
            className="grid gap-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Studio profile updated.");
            }}
          >
            <div>
              <Label htmlFor="store">Store name</Label>
              <Input id="store" defaultValue="OsanPrints" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="support">Support email</Label>
              <Input id="support" defaultValue="support@avrilforme.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="hours">Operating hours</Label>
              <Input id="hours" defaultValue="Mon–Sat, 8:00am – 7:00pm" className="mt-1.5" />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </Panel>

        <Panel title="Security & access">
          <div className="grid gap-3 p-5">
            {[
              { label: "Multi-factor authentication", note: "Required for the owner account", on: true },
              { label: "IP lockout after 3 failed attempts", note: "30 minute cooldown", on: true },
              { label: "Email alert on new admin sign-in", note: "Sent to owner address", on: true },
              { label: "Allow additional admin accounts", note: "Single-admin platform", on: false },
            ].map((s) => (
              <div
                key={s.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md bg-nude px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.note}</p>
                </div>
                <Switch defaultChecked={s.on} disabled={!s.on} aria-label={s.label} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Fulfilment defaults">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="lead">Standard lead time (days)</Label>
              <Input id="lead" type="number" defaultValue={3} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="bulk">Bulk lead time (days)</Label>
              <Input id="bulk" type="number" defaultValue={6} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="freeship">Free shipping threshold ($)</Label>
              <Input id="freeship" type="number" defaultValue={120} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="dpi">Minimum artwork DPI</Label>
              <Input id="dpi" type="number" defaultValue={300} className="mt-1.5" />
            </div>
          </div>
        </Panel>
      </div>

    </>
  );
}

export default SettingsPage;