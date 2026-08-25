import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";

// Client-side fallback: convert path-based /product/:id to query-param /product?id=:id
// This ensures existing file-based router (which currently reads the query param) can handle direct path visits
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/product\/(.+)$/);
  if (m) {
    try {
      const id = decodeURIComponent(m[1]);
      const search = new URLSearchParams(window.location.search);
      if (!search.get("id")) search.set("id", id);
      const newUrl = `/product?${search.toString()}` + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    } catch (e) {
      // ignore
    }
  }
}

const router = getRouter();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

