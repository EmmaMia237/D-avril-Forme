import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { PageTitle, Panel, StatusPill } from "@/components/admin-ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminDesigns } from "@/lib/shop-data";

export const Route = createFileRoute("/admin/designs")({
  component: function AdminDesignsRedirect() {
    if (typeof window !== "undefined") window.location.href = "/avril-admin";
    return null;
  },
});

function DesignsPage() {
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Apparel",
    price: 0,
    productType: "pre-designed",
    colors: "Cream, Maroon",
    theme: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/products");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) setProductsList(data.products || []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...newProduct,
        colors: newProduct.colors
          .split(",")
          .map((color) => color.trim())
          .filter(Boolean),
        theme: newProduct.theme || undefined,
      };
      const res = await apiFetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setNewProduct({
          name: "",
          category: "Apparel",
          price: 0,
          productType: "pre-designed",
          colors: "Cream, Maroon",
        });
        fetchProducts();
        toast.success("Product created");
      } else {
        toast.error(data?.error || "Create failed");
      }
    } catch (err) {
      toast.error("Create failed");
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await apiFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        fetchProducts();
        toast.success("Deleted");
      } else {
        toast.error(data?.error || "Delete failed");
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  return (
    <>
      <PageTitle
        title="Manage Print Designs"
        subtitle="Upload artwork, map it to mockup items, and control catalog availability."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Design upload suite">
          <div className="p-5">
            <label className="grid cursor-pointer place-items-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-nude px-6 py-12 text-center">
              <UploadCloud className="h-8 w-8 text-primary" />
              <span className="text-sm font-semibold">Drag and drop high-res artwork</span>
              <span className="text-xs text-muted-foreground">
                PNG, SVG, AI, PSD · max 40MB per file
              </span>
              <input type="file" multiple className="hidden" />
            </label>
          </div>
        </Panel>

        <Panel title="Mockup generator mapping">
          <form
            className="grid gap-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Mockup mapping saved to draft.");
            }}
          >
            <div>
              <Label>Default mockup item</Label>
              <Select defaultValue="tee-front">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tee-front">T-Shirt — front</SelectItem>
                  <SelectItem value="tee-back">T-Shirt — back</SelectItem>
                  <SelectItem value="mug-wrap">Mug — full wrap</SelectItem>
                  <SelectItem value="case-back">Phone Case — back</SelectItem>
                  <SelectItem value="notebook">Notebook — cover</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="price">Default price (USD)</Label>
                <Input id="price" type="number" defaultValue={24} className="mt-1.5" />
              </div>
              <div>
                <Label>Category</Label>
                <Select defaultValue="apparel">
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apparel">Apparel</SelectItem>
                    <SelectItem value="drinkware">Drinkware</SelectItem>
                    <SelectItem value="cases">Phone Cases</SelectItem>
                    <SelectItem value="stationery">Stationery</SelectItem>
                    <SelectItem value="corporate">Corporate Merch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-nude px-4 py-3">
              <span className="text-sm">Publish to storefront immediately</span>
              <Switch defaultChecked />
            </div>
            <Button type="submit">Save Mapping</Button>
          </form>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Inventory & product catalog">
          <div className="p-4">
            <form className="grid gap-3 sm:grid-cols-5" onSubmit={createProduct}>
              <Input
                placeholder="Name"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct((s) => ({ ...s, name: (e.target as HTMLInputElement).value }))
                }
              />
              <Input
                placeholder="Price"
                type="number"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct((s) => ({
                    ...s,
                    price: Number((e.target as HTMLInputElement).value || 0),
                  }))
                }
              />
              <Select
                value={newProduct.category}
                onValueChange={(v) => setNewProduct((s) => ({ ...s, category: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apparel">Apparel</SelectItem>
                  <SelectItem value="Drinkware">Drinkware</SelectItem>
                  <SelectItem value="Phone Cases">Phone Cases</SelectItem>
                  <SelectItem value="Stationery">Stationery</SelectItem>
                  <SelectItem value="Mugs">Mugs</SelectItem>
                  <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                  <SelectItem value="Tote Bags">Tote Bags</SelectItem>
                  <SelectItem value="Hoodies">Hoodies</SelectItem>
                  <SelectItem value="Wall Art">Wall Art</SelectItem>
                  <SelectItem value="Keychains">Keychains</SelectItem>
                  <SelectItem value="Caps">Caps</SelectItem>
                  <SelectItem value="Kids">Kids</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={newProduct.productType}
                onValueChange={(v) => setNewProduct((s) => ({ ...s, productType: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-designed">Pre-designed / Customized</SelectItem>
                  <SelectItem value="blank">Blank Product</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Colors: Cream, Maroon"
                value={newProduct.colors}
                onChange={(e) =>
                  setNewProduct((s) => ({ ...s, colors: (e.target as HTMLInputElement).value }))
                }
              />
              <Select
                value={newProduct.theme}
                onValueChange={(v) => setNewProduct((s) => ({ ...s, theme: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="kids">Kids Collection</SelectItem>
                  <SelectItem value="halloween">Halloween Collection</SelectItem>
                  <SelectItem value="autumn">Fall / Autumn Collection</SelectItem>
                  <SelectItem value="anime">Anime Collection</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">Create product</Button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell>Loading…</TableCell>
                  </TableRow>
                ) : (
                  productsList.map((p) => (
                    <TableRow key={String(p._id)}>
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell>${p.price}</TableCell>
                      <TableCell>{p.theme || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const price = prompt("New price", String(p.price));
                            if (!price) return;
                            apiFetch(`/api/admin/products/${p._id}`, {
                              method: "PUT",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ price: Number(price) }),
                            }).then(async (r) => {
                              const d = await r.json().catch(() => ({}));
                              if (r.ok && d?.ok) {
                                fetchProducts();
                                toast.success("Updated");
                              } else toast.error(d?.error || "Update failed");
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProduct(String(p._id))}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </>
  );
}
