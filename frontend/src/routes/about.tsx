import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Leaf, Palette } from "lucide-react";

import { StoreLayout } from "@/components/store-layout";
const printProcess = "/images/printing-image.png";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About OsanPrints — Craft Printing Studio" },
      {
        name: "description",
        content:
          "OsanPrints is a craft printing studio built on ink durability, eco-friendly fabrics and precision colour matching for every custom order.",
      },
      { property: "og:title", content: "About OsanPrints — Craft Printing Studio" },
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
  const prefersReducedMotion = useReducedMotion();
  const revealInitial = prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 };
  const revealInView = { opacity: 1, y: 0 };
  const revealViewport = { once: true, amount: 0.2 };
  const [aboutImg, setAboutImg] = useState<string>(printProcess);
  const [videoSrc, setVideoSrc] = useState<string>("/images/TUTORIAL MP4.mp4");

  useEffect(() => {
    (async function pickAboutAssets() {
      try {
        const r = await fetch("/images/printing-image.png", { method: "HEAD" });
        if (r && r.ok) setAboutImg("/images/printing-image.png");
      } catch (e) {
        // keep fallback
      }

      try {
        const v = await fetch("/images/tutorial.mp4", { method: "HEAD" });
        if (v && v.ok) setVideoSrc("/images/tutorial.mp4");
      } catch (e) {
        // fallback to existing TUTORIAL MP4
      }
    })();
  }, []);

  return (
    <StoreLayout>
      <motion.section
        className="mx-auto max-w-7xl px-4 py-16 lg:px-8"
        initial={revealInitial}
        whileInView={revealInView}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
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
                Where everyday items become your canvas. At OsanPrints, we believe the things you
                carry, wear, and use every day should feel like a reflection of you. From cozy
                graphic tees and statement hoodies to protective phone cases, everyday tote bags,
                and your morning coffee mug — we bring thoughtful design to life on high-quality
                essentials.
              </p>
              <p>
                Whether you love minimalist aesthetic prints, retro typography, or custom
                personalized pieces, OsanPrints adds form, function, and personality to your daily
                routine. Designed to inspire. Printed to last.
              </p>
              <p>
                We design around quality, individuality, and everyday practicality — helping people
                turn useful items into personal statements, gifts, and keepsakes that feel special
                from the very first use.
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
      </motion.section>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <h2 className="font-display text-3xl font-semibold mb-4">Why shop OsanPrints</h2>
          <div className="grid gap-5 md:grid-cols-3 mb-8">
            {[
              {
                emoji: "🌱",
                title: "Quality Materials",
                text: "Premium fabrics and durable, vibrant prints.",
              },
              {
                emoji: "🎨",
                title: "Unique Designs",
                text: "Original artwork, minimalist lines, and retro vibes.",
              },
              {
                emoji: "🎁",
                title: "Made to Order",
                text: "Personalization available for gifts that mean more.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="rounded-lg bg-white p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                initial={revealInitial}
                whileInView={revealInView}
                viewport={revealViewport}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.08 }}
              >
                <p className="text-3xl mb-2">{item.emoji}</p>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-nude/60">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <h2 className="font-display text-3xl font-semibold">Craftsmanship &amp; quality</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                className="rounded-lg bg-nude p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                initial={revealInitial}
                whileInView={revealInView}
                viewport={revealViewport}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.08 }}
              >
                <p.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        className="mx-auto max-w-7xl px-4 py-16 lg:px-8"
        initial={revealInitial}
        whileInView={revealInView}
        viewport={revealViewport}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
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
        <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-4">
          {["Digital design", "Colour proofing", "Press & cure", "Inspect & pack"].map(
            (step, i) => (
              <motion.li
                key={step}
                className="relative flex gap-4 md:block"
                initial={revealInitial}
                whileInView={revealInView}
                viewport={revealViewport}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.08 }}
              >
                <div className="flex flex-col items-center md:block">
                  <span className="font-display text-4xl font-bold text-accent">0{i + 1}</span>
                  {i < 3 && (
                    <span className="mt-3 block h-full w-px flex-1 bg-border/70 md:absolute md:top-6 md:left-16 md:mt-0 md:h-px md:w-[calc(100%-4rem)]" />
                  )}
                </div>
                <p className="pt-2 text-sm font-semibold md:mt-4 md:pt-0">{step}</p>
              </motion.li>
            ),
          )}
        </ol>
      </motion.section>
    </StoreLayout>
  );
}
