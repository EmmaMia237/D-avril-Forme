// Lightweight error reporting helper: logs to console and preserves the same API shape.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    // Keep a simple console log so errors are visible in dev tools.
    // If later a third-party telemetry service is desired, swap implementation here.
    console.error("Reported error:", error, context);
  } catch (e) {
    // swallow any error during reporting to avoid infinite loops
    // eslint-disable-next-line no-empty
  }
}
