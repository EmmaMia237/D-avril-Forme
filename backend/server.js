require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDb } = require('./db');
const { signToken, verifyToken, hashPassword, comparePassword } = require('./auth');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Offer = require('./models/Offer');
const Category = require('./models/Category');

const app = express();
const mongoose = require('mongoose');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Simple SSE (Server-Sent Events) support for product updates
const sseClients = new Set();
function sendSseEvent(event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  for (const res of sseClients) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      // ignore write errors; cleanup happens on 'close'
    }
  }
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'none',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 7,
  path: '/',
};

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests from the configured FRONTEND_URL and any localhost dev ports
      if (!origin) return callback(null, true);
      if (origin === FRONTEND_URL) return callback(null, true);
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
// Increase request body size limits to allow data-URL image uploads in dev (not recommended for production)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Cloudinary + multer setup for server-side image uploads (memory storage to avoid writing into project files)
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMemory = multer({ storage: multer.memoryStorage() });

app.post('/api/admin/upload', uploadMemory.array('files', 10), async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ ok: false, error: 'No files uploaded' });

    const uploaded = [];
    for (const f of files) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'avril-forme' }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
        stream.end(f.buffer);
      });
      uploaded.push({
        url: (uploadResult && (uploadResult.secure_url || uploadResult.url)) || null,
        public_id: uploadResult && uploadResult.public_id,
        original_filename: uploadResult && uploadResult.original_filename,
      });
    }

    return res.json({ ok: true, files: uploaded });
  } catch (err) {
    console.error('Upload error', err);
    return res.status(500).json({ ok: false, error: 'Upload failed' });
  }
});

function getToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const sessionToken = req.cookies?.session;
  return sessionToken || null;
}

function createSessionCookie(res, token) {
  res.cookie('session', token, COOKIE_OPTIONS);
}

async function getAdminFromToken(req) {
  const token = getToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.role === 'admin' ? decoded : null;
}

async function getUserFromToken(req) {
  const token = getToken(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'user') return null;
  const user = await User.findById(String(decoded.sub)).lean();
  return user ? { user, tokenPayload: decoded } : null;
}

