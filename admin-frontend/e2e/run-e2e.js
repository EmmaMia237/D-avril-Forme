const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:5174/admin/login';
  const FRONTEND_ORDERS = path.join(__dirname, '..', '..', 'frontend', 'orders.json');
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@yourdomain.com';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';
  const TARGET_ORDER_ID = process.env.TARGET_ORDER_ID || 'AF-SRV-1786877681009';

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to admin login:', ADMIN_URL);
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded' });

    // Fill login form
    console.log('Filling credentials...');
    await page.fill('input[type="email"], input#admin-id', ADMIN_EMAIL);
    await page.fill('input[type="password"], input#admin-pass', ADMIN_PASS);

    // Click sign in button
    console.log('Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
      page.click('button:has-text("Sign in"), button:has-text("Signing in...")'),
    ]);

    console.log('Logged in (or navigated) — going to orders page');
    await page.goto('http://localhost:5174/admin/orders', { waitUntil: 'networkidle' });

    // Wait for orders table to load
    await page.waitForSelector('text=Orders & Fulfillment', { timeout: 10000 });

    // Find the row containing the target order id and click View
    const orderRow = await page.$(`text=${TARGET_ORDER_ID}`);
    if (!orderRow) {
      console.error('Order row not found for id:', TARGET_ORDER_ID);
      await page.screenshot({ path: 'e2e-order-not-found.png' });
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
