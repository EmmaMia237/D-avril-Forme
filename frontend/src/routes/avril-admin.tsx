import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/avril-admin")({
  component: function AvrilAdminRedirect() {
    if (typeof window !== "undefined") {
      // Redirect to standalone admin app
      window.location.href = "http://localhost:5174/admin/login";
    }
    return null;
  },
});