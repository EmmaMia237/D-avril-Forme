import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { apiFetch, setAuthToken } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
const heroImage = "/images/hero-image.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Register — Avril Forme Account" },
      {
        name: "description",
        content:
          "Create an Avril Forme account or sign in to track custom print orders, saved designs and shipping addresses.",
      },
      { property: "og:title", content: "Sign In or Register — Avril Forme" },
      {
        property: "og:description",
        content: "Access your Avril Forme customer account, orders and saved artwork.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState("login");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

    const saveCustomerSession = (email: string, name: string) => {
      const profile = { email, name, lastLogin: new Date().toISOString() };
      window.localStorage.setItem("af_customer_current", JSON.stringify(profile));
      const accounts = JSON.parse(window.localStorage.getItem("af_customer_accounts") || "[]");
      const index = accounts.findIndex((entry: any) => entry.email === email);
      if (index >= 0) {
        accounts[index] = { ...accounts[index], ...profile };
      } else {
        accounts.push(profile);
      }
      window.localStorage.setItem("af_customer_accounts", JSON.stringify(accounts));
      setAuthToken("local-session-token");
    };

    const saveLead = (email: string, name?: string) => {
      const leads = JSON.parse(window.localStorage.getItem("af_marketing_leads") || "[]");
      const next = [
        {
          email,
          name: name || "Customer",
          source: "registration",
          createdAt: new Date().toISOString(),
        },
        ...leads,
      ];
      window.localStorage.setItem("af_marketing_leads", JSON.stringify(next.slice(0, 200)));
    };

    try {
      if (mode === "login") {
        const email = String(fd.get("login-email") ?? "");
        const password = String(fd.get("login-password") ?? "");

        try {
          const res = await apiFetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.ok === true) {
            if (data?.token) setAuthToken(data.token);
            if (email) saveCustomerSession(email, data?.name || email.split("@")[0]);
            toast.success("Signed in");
            window.location.href = "/";
            return;
          }
        } catch {
          // fallback below
        }

        const accounts = JSON.parse(window.localStorage.getItem("af_customer_accounts") || "[]");
        const match = accounts.find(
          (entry: any) => entry.email === email && entry.password === password,
        );
        if (match) {
          saveCustomerSession(match.email, match.name || match.email.split("@")[0]);
          toast.success("Signed in");
          window.location.href = "/";
          return;
        }

        return toast.error("Login failed");
      } else if (mode === "register") {
        const name = String(fd.get("reg-name") ?? "");
        const email = String(fd.get("reg-email") ?? "");
        const password = String(fd.get("reg-password") ?? "");
        const address = String(fd.get("reg-address") ?? "");

        try {
          const res = await apiFetch("/api/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, email, password, address }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data?.ok === true) {
            if (data?.token) setAuthToken(data.token);
            saveCustomerSession(email, name);
            saveLead(email, name);
            toast.success("Account created and signed in");
            window.location.href = "/";
            return;
          }
        } catch {
          // fallback below
        }

        const accounts = JSON.parse(window.localStorage.getItem("af_customer_accounts") || "[]");
        const exists = accounts.some((entry: any) => entry.email === email);
        if (exists) return toast.error("An account with that email already exists");
        const profile = { email, name, password, address };
        window.localStorage.setItem("af_customer_accounts", JSON.stringify([...accounts, profile]));
        saveCustomerSession(email, name);
        saveLead(email, name);
        toast.success("Account created and signed in");
        window.location.href = "/";
        return;
      }
    } catch (err: any) {
      toast.error(err?.message || String(err));
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside
        className="relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex"
        style={{ backgroundImage: "var(--gradient-maroon)" }}
      >
        <Link to="/" className="font-display text-2xl font-semibold">
          Avril Forme
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
        <p className="text-xs opacity-60">© {new Date().getFullYear()} Avril Forme</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold">Welcome to Avril Forme</h1>
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
                <Button type="submit" size="lg">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs tracking-widest text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" /> or continue with
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => toast.info("Social login pending backend setup.")}
            >
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Social login pending backend setup.")}
            >
              Apple
            </Button>
          </div>

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
