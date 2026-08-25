import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "./product";

export const Route = createFileRoute("/product/:id")({
  head: () => ({ meta: [{ title: "Product — Avril Forme" }] }),
  component: ProductPage,
});