app.get('/api/db/status', async (req, res) => {
  try {
    await connectDb();
    res.json({ ok: true, connected: true });
  } catch (err) {
    console.warn(err);
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

app.get('/api/events', (req, res) => {
  // SSE endpoint for real-time product updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Allow CORS for dev frontend origins
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.write(': connected\n\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, address } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing registration fields' });
    }
    await connectDb();
    const existing = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Email already registered' });
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      address: address ? String(address).trim() : null,
      role: 'user',
    });
    const token = signToken({ sub: String(user._id), role: 'user' });
    createSessionCookie(res, token);
    return res.status(201).json({ ok: true, token, user: { id: String(user._id), email: user.email, name: user.name, address: user.address, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing credentials' });
    }
    await connectDb();
    const user = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    const valid = await comparePassword(password, user.passwordHash || '');
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    const token = signToken({ sub: String(user._id), role: user.role || 'user' });
    createSessionCookie(res, token);
    return res.json({ ok: true, token, user: { id: String(user._id), email: user.email, name: user.name, address: user.address, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing credentials' });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass = (process.env.ADMIN_PASS || '').trim();
    if (adminEmail && adminPass && String(email).toLowerCase() === adminEmail && password === adminPass) {
      const token = signToken({ sub: adminEmail, role: 'admin' });
      createSessionCookie(res, token);
      return res.json({ ok: true, token, admin: true, email: adminEmail });
    }

    await connectDb();
    const admin = await User.findOne({ email: String(email).toLowerCase(), role: 'admin' }).lean();
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'Invalid admin credentials' });
    }
    const valid = await comparePassword(password, admin.passwordHash || '');
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Invalid admin credentials' });
    }
    const token = signToken({ sub: String(admin._id), role: 'admin' });
    createSessionCookie(res, token);
    return res.json({ ok: true, token, admin: true, email: admin.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Admin login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session', COOKIE_OPTIONS);
  return res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (admin) {
      return res.json({ ok: true, authenticated: true, admin: true, email: admin.sub, payload: admin });
    }

    const auth = await getUserFromToken(req);
    if (!auth) {
      return res.json({ ok: false, authenticated: false });
    }

    const { user } = auth;
    return res.json({ ok: true, authenticated: true, user: { id: String(user._id), email: user.email, name: user.name, address: user.address, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, authenticated: false, error: 'Unable to verify session' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    await connectDb();
    const q = {};
    // Allow filtering by theme slug: ?theme=kids
    if (req.query && req.query.theme) {
      q.theme = String(req.query.theme);
    }
    // Allow simple category filtering via ?category=Apparel
    if (req.query && req.query.category) {
      q.category = String(req.query.category);
    }
    // Allow filtering for customizable (blank) products via ?customizable=1 or ?productType=blank
    if (req.query && (String(req.query.customizable) === '1' || String(req.query.customizable).toLowerCase() === 'true')) {
      q.is_customizable = true;
    }
    if (req.query && req.query.productType) {
      q.productType = String(req.query.productType);
    }
    // Support a limit query param to avoid returning huge collections at once
    const requestedLimit = parseInt(String(req.query.limit || ''), 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(1000, requestedLimit) : 200;

        // If caller requests a lightweight summary (no images), return minimal fields quickly
        const summary = req.query && (String(req.query.summary) === '1' || String(req.query.summary).toLowerCase() === 'true');
        if (summary) {
          const products = await Product.find(q).select('name sku price stock status theme createdAt').limit(limit).sort({ createdAt: -1 }).lean();
          return res.json({ ok: true, products, truncated: products.length >= limit });
        }

        let products = await Product.find(q).select('name sku price images stock status theme createdAt previewPaths').limit(limit).sort({ createdAt: -1 }).lean();
        // Strip large data URLs from image previews to keep list responses small
        products = products.map(p => {
          if (Array.isArray(p.images)) {
            p.images = p.images.map(im => ({ url: (im && im.url && String(im.url).startsWith('data:')) ? '' : (im && im.url) || '', role: im && im.role }));
          }
          if (Array.isArray(p.previewPaths)) {
            p.previewPaths = p.previewPaths.map(pp => (String(pp).startsWith('data:') ? '' : pp));
          }
          return p;
        });
        return res.json({ ok: true, products, truncated: products.length >= limit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unable to load products' });
  }
});

app.post('/api/offers/validate', async (req, res) => {
  try {
    const { code, items } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ ok: false, error: 'Missing cart items' });
    await connectDb();
    const now = new Date();
    const offer = await Offer.findOne({ code: String(code).trim() }).lean();
    if (!offer) return res.status(400).json({ ok: false, error: 'Invalid promo code' });
    if (!offer.isActive) return res.status(400).json({ ok: false, error: 'This offer is not active' });
    if (offer.startAt && new Date(offer.startAt) > now) return res.status(400).json({ ok: false, error: 'This offer is not yet active' });
    if (offer.endAt && new Date(offer.endAt) <= now) return res.status(400).json({ ok: false, error: 'This offer has expired' });
    const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);

    // Determine applicable discountPercent using tiers when available
    let discountPercent = Number(offer.discountPercent || 0);
    if (Array.isArray(offer.tiers) && offer.tiers.length > 0) {
      // find tiers with minQty <= totalQty and pick the one with the greatest minQty (best applicable tier)
      const applicable = offer.tiers.filter(t => Number(t.minQty || 0) <= totalQty);
      if (applicable.length > 0) {
        applicable.sort((a, b) => Number(b.minQty || 0) - Number(a.minQty || 0));
        discountPercent = Number(applicable[0].discountPercent || 0);
      }
    }

    if ((Number(offer.minimumQty || 0) > 0) && totalQty < Number(offer.minimumQty || 0)) {
      return res.status(400).json({ ok: false, error: `This code requires a minimum of ${offer.minimumQty} items in the cart` });
    }
    const subtotal = items.reduce((sum, it) => sum + Number(it.amount || 0) * Number(it.quantity || 0), 0);
    const amountOff = discountPercent ? Number((subtotal * (discountPercent / 100)).toFixed(2)) : 0;
    const newTotal = Math.max(0, Number((subtotal - amountOff).toFixed(2)));
    return res.json({ ok: true, offer: { id: String(offer._id), code: offer.code, discountPercent: discountPercent, minimumQty: Number(offer.minimumQty || 0) }, amountOff, subtotal, newTotal });
  } catch (err) {
    console.error('Validate offer error', err);
    return res.status(500).json({ ok: false, error: 'Failed to validate offer' });
  }
});

app.get('/api/offers', async (req, res) => {
  try {
    await connectDb();
    const now = new Date();
    // Only return offers that are active and within the optional time window
    const offers = await Offer.find({
      isActive: true,
      $and: [
        { $or: [ { startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } } ] },
        { $or: [ { endAt: { $exists: false } }, { endAt: null }, { endAt: { $gt: now } } ] },
      ],
    }).sort({ createdAt: -1 }).lean();
    return res.json({
      ok: true,
      offers: offers.map((offer) => ({
        id: String(offer._id),
        name: offer.name,
        type: offer.type,
        code: offer.code,
        title: offer.title || offer.name,
        description: offer.description || '',
        discountPercent: Number(offer.discountPercent || 0),
        discountValue: Number(offer.discountValue || 0),
        minimumQty: Number(offer.minimumQty || 0),
        maxItems: Number(offer.maxItems || 0),
        tiers: Array.isArray(offer.tiers) ? offer.tiers.map(t => ({ minQty: Number(t.minQty || 0), discountPercent: Number(t.discountPercent || 0) })) : [],
        isActive: offer.isActive,
        startAt: offer.startAt || null,
        endAt: offer.endAt || null,
      })),
    });
  } catch (err) {
    console.error('Load offers error', err);
    return res.status(500).json({ ok: false, error: 'Unable to load offers' });
  }
});

app.get('/api/admin/offers', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const offers = await Offer.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, offers: offers.map((offer) => ({
      id: String(offer._id),
      name: offer.name,
      type: offer.type,
      code: offer.code,
      title: offer.title || offer.name,
      description: offer.description || '',
      discountPercent: Number(offer.discountPercent || 0),
      discountValue: Number(offer.discountValue || 0),
      minimumQty: Number(offer.minimumQty || 0),
      maxItems: Number(offer.maxItems || 0),
      tiers: Array.isArray(offer.tiers) ? offer.tiers.map(t => ({ minQty: Number(t.minQty || 0), discountPercent: Number(t.discountPercent || 0) })) : [],
      isActive: !!offer.isActive,
      startAt: offer.startAt || null,
      endAt: offer.endAt || null,
    })) });
  } catch (err) {
    console.error('Load admin offers error', err);
    return res.status(500).json({ ok: false, error: 'Unable to load offers' });
  }
});

