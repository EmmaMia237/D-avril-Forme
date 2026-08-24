import { createFileRoute } from "@tanstack/react-router";
import { Droplets, Leaf, Palette, Instagram, MessageCircle } from "lucide-react";

import { StoreLayout } from "@/components/store-layout";
const printProcess = '/images/printing-image.png';
const heroImage = '/images/hero-image.png';
import { useEffect, useState } from "react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About D'avril Forme — Craft Printing Studio" },
      {
        name: "description",
        content:
          "D'avril Forme is a craft printing studio built on ink durability, eco-friendly fabrics and precision colour matching for every custom order.",
      },
      { property: "og:title", content: "About D'avril Forme — Craft Printing Studio" },
      {
        property: "og:description",
        content: "Meet the studio behind the press: quality pillars and our production workflow.",
      },
    ],
  }),
  component: AboutPage,
});

const pillars = [
  {
    icon: Droplets,
    title: "Ink Durability",
    text: "Pigment inks cured at press temperature survive 60+ washes without cracking or fading.",
  },
  {
    icon: Leaf,
    title: "Eco-friendly Fabrics",
    text: "Certified organic cotton and recycled paper stock, with water-based inks throughout.",
  },
  {
    icon: Palette,
    title: "Precision Colour Matching",
    text: "HEX and Pantone references calibrated before every run, with a digital proof for approval.",
  },
];

function AboutPage() {
  const [aboutImg, setAboutImg] = useState<string>(printProcess);
  const [videoSrc, setVideoSrc] = useState<string>('/images/TUTORIAL MP4.mp4');

  useEffect(() => {
    (async function pickAboutAssets(){
      try {
        const r = await fetch('/images/printing-image.png', { method: 'HEAD' });
        if (r && r.ok) setAboutImg('/images/printing-image.png');
      } catch (e) {
        // keep fallback
      }

      try {
        const v = await fetch('/images/tutorial.mp4', { method: 'HEAD' });
        if (v && v.ok) setVideoSrc('/images/tutorial.mp4');
      } catch (e) {
        // fallback to existing TUTORIAL MP4
      }
    })();
  }, []);

  return (
    <StoreLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.26em] text-primary uppercase">
              Our story
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight font-semibold sm:text-5xl">
              A printing studio built around one obsession: the finish.
            </h1>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Where everyday items become your canvas. At D’avril Forme, we believe the things you
                carry, wear, and use every day should feel like a reflection of you. From cozy graphic
                tees and statement hoodies to protective phone cases, everyday tote bags, and your
                morning coffee mug — we bring thoughtful design to life on high-quality essentials.
              </p>
              <p>
                Whether you love minimalist aesthetic prints, retro typography, or custom personalized
                pieces, D’avril Forme adds form, function, and personality to your daily routine.
                Designed to inspire. Printed to last.
              </p>
              <p>
                We design around quality, individuality, and everyday practicality — helping people turn
                useful items into personal statements, gifts, and keepsakes that feel special from the
                very first use.
              </p>
            </div>
          </div>
          <img
            src={aboutImg}
            alt="Studio operator pulling maroon ink across a screen print frame"
            loading="lazy"
            width={1408}
            height={1008}
            className="w-full rounded-lg object-cover shadow-[var(--shadow-lift)]"
          />
        </div>
      </section>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <h2 className="font-display text-3xl font-semibold mb-4">Why shop D'avril Forme</h2>
          <div className="grid gap-5 md:grid-cols-3 mb-8">
            {[
              { emoji: "🌱", title: "Quality Materials", text: "Premium fabrics and durable, vibrant prints." },
              { emoji: "🎨", title: "Unique Designs", text: "Original artwork, minimalist lines, and retro vibes." },
              { emoji: "🎁", title: "Made to Order", text: "Personalization available for gifts that mean more." },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-white p-6">
                <p className="text-3xl mb-2">{item.emoji}</p>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <h2 className="font-display text-3xl font-semibold">Craftsmanship &amp; quality</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-lg border border-border bg-nude p-6">
                <p.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <h2 className="font-display text-3xl font-semibold">Behind the press</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          From digital design to final packaging — the four stages every order moves through.
        </p>
        <div className="relative mt-8 overflow-hidden rounded-lg bg-black">
          <video
          src={videoSrc}
          poster={aboutImg}
            controls
            className="h-auto w-full max-h-[500px] object-contain"
          />
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Digital design", "Colour proofing", "Press & cure", "Inspect & pack"].map(
            (step, i) => (
              <li key={step} className="rounded-lg border border-border bg-card p-5">
                <span className="font-display text-3xl font-bold text-accent">0{i + 1}</span>
                <p className="mt-2 text-sm font-semibold">{step}</p>
              </li>
            ),
          )}
        </ol>
      </section>
    </StoreLayout>
  );
}