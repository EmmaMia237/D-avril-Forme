// Load environment from parent project root (.env) to pick up STRIPE keys
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || process.env.VITE_API_BASE_URL || "http://localhost:5173";
const stripeKey = process.env.STRIPE_SECRET_KEY || null;
let stripe = null;
if (stripeKey) {
  try {
    stripe = require("stripe")(stripeKey);
  } catch (err) {
    console.warn("Stripe not available:", err?.message || err);
    stripe = null;
  }
}

const app = express();
// Allow any origin during local development; reflect the request origin for CORS
app.use(cors({ origin: true, credentials: true }));
// Accept JSON and urlencoded payloads (large composites may be sent as base64 data URLs)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
// Error handler for malformed JSON payloads to avoid crashing the process
app.use((err, req, res, next) => {
  if (err && (err instanceof SyntaxError || err.type === "entity.parse.failed")) {
    console.warn("Malformed JSON payload received:", err.message);
    return res.status(400).json({ ok: false, error: "Invalid JSON payload" });
  }
  return next(err);
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const UPLOAD_DIR = path.join(__dirname, "uploads");
const ORDERS_FILE = path.join(__dirname, "orders.json");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");

function saveDataUrl(namePrefix, dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const ext = match[1].split("/")[1] || "png";
  const b64 = match[2];
  const fileName = `${namePrefix}-${Date.now()}.${ext}`.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
  return `/uploads/${fileName}`;
}

// Simple Basic Auth for admin endpoints using ADMIN_EMAIL / ADMIN_PASS from env
function adminAuth(req, res, next) {
  const adminUser = process.env.ADMIN_EMAIL || "admin@yourdomain.com";
  const adminPass = process.env.ADMIN_PASS || "changeme";
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  try {
    const creds = Buffer.from(auth.split(" ")[1], "base64").toString();
    const idx = creds.indexOf(":");
    if (idx === -1) return res.status(401).json({ ok: false, error: "Unauthorized" });
    const user = creds.slice(0, idx);
    const pass = creds.slice(idx + 1);
    // constant-time comparison would be better, but this is a simple dev auth
    if (user !== adminUser || pass !== adminPass)
      return res.status(403).json({ ok: false, error: "Forbidden" });
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
}

function validateCheckoutPayload(body) {
  if (!body || !Array.isArray(body.items)) return "Missing items array";
  if (body.items.length === 0) return "Cart is empty";
  if (body.items.length > 50) return "Too many items";
  for (let i = 0; i < body.items.length; i++) {
    const it = body.items[i];
    if (!it || typeof it.name !== "string" || it.name.trim().length === 0)
      return `Invalid item at index ${i}: missing name`;
    const qty = Number(it.quantity || it.qty || 1);
    if (!Number.isFinite(qty) || qty < 1 || qty > 999)
      return `Invalid quantity for item ${it.name}`;
    const price = Number(it.amount ?? it.price ?? 0);
    if (!Number.isFinite(price) || price < 0) return `Invalid price for item ${it.name}`;
    if (it.customization && typeof it.customization === "object") {
      if (it.customization.composite && typeof it.customization.composite === "string") {
        // limit composite data URL size to ~3MB
        if (it.customization.composite.length > 3_000_000)
          return `Composite image too large for item ${it.name}`;
        if (!it.customization.composite.startsWith("data:image/"))
          return `Invalid composite image format for item ${it.name}`;
      }
    }
  }
  return null;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: !!stripe });
});

// Auth status endpoint to verify admin session cookie or Authorization header
app.get("/api/auth/me", verifyJwt, (req, res) => {
  try {
    return res.json({ ok: true, authenticated: true, admin: true, payload: req.admin });
  } catch (err) {
    return res.status(401).json({ ok: false, authenticated: false });
  }
});

