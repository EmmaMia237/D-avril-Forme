// API handlers moved to backend/moved-frontend-api for safety before publishing frontend.
// This stub prevents the frontend server from handling API requests.

export async function handleApiRequest(request: Request): Promise<Response | null> {
  // Original implementation has been relocated to backend/moved-frontend-api.
  // Returning null ensures the frontend doesn't serve server-side API endpoints.
  return null;
}

export async function handleApiRequest(request: Request): Promise<Response | null> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    // Only handle our API routes here
    if (!path.startsWith("/api/")) return null;

    // Auth: POST /api/auth/login
    if (path === "/api/auth/login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { email, password } = body as { email?: string; password?: string };
      if (!email || !password) return errorResponse("Missing credentials", 400);

      const db = await connectDb();
      const users = db.collection("users");
      const user = await users.findOne({ email: String(email).toLowerCase() });
      if (!user) return errorResponse("Invalid credentials", 401);

      const ok = await comparePassword(password, user.passwordHash ?? user.password ?? "");
      if (!ok) return errorResponse("Invalid credentials", 401);

      const role = user.role === "admin" ? "admin" : "user";
      const token = signToken({ sub: String(user._id), role });

      const cookie = makeSetCookieHeader("session", token, { maxAge: 60 * 60 * 24 * 7, httpOnly: true });
      return jsonResponse({ ok: true, user: { id: String(user._id), email: user.email, name: user.name ?? null, address: user.address ?? null, role } }, 200, { "Set-Cookie": cookie });
    }

    // Register: POST /api/auth/register
    if (path === "/api/auth/register" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { name, email, password, address } = body as { name?: string; email?: string; password?: string; address?: string };
      if (!name || !email || !password) return errorResponse("Missing registration fields", 400);

      const db = await connectDb();
      const users = db.collection("users");
      const existing = await users.findOne({ email: String(email).toLowerCase() });
      if (existing) return errorResponse("Email already registered", 409);

      const passwordHash = await hashPassword(password);
      const res = await users.insertOne({ name, email: String(email).toLowerCase(), passwordHash, address: address ?? null, role: "user", createdAt: new Date() });

      const token = signToken({ sub: String(res.insertedId), role: "user" });
      const cookie = makeSetCookieHeader("session", token, { maxAge: 60 * 60 * 24 * 7, httpOnly: true });
      return jsonResponse({ ok: true, user: { id: String(res.insertedId), email, name, address: address ?? null, role: "user" } }, 201, { "Set-Cookie": cookie });
    }

    // Admin login: POST /api/auth/admin-login
    if (path === "/api/auth/admin-login" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { email, password } = body as { email?: string; password?: string };
      if (!email || !password) return errorResponse("Missing credentials", 400);

      const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim();
      const adminPass = (process.env.ADMIN_PASS ?? "").trim();
      if (adminEmail && adminPass && String(email).toLowerCase() === adminEmail.toLowerCase() && password === adminPass) {
        const token = signToken({ sub: adminEmail, role: "admin" });
        const cookie = makeSetCookieHeader("session", token, { maxAge: 60 * 60 * 24 * 7, httpOnly: true });
        return jsonResponse({ ok: true, admin: true, email: adminEmail }, 200, { "Set-Cookie": cookie });
      }

      try {
        const db = await connectDb();
        const users = db.collection("users");
        const user = await users.findOne({ email: String(email).toLowerCase(), role: "admin" });
        if (!user) return errorResponse("Invalid admin credentials", 401);
        const ok = await comparePassword(password, user.passwordHash ?? user.password ?? "");
        if (!ok) return errorResponse("Invalid admin credentials", 401);

        const token = signToken({ sub: String(user._id), role: "admin" });
        const cookie = makeSetCookieHeader("session", token, { maxAge: 60 * 60 * 24 * 7, httpOnly: true });
        return jsonResponse({ ok: true, admin: true, email: user.email }, 200, { "Set-Cookie": cookie });
      } catch (err: any) {
        return errorResponse("Invalid admin credentials", 401);
      }
    }

    // Logout: POST /api/auth/logout
    if (path === "/api/auth/logout" && request.method === "POST") {
      // Clear cookie
      const cookie = makeSetCookieHeader("session", "", { maxAge: 0, httpOnly: true });
      return jsonResponse({ ok: true }, 200, { "Set-Cookie": cookie });
    }

    // Me: GET /api/auth/me - also PUT to update profile/address
    if (path === "/api/auth/me") {
      const cookieHeader = request.headers.get("cookie") ?? "";
      const match = cookieHeader.match(/(?:^|;)\s*session=([^;]+)/);
      const token = match ? decodeURIComponent(match[1]) : null;
      if (!token) return jsonResponse({ ok: false, authenticated: false }, 200);
      const decoded: any = verifyToken(token);
      if (!decoded) return jsonResponse({ ok: false, authenticated: false }, 200);

      // If admin token, return minimal admin info
      if (decoded.role === "admin") return jsonResponse({ ok: true, authenticated: true, admin: true, email: decoded.sub, payload: decoded }, 200);

      // For user tokens, fetch user record
      if (decoded.role === "user") {
        const { ObjectId } = await import("mongodb");
        const db = await connectDb();
        const users = db.collection("users");

        if (request.method === "GET") {
          try {
            const u = await users.findOne({ _id: new ObjectId(String(decoded.sub)) });
            if (!u) return jsonResponse({ ok: false, authenticated: false }, 200);
            return jsonResponse({ ok: true, authenticated: true, user: { id: String(u._id), email: u.email, name: u.name ?? null, address: u.address ?? null } }, 200);
          } catch (err: any) {
            return errorResponse("Failed to load user: " + (err?.message ?? String(err)), 500);
          }
        }

        if (request.method === "PUT") {
          const body = await request.json().catch(() => ({}));
          const { name, address } = body as { name?: string; address?: string };
          try {
            await users.updateOne({ _id: new ObjectId(String(decoded.sub)) }, { $set: { ...(name ? { name } : {}), ...(address ? { address } : {}), updatedAt: new Date() } });
            const u = await users.findOne({ _id: new ObjectId(String(decoded.sub)) });
            return jsonResponse({ ok: true, user: { id: String(u._id), email: u.email, name: u.name ?? null, address: u.address ?? null } }, 200);
          } catch (err: any) {
            return errorResponse("Failed to update user: " + (err?.message ?? String(err)), 500);
          }
        }
      }

      return jsonResponse({ ok: true, authenticated: true, payload: decoded }, 200);
    }

    // Payment: create checkout session
    if (path === "/api/payment/create-checkout" && request.method === "POST") {
      if (!stripe) return errorResponse("Stripe not configured", 500);
      const body = await request.json().catch(() => ({}));
      const { items, success_url, cancel_url } = body as { items?: Array<any>; success_url?: string; cancel_url?: string };
      if (!Array.isArray(items) || items.length === 0) return errorResponse("No items provided", 400);
      if (!success_url || !cancel_url) return errorResponse("Missing redirect URLs", 400);

      // Map items to Stripe line_items with price_data (expects amount in cents)
      const line_items = items.map((it) => {
        const unitAmount = Math.round((Number(it.amount) || 0) * 100);
        if (unitAmount < 50) throw new Error(`${it.name ?? "Item"} must be at least $0.50 for card checkout.`);
        const product_data: any = { name: it.name ?? "Item" };
        if (it.customization) {
          try {
            product_data.description = typeof it.customization === 'string' ? it.customization : JSON.stringify(it.customization);
            product_data.metadata = { custom: JSON.stringify(it.customization) };
          } catch {
            // ignore serialization errors
          }
        }
        return {
          price_data: {
            currency: it.currency ?? "usd",
            product_data,
            unit_amount: unitAmount,
          },
          quantity: it.quantity ?? 1,
        };
      });

      const trackingNumber = `AF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items,
        success_url,
        cancel_url,
        metadata: { trackingNumber },
      });

      // create a lightweight order record in DB to track the session and items
      try {
        const db = await connectDb();
        const orders = db.collection("orders");
        const total = items.reduce((s: number, it: any) => s + (Number(it.amount) || 0) * (it.quantity || 1), 0);
        await orders.insertOne({ sessionId: session.id, trackingNumber, items, total, status: "Payment Pending", createdAt: new Date() });
      } catch (err) {
        // ignore DB order creation errors but do not fail the checkout
        console.warn("Failed to create order record:", err);
      }

      return jsonResponse({ ok: true, id: session.id, url: session.url }, 200);
    }

    // Order lookup after Stripe redirects back with the checkout session id.
    if (path.startsWith("/api/orders/session/") && request.method === "GET") {
      const sessionId = decodeURIComponent(path.split("/").pop() ?? "");
      if (!sessionId) return errorResponse("Missing session id", 400);
      try {
        const db = await connectDb();
        const order = await db.collection("orders").findOne({ sessionId });
        if (!order) return errorResponse("Order not found", 404);
        return jsonResponse({
          ok: true,
          order: {
            id: String(order._id),
            sessionId: order.sessionId,
            trackingNumber: order.trackingNumber,
            status: order.status ?? "Payment Pending",
            total: order.total ?? 0,
            items: order.items ?? [],
          },
        });
      } catch (err: any) {
        return errorResponse("Failed to load order: " + (err?.message ?? String(err)), 500);
      }
    }

    // DB status
    if (path === "/api/db/status" && request.method === "GET") {
      try {
        const db = await connectDb();
        // simple command to verify connectivity
        await db.command({ ping: 1 });
        return jsonResponse({ ok: true, connected: true }, 200);
      } catch (err: any) {
        return errorResponse("Database not connected: " + (err?.message ?? String(err)), 500);
      }
    }

    // Products: read-only listing
    if (path === "/api/products" && request.method === "GET") {
      try {
        const db = await connectDb();
        const items = await db.collection("products").find({}).toArray();
        return jsonResponse({ ok: true, products: items }, 200);
      } catch (err: any) {
        return errorResponse(err?.message ?? String(err), 500);
      }
    }

    // Admin product CRUD (requires admin session)
    if (path.startsWith("/api/admin/products")) {
      // get admin session from cookie
      const cookieHeader = request.headers.get("cookie") ?? "";
      const match = cookieHeader.match(/(?:^|;)\s*session=([^;]+)/);
      const token = match ? decodeURIComponent(match[1]) : null;
      const decoded: any = token ? verifyToken(token) : null;
      if (!decoded || decoded.role !== "admin") return errorResponse("Admin access required", 401);

      const db = await connectDb();
      const col = db.collection("products");

      // POST /api/admin/products - create
      if (path === "/api/admin/products" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const res = await col.insertOne({ ...body, createdAt: new Date() });
        return jsonResponse({ ok: true, id: String(res.insertedId) }, 201);
      }

      // PUT/DELETE with id
      const parts = path.split("/");
      const id = parts[parts.length - 1];
      if (!id) return errorResponse("Missing product id", 400);

      if (request.method === "PUT") {
        const body = await request.json().catch(() => ({}));
        const { ObjectId } = await import("mongodb");
        await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...body, updatedAt: new Date() } });
        return jsonResponse({ ok: true }, 200);
      }

      if (request.method === "DELETE") {
        const { ObjectId } = await import("mongodb");
        await col.deleteOne({ _id: new ObjectId(id) });
        return jsonResponse({ ok: true }, 200);
      }
    }

    return errorResponse("Not found", 404);
  } catch (err: any) {
    return errorResponse(err?.message ?? String(err), 500);
  }
}
