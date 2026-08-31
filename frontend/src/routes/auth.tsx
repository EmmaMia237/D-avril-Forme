import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch, setAuthToken } from "@/lib/api-client";
import { readStoredCart, syncCartToServer } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
const heroImage = "/images/hero-image.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Register — OsanPrints Account" },
      {
        name: "description",
        content:
          "Create an OsanPrints account or sign in to track custom print orders, saved designs and shipping addresses.",
      },
      { property: "og:title", content: "Sign In or Register — OsanPrints" },
      {
        property: "og:description",
        content: "Access your OsanPrints customer account, orders and saved artwork.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [emailOptIn, setEmailOptIn] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

    try {
      if (mode === "login") {
        const email = String(fd.get("login-email") ?? "");
        const password = String(fd.get("login-password") ?? "");

        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok === true && data?.token) {
          setAuthToken(data.token);
          const guestCart = readStoredCart();
          if (guestCart.length > 0) {
            try {
              await syncCartToServer(guestCart);
              window.localStorage.removeItem("af_cart_items");
            } catch {
              // keep the session active even if the background sync fails
            }
          }
          toast.success("Signed in");
          window.location.href = "/";
          return;
        }
        return toast.error(data?.error || "Login failed. Please check your details.");
      } else if (mode === "register") {
        const name = String(fd.get("reg-name") ?? "");
        const email = String(fd.get("reg-email") ?? "");
        const password = String(fd.get("reg-password") ?? "");
        const address = String(fd.get("reg-address") ?? "");
        const res = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, password, address, emailOptIn }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok === true && data?.token) {
          setAuthToken(data.token);
          const guestCart = readStoredCart();
          if (guestCart.length > 0) {
            try {
              await syncCartToServer(guestCart);
              window.localStorage.removeItem("af_cart_items");
            } catch {
              // keep the session active even if the background sync fails
            }
          }
          toast.success("Account created and signed in");
          window.location.href = "/";
          return;
        }
        return toast.error(data?.error || "Something went wrong, please try again.");
      }
    } catch {
      toast.error("Something went wrong, please try again.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside
        className="relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex"
        style={{ backgroundImage: "var(--gradient-maroon)" }}
      >
        <Link to="/" className="font-display text-2xl font-semibold">
          OsanPrints
        </Link>
        <div>
          <img
            src={heroImage}
            alt="Custom printed merchandise set"
            loading="lazy"
            width={1600}
            height={1200}
            className="mb-8 w-full rounded-lg object-cover shadow-[var(--shadow-lift)]"
          />
          <h2 className="font-display text-3xl leading-tight font-semibold">
            One account for every print run.
          </h2>
          <p className="mt-3 max-w-md text-sm opacity-80">
            Save artwork, reorder in a click and follow production status from press to doorstep.
          </p>
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} OsanPrints</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold">Welcome to OsanPrints</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue, or create an account in under a minute.
          </p>

          <Tabs value={mode} onValueChange={setMode} className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={submit} className="grid gap-4 pt-6">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    name="login-email"
                    type="email"
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    name="login-password"
                    type="password"
                    className="mt-1.5"
                    required
                  />
                </div>
                <Button type="submit" size="lg">
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={submit} className="grid gap-4 pt-6">
                <div>
                  <Label htmlFor="reg-name">Full name</Label>
                  <Input id="reg-name" name="reg-name" className="mt-1.5" required />
                </div>
                <div>
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="reg-email" type="email" className="mt-1.5" required />
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    name="reg-password"
                    type="password"
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reg-address">Shipping address</Label>
                  <Textarea
                    id="reg-address"
                    name="reg-address"
                    rows={3}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="reg-email-opt-in"
                    checked={emailOptIn}
                    onCheckedChange={(checked) => setEmailOptIn(checked === true)}
                  />
                  <Label htmlFor="reg-email-opt-in" className="text-sm font-normal leading-5">
                    Receive emails about new products and offers
                  </Label>
                </div>
                <Button type="submit" size="lg">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-4">
              Back to storefront
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