app.post('/api/admin/offers', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const offerInput = req.body || {};
    const parseDate = (v) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    };
    const offer = await Offer.create({
      name: String(offerInput.name || offerInput.title || 'Offer').trim(),
      type: String(offerInput.type || 'coupon').trim(),
      code: String(offerInput.code || '').trim(),
      title: String(offerInput.title || offerInput.name || 'Offer').trim(),
      description: String(offerInput.description || '').trim(),
      discountPercent: Number(offerInput.discountPercent || 0),
      discountValue: Number(offerInput.discountValue || 0),
      minimumQty: Number(offerInput.minimumQty || 0),
      maxItems: Number(offerInput.maxItems || 0),
      isActive: offerInput.isActive !== false,
      startAt: parseDate(offerInput.startAt),
      endAt: parseDate(offerInput.endAt),
      createdBy: 'admin',
    });
    return res.status(201).json({ ok: true, offer });
  } catch (err) {
    console.error('Create offer error', err);
    return res.status(500).json({ ok: false, error: 'Failed to save offer' });
  }
});

app.put('/api/admin/offers/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const updates = { ...req.body };
    const parseDate = (v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    };
    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.title) updates.title = String(updates.title).trim();
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.code !== undefined) updates.code = String(updates.code).trim();
    if (updates.discountPercent !== undefined) updates.discountPercent = Number(updates.discountPercent || 0);
    if (updates.discountValue !== undefined) updates.discountValue = Number(updates.discountValue || 0);
    if (updates.minimumQty !== undefined) updates.minimumQty = Number(updates.minimumQty || 0);
    if (updates.maxItems !== undefined) updates.maxItems = Number(updates.maxItems || 0);
    if (updates.type) updates.type = String(updates.type).trim();
    if (updates.isActive !== undefined) updates.isActive = !!updates.isActive;
    const s = parseDate(updates.startAt);
    const e = parseDate(updates.endAt);
    if (s !== undefined) updates.startAt = s;
    if (e !== undefined) updates.endAt = e;
    const offer = await Offer.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!offer) return res.status(404).json({ ok: false, error: 'Offer not found' });
    return res.json({ ok: true, offer });
  } catch (err) {
    console.error('Update offer error', err);
    return res.status(500).json({ ok: false, error: 'Failed to update offer' });
  }
});

app.delete('/api/admin/offers/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ ok: false, error: 'Offer not found' });
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('Delete offer error', err);
    return res.status(500).json({ ok: false, error: 'Failed to delete offer' });
  }
});

