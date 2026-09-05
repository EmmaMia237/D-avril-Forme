import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StoreLayout } from "@/components/store-layout";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { coupons, discountTiers } from "@/lib/shop-data";
import { apiFetch } from "@/lib/api-client";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Bulk Print Deals — OsanPrints" },
      {
        name: "description",
        content:
          "Seasonal print sale coupons and bulk order discount tiers — copy a coupon code or view active bulk discounts.",
      },
      { property: "og:title", content: "Offers & Bulk Print Deals — OsanPrints" },
      {
        property: "og:description",
        content: "Copy a coupon code and unlock tiered bulk print discounts.",
      },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadOffers() {
      try {
        const res = await apiFetch("/api/offers");
        const data = await res.json().catch(() => ({}));
        if (active && res.ok && data?.ok) {
          setOffers(data.offers || []);
        }
      } catch (e) {
        // fallback to static offers when the backend is empty or unavailable
      } finally {
        setLoading(false);
      }
    }
    loadOffers();
    return () => {
      active = false;
    };
  }, []);

  const couponOffers = offers.filter((o) => o.type === "coupon" && o.isActive !== false);
  const tierOffers = offers.filter((o) => o.type === "tier" || o.type === "bundle");

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Coupon ${code} copied`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy — please copy the code manually.");
    }
  };

  return (
    <StoreLayout>
      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <h1 className="font-display text-4xl font-semibold">Current offers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Offers shown here are active and updated in real time.
        </p>

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading offers…</p>
          ) : couponOffers.length === 0 && tierOffers.length === 0 ? (
            <div className="rounded-lg border bg-nude p-6 text-center">
              <p className="font-semibold">No offers for the moment</p>
              <p className="text-sm text-muted-foreground">Check later for seasonal promotions.</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {couponOffers.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold">Active coupons</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {couponOffers.map((c: any) => {
                      const code = c.code || c.title || "OFFER";
                      const label = c.title || c.description || "Store discount";
                      return (
                        <div key={c.id || code} className="rounded-lg border bg-nude p-5">
                          <p className="font-display text-2xl font-bold text-primary">{code}</p>
                          <p className="mt-2 text-sm font-medium">{label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.startAt ? new Date(c.startAt).toLocaleString() : "Starts: now"} •{" "}
                            {c.endAt ? new Date(c.endAt).toLocaleString() : "No end"}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-4"
                            onClick={() => copy(code)}
                          >
                            {copied === code ? "Copied" : "Copy code"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tierOffers.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-semibold">Bulk order discount tiers</h2>
                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary hover:bg-primary">
                          <TableHead className="text-primary-foreground">Quantity range</TableHead>
                          <TableHead className="text-primary-foreground">Discount</TableHead>
                          <TableHead className="text-primary-foreground">Eligible items</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tierOffers.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-semibold">
                              {t.minimumQty ? `Buy ${t.minimumQty}+ items` : "Custom offer"}
                            </TableCell>
                            <TableCell className="text-primary">
                              {t.discountPercent
                                ? `${t.discountPercent}% OFF`
                                : `${formatPrice(Number(t.discountValue || 0))} OFF`}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {t.description || "Storewide offer"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </StoreLayout>
  );
}
