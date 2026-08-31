import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Mail, MapPin, Phone, Instagram, Smartphone, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { StoreLayout } from "@/components/store-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { faqs } from "@/lib/shop-data";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Help — OsanPrints Support" },
      {
        name: "description",
        content:
          "Reach the OsanPrints print studio: support email, phone, opening hours and answers on artwork files, shipping timelines and returns.",
      },
      { property: "og:title", content: "Contact & Help — OsanPrints" },
      {
        property: "og:description",
        content: "Send an enquiry or read our print, shipping and returns FAQ.",
      },
    ],
  }),
  component: ContactPage,
});

const inquirySchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  orderId: z.string().trim().max(32).optional(),
  subject: z.string().trim().min(1, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1000),
});

function ContactPage() {
  const prefersReducedMotion = useReducedMotion();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const revealInitial = prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 };
  const revealInView = { opacity: 1, y: 0 };
  const revealViewport = { once: true, amount: 0.2 };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = inquirySchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      orderId: form.get("orderId"),
      subject: form.get("subject"),
      message: form.get("message"),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    e.currentTarget.reset();
    toast.success("Inquiry sent — our studio replies within one business day.");
  };

  return (
    <StoreLayout>
      <section className="border-b border-border bg-nude">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <h1 className="font-display text-4xl font-semibold">Contact &amp; Help</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Artwork questions, bulk quotes or order updates — talk to the people at the press.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8">
        <motion.aside
          className="grid h-fit gap-7"
          initial={revealInitial}
          whileInView={revealInView}
          viewport={revealViewport}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {[
            { icon: Mail, title: "Email", value: "support@avrilforme.com" },
            {
              icon: Phone,
              title: "Business & WhatsApp",
              value: "+44 7417 575436",
              href: "https://wa.me/447417575436",
            },
            { icon: Clock, title: "Operating hours", value: "Mon–Sat, 8:00am – 7:00pm" },
            {
              icon: MapPin,
              title: "Studio address",
              value: "Custom printing studio • UK-based order support",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              className="flex items-start gap-4 border-b border-border/60 pb-7 last:border-b-0 last:pb-0"
              initial={revealInitial}
              whileInView={revealInView}
              viewport={revealViewport}
              transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.08 }}
            >
              <c.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                  {c.title}
                </p>
                {c.href ? (
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-sm break-words text-foreground underline-offset-4 hover:underline"
                  >
                    {c.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm break-words">{c.value}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.aside>

        <motion.form
          onSubmit={onSubmit}
          noValidate
          className="rounded-lg bg-card p-6 shadow-[var(--shadow-soft)]"
          initial={revealInitial}
          whileInView={revealInView}
          viewport={revealViewport}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="font-display text-2xl font-semibold">Send an inquiry</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" error={errors["name"]} />
            <Field label="Email" name="email" type="email" error={errors["email"]} />
            <Field label="Order ID (optional)" name="orderId" error={errors["orderId"]} />
            <Field label="Subject" name="subject" error={errors["subject"]} />
          </div>
          <div className="mt-4">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" rows={6} className="mt-1.5" maxLength={1000} />
            {errors["message"] && (
              <p className="mt-1 text-xs text-destructive">{errors["message"]}</p>
            )}
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto">
            Send Inquiry
          </Button>
        </motion.form>
      </div>

      <motion.section
        className="border-b border-border bg-card"
        initial={revealInitial}
        whileInView={revealInView}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
          <h2 className="font-display text-2xl font-semibold">Follow us</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect with us on social media for behind-the-scenes updates, new collections, and
            inspiration.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://www.instagram.com/davril_forme?igsh=MTYwZGllOWs5aWFweg=="
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-nude text-primary shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://www.tiktok.com/@atelier_davril"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-nude text-primary shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground"
            >
              <Smartphone className="h-5 w-5" />
            </a>
            <a
              href="https://wa.me/447417575436"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-nude text-primary shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>
        </div>
      </motion.section>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-3xl px-4 py-14 lg:px-8">
          <h2 className="font-display text-3xl font-semibold">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map((f, i) => (
              <motion.div
                key={f.q}
                initial={revealInitial}
                whileInView={revealInView}
                viewport={revealViewport}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.06 }}
              >
                <AccordionItem value={`item-${i}`} className="border-border/60">
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>
    </StoreLayout>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string | undefined;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} className="mt-1.5" />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