app.put('/api/admin/account', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const target = await User.findOne({
      role: 'admin',
      $or: [{ _id: admin.sub }, { email: String(admin.sub || '').toLowerCase() }],
    }).lean();
    const nextEmail = String(req.body?.email || target?.email || '').trim().toLowerCase();
    const nextPassword = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (!nextEmail) return res.status(400).json({ ok: false, error: 'Email is required' });
    if (nextPassword && nextPassword.length < 6) return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ email: nextEmail, _id: { $ne: target?._id || null } }).lean();
    if (existing) return res.status(409).json({ ok: false, error: 'Email already in use' });
    const updates = { email: nextEmail };
    if (nextPassword) {
      updates.passwordHash = await hashPassword(nextPassword);
      process.env.ADMIN_PASS = nextPassword;
    }
    const user = await User.findByIdAndUpdate((target && target._id) ? target._id : admin.sub, updates, { new: true });
    process.env.ADMIN_EMAIL = nextEmail;
    return res.json({ ok: true, admin: { email: user.email } });
  } catch (err) {
    console.error('Update admin account error', err);
    return res.status(500).json({ ok: false, error: 'Unable to update account' });
  }
});

// Get single product by id
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ ok: false, error: 'Missing product id' });
    await connectDb();

    // If id is a valid ObjectId, try findById. Otherwise allow lookup by SKU.
    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).lean();
    }
    if (!product) {
      // attempt to find by sku or fallback to _id string match
      product = await Product.findOne({ $or: [{ sku: id }, { _id: id }] }).lean();
    }

    if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
    return res.json({ ok: true, product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unable to load product' });
  }
});

// Categories - public: only published categories
app.get('/api/categories', async (req, res) => {
  try {
    await connectDb();
    const categories = await Category.find({ isPublished: true }).sort({ name: 1 }).lean();
    return res.json({ ok: true, categories: categories.map(c => ({ id: c._id, slug: c.slug, name: c.name, description: c.description, imageUrl: c.imageUrl, items: c.items })) });
  } catch (err) {
    console.error('Load categories error', err);
    return res.status(500).json({ ok: false, error: 'Unable to load categories' });
  }
});

// Admin: list all categories
app.get('/api/admin/categories', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const categories = await Category.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, categories });
  } catch (err) {
    console.error('Admin load categories error', err);
    return res.status(500).json({ ok: false, error: 'Unable to load categories' });
  }
});

// Admin: create category
app.post('/api/admin/categories', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const input = req.body || {};
    if (!input.slug || !input.name) return res.status(400).json({ ok: false, error: 'Missing slug or name' });
    const existing = await Category.findOne({ slug: String(input.slug).trim() }).lean();
    if (existing) return res.status(409).json({ ok: false, error: 'Category slug already exists' });
    const cat = await Category.create({
      slug: String(input.slug).trim(),
      name: String(input.name).trim(),
      description: String(input.description || '').trim(),
      imageUrl: String(input.imageUrl || '').trim(),
      isPublished: !!input.isPublished,
      items: Number(input.items || 0),
      createdBy: admin.sub || 'admin',
    });

    // Broadcast SSE event to connected clients so storefront can update in realtime
    try {
      sendSseEvent('category-created', { id: String(cat._id), slug: cat.slug, name: cat.name, description: cat.description, imageUrl: cat.imageUrl, items: cat.items, isPublished: cat.isPublished });
    } catch (e) {
      // no-op if SSE fails
    }

    return res.status(201).json({ ok: true, category: cat });
  } catch (err) {
    console.error('Create category error', err);
    return res.status(500).json({ ok: false, error: 'Failed to create category' });
  }
});

// Admin: update category
app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const updates = { ...req.body };
    if (updates.slug) updates.slug = String(updates.slug).trim();
    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.description !== undefined) updates.description = String(updates.description).trim();
    if (updates.imageUrl !== undefined) updates.imageUrl = String(updates.imageUrl).trim();
    if (updates.isPublished !== undefined) updates.isPublished = !!updates.isPublished;
    if (updates.items !== undefined) updates.items = Number(updates.items || 0);
    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cat) return res.status(404).json({ ok: false, error: 'Category not found' });

    try {
      sendSseEvent('category-updated', { id: String(cat._id), slug: cat.slug, name: cat.name, description: cat.description, imageUrl: cat.imageUrl, items: cat.items, isPublished: cat.isPublished });
    } catch (e) {}

    return res.json({ ok: true, category: cat });
  } catch (err) {
    console.error('Update category error', err);
    return res.status(500).json({ ok: false, error: 'Failed to update category' });
  }
});

// Admin: delete category
app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ ok: false, error: 'Category not found' });

    try {
      sendSseEvent('category-deleted', { id: String(cat._id) });
    } catch (e) {}

    return res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('Delete category error', err);
    return res.status(500).json({ ok: false, error: 'Failed to delete category' });
  }
});