// Logout endpoint: clears the af_token cookie
app.post("/api/auth/logout", (req, res) => {
  try {
    // clear cookie with same options
    res.clearCookie("af_token", { path: "/" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("logout error", err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/payment/create-checkout", async (req, res) => {
  try {
    const validationError = validateCheckoutPayload(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    const { items = [], success_url, cancel_url } = req.body || {};

    const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;

    // Save any composite images and attach saved paths (make absolute URLs)
    const savedPreviews = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const customization = it.customization || {};
      if (customization.composite) {
        const saved = saveDataUrl(`order-item-${i}`, customization.composite);
        if (saved) {
          const absolute = saved.startsWith("http") ? saved : origin + saved;
          savedPreviews.push(absolute);
          customization.composite_saved = absolute;
        }
      }
    }

    // Persist order metadata to orders.json for admin review
    const orderRecord = {
      id: `AF-SRV-${Date.now()}`,
      createdAt: new Date().toISOString(),
      items: items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        price: it.amount || it.price,
      })),
      previewPaths: savedPreviews,
      raw: req.body,
    };
    const current = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8") || "[]");
    current.unshift(orderRecord);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(current, null, 2));

    // If Stripe is configured, create a real checkout session
    if (stripe) {
      const line_items = items.map((it) => ({
        price_data: {
          currency: (it.currency || "usd").toLowerCase(),
          product_data: { name: it.name },
          unit_amount: Math.round((it.amount ?? it.price ?? 0) * 100),
        },
        quantity: Math.max(1, it.quantity || 1),
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: success_url || origin + "/order-success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: cancel_url || origin + "/categories",
      });

      res.json({ ok: true, url: session.url });
      return;
    }

    // Fallback: return a simulated checkout url on the same host
    const simulated = origin + `/order-success?session_id=SIMULATED-${Date.now()}`;
    res.json({ ok: true, url: simulated, warning: "stripe_not_configured" });
  } catch (err) {
    console.error("create-checkout error", err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// JWT-based admin auth
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";

app.post("/api/admin/login", (req, res) => {
  try {
    console.log(
      "POST /api/admin/login body:",
      req.body && typeof req.body === "object" ? JSON.stringify(req.body) : req.body,
    );
    const { email, password } = req.body || {};
    const adminUser = process.env.ADMIN_EMAIL || "admin@yourdomain.com";
    const adminPass = process.env.ADMIN_PASS || "changeme";
    if (email !== adminUser || password !== adminPass) {
      console.log("admin login failed for", email);
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    const token = jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: "4h" });
    // set httpOnly cookie for session-based admin auth
    // For cross-origin XHR cookie handling in development, use SameSite=None and allow secure in production
    const secure = process.env.NODE_ENV === "production";
    // Set httpOnly cookie for admin session
    res.cookie("af_token", token, { httpOnly: true, sameSite: "none", secure, path: "/" });
    console.log("admin login success, set cookie");
    // Also return token in response body for development convenience (so SPA can store it in localStorage)
    return res.json({ ok: true, token });
  } catch (err) {
    console.error("admin login error", err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

function verifyJwt(req, res, next) {
  try {
    // Accept token via Authorization header or httpOnly cookie 'af_token'
    let token = null;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      token = auth.slice("Bearer ".length);
    } else if (req.headers.cookie) {
      // parse cookie header manually to avoid extra dependency
      const raw = req.headers.cookie.split(";").map((c) => c.trim());
      for (let i = 0; i < raw.length; i++) {
        const [k, v] = raw[i].split("=");
        if (k === "af_token") {
          token = v;
          break;
        }
      }
    }
    if (!token) return res.status(401).json({ ok: false, error: "Missing token" });
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Invalid token" });
  }
}

// Admin dashboard endpoint: compute lightweight, real data summary from orders.json (protected with JWT)
app.get("/api/admin/dashboard", verifyJwt, (req, res) => {
  try {
    const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
    const current = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8") || "[]");

    // helper: get numeric total for an order
    function orderTotal(o) {
      if (typeof o.total === "number") return o.total;
      if (Array.isArray(o.items)) {
        return o.items.reduce((s, it) => {
          const qty = Number(it.quantity || it.qty || 1) || 1;
          const price = Number(it.price ?? it.amount ?? 0) || 0;
          return s + qty * price;
        }, 0);
      }
      if (o.raw && Array.isArray(o.raw.items)) {
        return o.raw.items.reduce((s, it) => {
          const qty = Number(it.quantity || it.qty || 1) || 1;
          const price = Number(it.price ?? it.amount ?? 0) || 0;
          return s + qty * price;
        }, 0);
      }
      return 0;
    }

    const totalRevenue = current.reduce((s, o) => s + orderTotal(o), 0);

    const pendingCount = current.filter((o) => {
      const st = (o.status || "").toString().toLowerCase();
      return !st || /pending|awaiting|new|unpaid/i.test(st);
    }).length;

    const completedShipments = current.filter((o) => {
      const st = (o.status || "").toString().toLowerCase();
      return /shipped|completed|fulfilled|delivered/i.test(st);
    }).length;

    // count designs uploaded: number of files in uploads folder + unique previewPaths from orders
    let uploadsCount = 0;
    try {
      uploadsCount = fs.existsSync(UPLOAD_DIR)
        ? fs.readdirSync(UPLOAD_DIR).filter((f) => /\.(png|jpe?g|svg|gif|psd|ai)$/i.test(f)).length
        : 0;
    } catch (err) {
      uploadsCount = 0;
    }
    const uniquePreviews = new Set();
    current.forEach((o) => {
      if (Array.isArray(o.previewPaths)) {
        o.previewPaths.forEach((p) => uniquePreviews.add(p));
      }
    });
    const designsUploaded = uploadsCount + uniquePreviews.size;

    // revenue series for the last 14 days (label, revenue)
    const days = 14;
    const today = new Date();
    const revenueSeries = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      // normalize to yyyy-mm-dd
      const key = d.toISOString().slice(0, 10);
      revenueSeries.push({ label: key, revenue: 0 });
    }
    const idxByKey = revenueSeries.reduce((m, item, idx) => {
      m[item.label] = idx;
      return m;
    }, {});
    current.forEach((o) => {
      const created = new Date(o.createdAt || o.created || Date.now());
      if (isNaN(created.getTime())) return;
      const key = created.toISOString().slice(0, 10);
      if (key in idxByKey) {
        revenueSeries[idxByKey[key]].revenue += orderTotal(o);
      }
    });

    // recent orders (first N)
    const recentOrders = current.slice(0, 10).map((o) => {
      const total = orderTotal(o);
      const customer = o.raw?.customerEmail || o.raw?.customer || o.raw?.customerName || "";
      return {
        id: o.id,
        createdAt: o.createdAt,
        customer,
        items: Array.isArray(o.items)
          ? o.items
          : o.raw && Array.isArray(o.raw.items)
            ? o.raw.items
            : [],
        status: o.status || null,
        total,
        previewPaths: Array.isArray(o.previewPaths)
          ? o.previewPaths.map((p) =>
              typeof p === "string" && p.startsWith("http") ? p : origin + p,
            )
          : [],
      };
    });

    res.json({
      ok: true,
      stats: { totalRevenue, pendingCount, designsUploaded, completedShipments },
      recentOrders,
      revenueSeries,
    });
  } catch (err) {
    console.error("admin dashboard error", err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// Admin orders endpoint: return persisted orders.json (protected with JWT)
app.get("/api/admin/orders", verifyJwt, (req, res) => {
  try {
    const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
    const current = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8") || "[]");
    // pagination support
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const per_page = Math.max(1, Math.min(100, parseInt(req.query.per_page) || 10));
    const total = current.length;
    const start = (page - 1) * per_page;
    const pageItems = current.slice(start, start + per_page).map((o) => ({ ...o }));

    // Ensure previewPaths and composite_saved are absolute
    pageItems.forEach((o) => {
      if (Array.isArray(o.previewPaths)) {
        o.previewPaths = o.previewPaths.map((p) =>
          typeof p === "string" && p.startsWith("http") ? p : origin + p,
        );
      }
      if (o.raw && Array.isArray(o.raw.items)) {
        o.raw.items.forEach((it) => {
          if (
            it.customization &&
            it.customization.composite_saved &&
            !it.customization.composite_saved.startsWith("http")
          ) {
            it.customization.composite_saved = origin + it.customization.composite_saved;
          }
        });
      }
    });

    res.json({ ok: true, orders: pageItems, total, page, per_page });
  } catch (err) {
    console.error("admin orders read error", err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get("/api/admin/orders/:id", verifyJwt, (req, res) => {
  try {
    const id = req.params.id;
    const origin = req.get("origin") || `${req.protocol}://${req.get("host")}`;
    const current = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8") || "[]");
    const order = current.find((o) => o.id === id);
    if (!order) return res.status(404).json({ ok: false, error: "Order not found" });
    // normalize
    if (Array.isArray(order.previewPaths)) {
      order.previewPaths = order.previewPaths.map((p) =>
        typeof p === "string" && p.startsWith("http") ? p : origin + p,
      );
    }
    if (order.raw && Array.isArray(order.raw.items)) {
      order.raw.items.forEach((it) => {
        if (
          it.customization &&
          it.customization.composite_saved &&
          !it.customization.composite_saved.startsWith("http")
        ) {
          it.customization.composite_saved = origin + it.customization.composite_saved;
        }
      });
    }
    res.json({ ok: true, order });
  } catch (err) {
    console.error("admin order read error", err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/admin/orders/:id/approve", verifyJwt, (req, res) => {
  try {
    const id = req.params.id;
    const current = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8") || "[]");
    const idx = current.findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: "Order not found" });
    current[idx].status = req.body.status || "In Production";
    current[idx].approvedAt = new Date().toISOString();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(current, null, 2));
    res.json({ ok: true, order: current[idx] });
  } catch (err) {
    console.error("admin order approve error", err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Dev payment server listening on http://localhost:${port}`);
});
