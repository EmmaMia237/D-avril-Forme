const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const os = require('os');


(async () => {
  const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:5177/admin/login';
  const FRONTEND_ORDERS = path.join(__dirname, '..', '..', 'frontend', 'orders.json');
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yourdomain.com';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
  const TARGET_ORDER_ID = process.env.TARGET_ORDER_ID || 'AF-SRV-1786877681009';

  console.log('Generating admin JWT and launching browser...');

  // Try to read project root .env to obtain JWT_SECRET if available
  let JWT_SECRET = process.env.JWT_SECRET;
  try {
    const rootEnv = path.join(__dirname, '..', '..', '.env');
    if (!JWT_SECRET && fs.existsSync(rootEnv)) {
      const envText = fs.readFileSync(rootEnv, 'utf8');
      const match = envText.match(/^JWT_SECRET=(.+)$/m);
      if (match) JWT_SECRET = match[1].trim();
    }
  } catch (err) {}
  if (!JWT_SECRET) JWT_SECRET = 'dev_jwt_secret';

  const token = jwt.sign({ sub: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: '4h' });

  // Sanity-check: call backend /api/admin/orders using the generated token to confirm server accepts it
  try {
    const rr = await fetch('http://localhost:4000/api/admin/orders?per_page=5', { headers: { Cookie: `af_token=${token}` } });
    console.log('Backend orders fetch status:', rr.status);
    const rrBody = await rr.text();
    console.log('Backend orders body (short):', rrBody.substring(0, 200));
  } catch (err) {
    console.error('Backend orders fetch failed:', String(err));
  }

  const slowMo = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : 0;
  const browser = await chromium.launch({ headless: false, ...(slowMo ? { slowMo } : {}) });
  const context = await browser.newContext();
  // Also set af_auth_token in localStorage so apiFetch sends a Bearer header (bypasses cross-origin cookie issues)
  const initScript = `window.localStorage.setItem('af_auth_token', ${JSON.stringify(token)});`;
  await context.addInitScript({ content: initScript });
  // set af_token cookie as a fallback
  await context.addCookies([
    {
      name: 'af_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'None',
      secure: false,
    },
  ]);
  const page = await context.newPage();

  // Instrument network responses for debugging
  page.on('request', (req) => {
    if (req.url().includes('/api/admin/orders')) {
      console.log('REQUEST:', req.method(), req.url());
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('/api/admin/orders')) {
      console.log('RESPONSE:', res.status(), res.url());
      try {
        const txt = await res.text();
        console.log('RESPONSE BODY (short):', txt.substring(0, 300));
      } catch (err) {
        console.warn('Failed to read response body for', res.url(), String(err));
      }
    }
  });
  // Capture console logs and page errors
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err));

  try {
    console.log('Opening admin orders page directly (authenticated)');
    await page.goto('http://localhost:5177/admin/orders', { waitUntil: 'networkidle' });

    // Wait for orders table to load
    await page.waitForSelector('text=Orders & Fulfillment', { timeout: 10000 });

    // Debug: log visible table rows
    try {
      const rowsText = await page.$$eval('table tbody tr', (rows) => rows.map((r) => r.innerText));
      console.log('Rendered table rows (count):', rowsText.length);
      rowsText.slice(0, 10).forEach((r, i) => console.log(`row[${i}]:`, r.substring(0, 200)));
    } catch (err) {
      console.warn('No table rows found or error reading rows:', String(err));
    }

    // Find the row containing the target order id and click View
    const orderRow = await page.$(`text=${TARGET_ORDER_ID}`);
    if (!orderRow) {
      console.error('Order row not found for id:', TARGET_ORDER_ID);
      const debugHtml = await page.content();
      fs.writeFileSync(path.join(__dirname, 'e2e-order-not-found.html'), debugHtml, 'utf8');
      await page.screenshot({ path: path.join(__dirname, 'e2e-order-not-found.png') }).catch(() => {});
      await browser.close();
      process.exit(2);
    }

    // Click the view button in the same row
    const viewBtn = await orderRow.evaluateHandle((node) => {
      // walk up to the row and find a button or link with text "View"
      let el = node;
      while (el && el.tagName !== 'TR') el = el.parentElement;
      if (!el) return null;
      const btn = el.querySelector('a, button');
      return btn;
    });

    if (!viewBtn) {
      console.error('View button not found in order row');
      await page.screenshot({ path: 'e2e-view-btn-not-found.png' });
      await browser.close();
      process.exit(3);
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
      viewBtn.asElement().click(),
    ]);

    console.log('On order detail page — attempting to click Approve & Start Production');
    // Click the approve button (matching text)
    const approve = await page.$('button:has-text("Approve & Start Production"), button:has-text("Approve & Start Production")');
    if (!approve) {
      console.error('Approve button not found — trying alternate selector');
      const alt = await page.$('button:has-text("Approve & Start Production"), button:has-text("In Production")');
      if (!alt) {
        console.error('No approve button found');
        await page.screenshot({ path: 'e2e-no-approve.png' });
        await browser.close();
        process.exit(4);
      }
      await alt.click();
    } else {
      await approve.click();
    }

    // Wait briefly for the update to propagate
    await page.waitForTimeout(1000);

    // Read orders.json from frontend to confirm status changed
    const ordersPath = FRONTEND_ORDERS;
    console.log('Reading orders file at', ordersPath);
    if (!fs.existsSync(ordersPath)) {
      console.error('Orders file not found at', ordersPath);
      await browser.close();
      process.exit(5);
    }
    const text = fs.readFileSync(ordersPath, 'utf8');
    const orders = JSON.parse(text);
    const found = orders.find((o) => o.id === TARGET_ORDER_ID);
    if (!found) {
      console.error('Order id not present in orders.json after approve');
      console.log('Top 3 orders:', orders.slice(0, 3).map(o => o.id));
      await page.screenshot({ path: 'e2e-order-missing-post-approve.png' });
      await browser.close();
      process.exit(6);
    }

    console.log('Order status after approve:', found.status || '<no status>');
    if (found.status && found.status.toLowerCase().includes('approved') || (found.status && found.status.toLowerCase().includes('in production'))) {
      console.log('E2E: success — status updated to', found.status);
      await page.screenshot({ path: 'e2e-success.png' });
      await browser.close();
      process.exit(0);
    } else {
      console.error('E2E: status did not update as expected:', found.status);
      await page.screenshot({ path: 'e2e-status-not-updated.png' });
      await browser.close();
      process.exit(7);
    }
  } catch (err) {
    console.error('E2E script error', err);
    await page.screenshot({ path: 'e2e-error.png' });
    await browser.close();
    process.exit(10);
  }
})();