// Admin: seed default categories (safe idempotent action)
app.post('/api/admin/seed-categories', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const defaults = [
      { slug: 'apparel', name: 'Apparel', description: 'Tees, hoodies & polos', imageUrl: '', isPublished: true, items: 0 },
      { slug: 'drinkware', name: 'Drinkware', description: 'Mugs & bottles', imageUrl: '', isPublished: true, items: 0 },
      { slug: 'phone-cases', name: 'Phone Cases', description: 'Matte & glossy shells', imageUrl: '', isPublished: true, items: 0 },
      { slug: 'stationery', name: 'Stationery', description: 'Notebooks & cards', imageUrl: '', isPublished: true, items: 0 },
      { slug: 'corporate', name: 'Corporate Merch', description: 'Branded team kits', imageUrl: '', isPublished: true, items: 0 },
    ];
    for (const d of defaults) {
      const exists = await Category.findOne({ slug: d.slug }).lean();
      if (!exists) {
        const created = await Category.create({ ...d, createdBy: admin.sub || 'admin' });
        try {
          sendSseEvent('category-created', { id: String(created._id), slug: created.slug, name: created.name, description: created.description, imageUrl: created.imageUrl, items: created.items, isPublished: created.isPublished });
        } catch (e) {}
      }
    }
    const categories = await Category.find({}).lean();
    return res.json({ ok: true, categories });
  } catch (err) {
    console.error('Seed categories error', err);
    return res.status(500).json({ ok: false, error: 'Failed to seed categories' });
  }
});

function compactStripeString(value, maxLength = 450) {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
}

function summarizeCustomization(customization) {
  if (!customization || typeof customization !== 'object') return undefined;
  const summary = {};
  const keys = ['text', 'fontFamily', 'fontSize', 'fontColor', 'color', 'size', 'productType', 'variant', 'placement', 'material', 'quantity'];
  for (const key of keys) {
    if (customization[key] !== undefined) {
      summary[key] = customization[key];
    }
  }
  if (!Object.keys(summary).length) return { custom: 'configured' };
  return summary;
}

function summarizeCustomizationText(customization) {
  if (!customization || typeof customization !== 'object') return 'Custom order';
  const parts = [];
  const text = typeof customization.text === 'string' ? customization.text.trim() : '';
  const color = customization.color || customization.fontColor;
  const size = customization.size || customization.variant || customization.productType;
  const style = customization.fontFamily || customization.material;
  if (text) parts.push(`text: ${text.slice(0, 32)}`);
  if (color) parts.push(`color: ${color}`);
  if (size) parts.push(`size: ${size}`);
  if (style) parts.push(`style: ${style}`);
  if (!parts.length) parts.push('custom print order');
  return parts.join(' • ');
}

