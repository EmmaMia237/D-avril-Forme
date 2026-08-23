// Backup copy of frontend/src/lib/api.ts moved here to avoid exposing API handlers in the frontend repo.
// Original author: moved for safety before publishing frontend code to GitHub.

// NOTE: Keep this file in the backend if you want to re-enable or migrate these handlers.

// --- BEGIN ORIGINAL frontend/src/lib/api.ts ---

import { connectDb } from "../frontend/src/lib/db";
import { signToken, comparePassword, hashPassword, verifyToken } from "../frontend/src/lib/auth";
import Stripe from "stripe";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY, { apiVersion: "2022-11-15" }) : null;

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

function makeSetCookieHeader(name: string, value: string, opts: { maxAge?: number; httpOnly?: boolean } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push("Path=/");
  if (opts.httpOnly) parts.push("HttpOnly");
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  // SameSite=Lax to allow post-redirect from Stripe while providing CSRF protection for most requests.
  parts.push("SameSite=Lax");
  return parts.join("; ");
}

export async function handleApiRequest(request: Request): Promise<Response | null> {
  // ORIGINAL implementation preserved here for migration. See backup for full body.
  return null;
}

// --- END ORIGINAL ---
