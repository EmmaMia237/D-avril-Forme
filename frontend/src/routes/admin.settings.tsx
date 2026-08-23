import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageTitle, Panel } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute('/admin/settings')({
  component: function AdminSettingsRedirect() {
    if (typeof window !== 'undefined') window.location.href = '/avril-admin';
    return null;
  },
});

function SettingsPage() {
  return (
    <>
      <PageTitle
        title="Settings"
        subtitle="Studio profile, shipping defaults and security controls for the owner account."
      />

      <div className="grid gap-6 xl:grid-cols-2">
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
              <Input id="store" defaultValue="Avril Forme" className="mt-1.5" />
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