app.post('/api/payment/create-checkout', async (req, res) => {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) return res.status(500).json({ ok: false, error: 'Stripe is not configured' });
    const Stripe = require('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });

    const { items, success_url, cancel_url, promoCode } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'No items provided' });
    }
    if (!success_url || !cancel_url) {
      return res.status(400).json({ ok: false, error: 'Missing redirect URLs' });
    }

    // Server-side promo validation and application (prevents client-side cheats)
    let appliedOffer = null;
    let discountPercent = 0;
    if (promoCode) {
      try {
        await connectDb();
        const now = new Date();
        appliedOffer = await Offer.findOne({ code: String(promoCode).trim() }).lean();
        if (!appliedOffer) return res.status(400).json({ ok: false, error: 'Invalid promo code' });
        // check active and time window
        if (!appliedOffer.isActive) return res.status(400).json({ ok: false, error: 'This offer is not active' });
        if (appliedOffer.startAt && new Date(appliedOffer.startAt) > now) return res.status(400).json({ ok: false, error: 'This offer is not yet active' });
        if (appliedOffer.endAt && new Date(appliedOffer.endAt) <= now) return res.status(400).json({ ok: false, error: 'This offer has expired' });
        // check quantity thresholds
        const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);

            // pick tier if available
            let chosenPercent = Number(appliedOffer.discountPercent || 0);
            if (Array.isArray(appliedOffer.tiers) && appliedOffer.tiers.length > 0) {
              const applicable = appliedOffer.tiers.filter(t => Number(t.minQty || 0) <= totalQty);
              if (applicable.length > 0) {
                applicable.sort((a,b) => Number(b.minQty || 0) - Number(a.minQty || 0));
                chosenPercent = Number(applicable[0].discountPercent || 0);
              }
            }

            if ((Number(appliedOffer.minimumQty || 0) > 0) && totalQty < Number(appliedOffer.minimumQty || 0)) {
              return res.status(400).json({ ok: false, error: `This code requires a minimum of ${appliedOffer.minimumQty} items in the cart` });
            }
            discountPercent = chosenPercent;
          } catch (err) {
            console.error('Promo validation error', err);
            return res.status(500).json({ ok: false, error: 'Promo validation failed' });
          }
        }

        // Build line items so that the final charged total equals subtotal - amountOff exactly in cents.
        // Approach: compute subtotal in cents, compute amountOffCents, compute targetTotalCents, then
        // distribute the target total proportionally across lines and split units when necessary to
        // avoid fractional cents while preserving per-item detail.
        const cents = (n) => Math.round(Number(n || 0) * 100);
        const subtotalCents = items.reduce((s, it) => s + cents(it.amount) * Math.max(1, Number(it.quantity || 1)), 0);
        const amountOffCents = discountPercent ? Math.round(subtotalCents * (discountPercent / 100)) : 0;
        const targetTotalCents = Math.max(0, subtotalCents - amountOffCents);
        // final line_items array to send to Stripe
        let line_items = [];

        // Early fallback: if no discount, build simple line items
        if (!discountPercent) {
          const simple = items.map((it) => {
            const unitAmount = cents(it.amount);
            const compactCustomization = summarizeCustomization(it.customization);
            const description = compactStripeString(summarizeCustomizationText(compactCustomization), 220);
            const metadata = compactCustomization ? { custom: compactStripeString(summarizeCustomizationText(compactCustomization), 450) } : undefined;
            return {
              price_data: {
                currency: it.currency || 'eur',
                product_data: {
                  name: it.name || 'Item',
                  description,
                  metadata,
                },
                unit_amount: Math.max(50, unitAmount),
              },
              quantity: Math.max(1, Number(it.quantity || 1)),
            };
          });
          line_items = simple; // eslint-disable-line no-var
        } else {
          // Proportional distribution
          const rawLineTotals = items.map((it) => ({
            item: it,
            qty: Math.max(1, Number(it.quantity || 1)),
            unitCents: cents(it.amount),
            rawTotalCents: cents(it.amount) * Math.max(1, Number(it.quantity || 1)),
          }));

          // Compute provisional final totals per line by proportional scaling then round down
          let provisionalTotals = rawLineTotals.map((r) => Math.floor(r.rawTotalCents * (targetTotalCents / Math.max(1, subtotalCents))));
          let provisionalSum = provisionalTotals.reduce((s, v) => s + v, 0);

          // Distribute any missing cents due to rounding
          let remainder = targetTotalCents - provisionalSum;
          for (let i = 0; remainder > 0 && i < provisionalTotals.length; i++) {
            provisionalTotals[i] += 1;
            remainder -= 1;
          }
          // If overshot (shouldn't happen with floor), correct by subtracting from first lines
          for (let i = 0; remainder < 0 && i < provisionalTotals.length; i++) {
            if (provisionalTotals[i] > 0) {
              provisionalTotals[i] -= 1;
              remainder += 1;
            }
          }

          // Now build Stripe line items, splitting unit quantities when needed so that unit_amount * quantity == finalLineTotal
          const built = [];
          for (let idx = 0; idx < rawLineTotals.length; idx++) {
            const r = rawLineTotals[idx];
            let finalLineCents = provisionalTotals[idx];
            // Ensure non-negative
            finalLineCents = Math.max(0, finalLineCents);

            // Derive base per-unit amount and remainder units
            const unitLow = Math.floor(finalLineCents / r.qty);
            let highUnitCount = finalLineCents - unitLow * r.qty; // number of units that need +1 cent

            // Apply minimum unit amount (50 cents) by adjusting if necessary
            if (unitLow === 0 && highUnitCount === 0) {
              // Nothing to charge for this line; skip it
              continue;
            }

            // If unitLow < 50, we need to raise some units to 50 and reduce others accordingly to preserve total
            if (unitLow < 50) {
              // attempt to set as many units to 50 as possible while keeping total
              const needed = r.qty * 50;
              if (needed <= finalLineCents) {
                // set all units to at least 50
                // distribute remainder after setting min
                const extra = finalLineCents - needed;
                const perUnitExtra = Math.floor(extra / r.qty);
                const extraRemainder = extra - perUnitExtra * r.qty;
                const baseUnit = 50 + perUnitExtra;
                // create line items with baseUnit and some with +1 for remainder
                if (r.qty - extraRemainder > 0) built.push({ unit: baseUnit, qty: r.qty - extraRemainder });
                if (extraRemainder > 0) built.push({ unit: baseUnit + 1, qty: extraRemainder });
              } else {
                // Can't satisfy minimum unit price with available cents; fallback to assign one unit at min and leave remainder 0
                built.push({ unit: 50, qty: Math.min(1, r.qty) });
                // remaining units zero-priced; skip
              }
            } else {
              // Normal case: unitLow >= 50
              if (highUnitCount > 0) {
                // highUnitCount units at unitLow + 1, rest at unitLow
                if (r.qty - highUnitCount > 0) built.push({ unit: unitLow, qty: r.qty - highUnitCount });
                built.push({ unit: unitLow + 1, qty: highUnitCount });
              } else {
                built.push({ unit: unitLow, qty: r.qty });
              }
            }

            // Convert built entries into Stripe line_items entries
            const compactCustomization = summarizeCustomization(r.item.customization);
            const description = compactStripeString(summarizeCustomizationText(compactCustomization), 220);
            const metadata = compactCustomization ? { custom: compactStripeString(summarizeCustomizationText(compactCustomization), 450) } : undefined;

            for (const b of built) {
              // skip if qty is zero
              if (!b.qty || b.qty <= 0) continue;
              // ensure unit amount not below 50
              const ua = Math.max(50, Math.round(b.unit));
              // push stripe line item
              // Note: multiple entries for the same product may exist if splitting was required
              const entry = {
                price_data: {
                  currency: r.item.currency || 'eur',
                  product_data: {
                    name: r.item.name || 'Item',
                    description,
                    metadata,
                  },
                  unit_amount: ua,
                },
                quantity: b.qty,
              };
              // push to final array
              line_items = (line_items || []).concat(entry); // eslint-disable-line no-var
            }
          }

          // If for some reason line_items is still undefined (defensive), set to empty array
          if (!line_items) line_items = [];
        }

    const trackingNumber = `AF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const sessionPayload = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url,
      cancel_url,
      metadata: { trackingNumber },
    };
    if (appliedOffer) sessionPayload.metadata.appliedOfferId = String(appliedOffer._id);

    const session = await stripe.checkout.sessions.create(sessionPayload);

    try {
      await connectDb();
      const auth = await getUserFromToken(req);
      const subtotal = items.reduce((sum, it) => sum + Number(it.amount || 0) * Number(it.quantity || 1), 0);
      const amountOff = discountPercent ? Number((subtotal * (discountPercent / 100)).toFixed(2)) : 0;
      await Order.create({
        sessionId: session.id,
        trackingNumber,
        userId: auth?.user?._id || null,
        userEmail: auth?.user?.email || null,
        userName: auth?.user?.name || null,
        paymentMethod: 'Stripe',
        items,
        total: Math.max(0, subtotal - amountOff),
        status: 'Payment Pending',
      });
    } catch (err) {
      console.warn('Failed to create order record:', err);
    }

    return res.json({ ok: true, url: session.url, id: session.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to create checkout session' });
  }
});

app.get('/api/orders/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ ok: false, error: 'Missing session id' });
    await connectDb();
    const order = await Order.findOne({ sessionId }).lean();
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    return res.json({ ok: true, order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to load order' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
    return res.json({
      ok: true,
      orders: orders.map((order) => ({
        id: String(order._id),
        sessionId: order.sessionId,
        trackingNumber: order.trackingNumber,
        customer: order.userName || order.userEmail || 'Guest',
        email: order.userEmail || null,
        items: Array.isArray(order.items)
          ? order.items
              .map((item) => (item?.name ? String(item.name) : item?.title ? String(item.title) : 'Item'))
              .join(', ')
          : String(order.items || ''),
        status: order.status || 'Payment Pending',
        payment: order.status?.toLowerCase().includes('paid') ? `Paid (${order.paymentMethod || 'Stripe'})` : `Pending (${order.paymentMethod || 'Stripe'})`,
        total: order.total || 0,
        createdAt: order.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unable to load admin orders' });
  }
});

app.put('/api/admin/orders/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const updated = await Order.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true }).lean();
    if (!updated) return res.status(404).json({ ok: false, error: 'Order not found' });
    return res.json({ ok: true, order: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unable to update order' });
  }
});

app.get('/api/admin/customers', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const customers = await Order.aggregate([
      {
        $group: {
          _id: {
            email: '$userEmail',
            name: '$userName',
          },
          orders: { $sum: 1 },
          spend: { $sum: '$total' },
          firstOrder: { $min: '$createdAt' },
        },
      },
      { $match: { '_id.email': { $ne: null } } },
      { $sort: { spend: -1 } },
    ]);

    return res.json({
      ok: true,
      customers: customers.map((entry) => ({
        name: entry._id.name || entry._id.email,
        email: entry._id.email,
        orders: entry.orders,
        spend: entry.spend,
        since: entry.firstOrder ? new Date(entry.firstOrder).getFullYear().toString() : 'Unknown',
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unable to load customers' });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const [orders, products] = await Promise.all([Order.find({}).lean(), Product.find({}).lean()]);

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const pending = orders.filter((order) => /pending|awaiting|payment/i.test(order.status || '')).length;
    const readyToPrint = orders.filter((order) => /ready to print/i.test(order.status || '')).length;
    const completedShipments = orders.filter((order) => /shipped/i.test(order.status || '')).length;
    const designsUploaded = products.length;

    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((order) => ({
        id: String(order._id),
        customer: order.userName || order.userEmail || 'Guest',
        items: Array.isArray(order.items)
          ? order.items.map((item) => (item?.name ? String(item.name) : item?.title ? String(item.title) : 'Item')).join(', ')
          : String(order.items || ''),
        status: order.status || 'Payment Pending',
        total: order.total || 0,
      }));

    const revenueSeries = Array.from({ length: 6 }, (_, idx) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (5 - idx));
      const label = month.toLocaleString('default', { month: 'short' });
      const monthTotal = orders
        .filter((order) => {
          const created = new Date(order.createdAt);
          return created.getMonth() === month.getMonth() && created.getFullYear() === month.getFullYear();
        })
        .reduce((sum, order) => sum + (order.total || 0), 0);
      const monthOrders = orders.filter((order) => {
        const created = new Date(order.createdAt);
        return created.getMonth() === month.getMonth() && created.getFullYear() === month.getFullYear();
      }).length;
      return { label, revenue: monthTotal, orders: monthOrders };
    });

    return res.json({
      ok: true,
      stats: {
        totalRevenue,
        pendingCount: pending + readyToPrint,
        readyToPrint,
        completedShipments,
        designsUploaded,
      },
      recentOrders,
      revenueSeries,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Unable to load dashboard data' });
  }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const product = await Product.create({ ...req.body, colors: Array.isArray(req.body.colors) ? req.body.colors : [], createdAt: new Date(), updatedAt: new Date() });
    // Broadcast creation event
    try { sendSseEvent('product-created', { product }); } catch (e) {}
    return res.status(201).json({ ok: true, id: String(product._id), product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to create product' });
  }
});

app.put('/api/admin/products/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const updated = await Product.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date() }, { new: true });
    if (!updated) return res.status(404).json({ ok: false, error: 'Product not found' });
    try { sendSseEvent('product-updated', { product: updated }); } catch (e) {}
    return res.json({ ok: true, product: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to update product' });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: 'Product not found' });
    try { sendSseEvent('product-deleted', { id: String(deleted._id) }); } catch (e) {}
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to delete product' });
  }
});

// Admin helper: remove demo/test products in bulk
app.post('/api/admin/clean-demo-products', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    // Delete products with data URL images or names containing demo/mock/test/copy
    const regex = /demo|mock|test|smoke|copy/i;
    const candidates = await Product.find({ $or: [ { name: { $regex: regex } }, { 'images.url': { $regex: '^data:' } } ] }).lean();
    if (!candidates.length) return res.json({ ok: true, deleted: 0 });
    const ids = candidates.map((c) => c._id);
    const result = await Product.deleteMany({ _id: { $in: ids } });
    try { ids.forEach(id => sendSseEvent('product-deleted', { id: String(id) })); } catch (e) {}
    return res.json({ ok: true, deleted: result.deletedCount || ids.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to clean demo products' });
  }
});

// Admin helper: wipe entire product catalog (DANGEROUS)
app.post('/api/admin/wipe-all-products', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const result = await Product.deleteMany({});
    // broadcast deletions
    try { sendSseEvent('product-deleted', { id: 'all' }); } catch (e) {}
    return res.json({ ok: true, deleted: result.deletedCount || 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to wipe products' });
  }
});

// Admin helper: clear all orders (payments / test orders) so dashboard shows zero until real payments come in
app.post('/api/admin/clear-all-orders', async (req, res) => {
  try {
    const admin = await getAdminFromToken(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'Admin access required' });
    await connectDb();
    const result = await Order.deleteMany({});
    try { sendSseEvent('orders-cleared', { cleared: true }); } catch (e) {}
    return res.json({ ok: true, deleted: result.deletedCount || 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Failed to clear orders' });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' });
});

const port = process.env.PORT || 4000;
connectDb()
  .then(() => {
    app.listen(port, () => console.log('Backend listening on', port));
  })
  .catch((err) => {
    console.error('Database connection error', err);
    process.exit(1);
  });
