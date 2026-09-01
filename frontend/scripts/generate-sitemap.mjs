#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outputPath = path.join(publicDir, 'sitemap.xml');

const siteUrl = (process.env.SITE_URL || process.env.PUBLIC_SITE_URL || process.env.VITE_SITE_URL || 'https://osanprints.com').replace(/\/+$/, '');
const apiBase = (process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'https://d-avril-forme.onrender.com').replace(/\/+$/, '');

const staticRoutes = [
  '/',
  '/about',
  '/contact',
  '/categories',
  '/templates',
  '/offers',
  '/custom-templates',
];

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const asArray = (value) => (Array.isArray(value) ? value : []);

const isPublishedCategory = (category) => {
  if (!category || !category.slug) return false;
  if (category.isPublished === false) return false;
  return true;
};

const isPublishedProduct = (product) => {
  if (!product || (!product._id && !product.id)) return false;
  if (product.isPublished === true) return true;
  const status = String(product.status || '').toLowerCase();
  return ['published', 'live', 'active', 'available'].includes(status);
};

const buildUrlEntry = (url, lastmod) => {
  const timestamp = lastmod ? new Date(lastmod).toISOString() : new Date().toISOString();
  return [
    '  <url>',
    `    <loc>${escapeXml(url)}</loc>`,
    `    <lastmod>${escapeXml(timestamp)}</lastmod>`,
    '  </url>',
  ].join('\n');
};

const buildSitemap = (urls) => {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  const body = uniqueUrls.map((url) => buildUrlEntry(url, null)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function generate() {
  fs.mkdirSync(publicDir, { recursive: true });

  const urls = new Set(staticRoutes.map((route) => `${siteUrl}${route}`));

  try {
    const categoriesResponse = await fetchJson(`${apiBase}/api/categories`);
    for (const category of asArray(categoriesResponse?.categories).filter(isPublishedCategory)) {
      const slug = String(category.slug).trim();
      if (slug) urls.add(`${siteUrl}/categories/${encodeURIComponent(slug)}`);
    }

    const productsResponse = await fetchJson(`${apiBase}/api/products?limit=1000`);
    for (const product of asArray(productsResponse?.products).filter(isPublishedProduct)) {
      const id = String(product._id || product.id || '').trim();
      if (id) urls.add(`${siteUrl}/product/${encodeURIComponent(id)}`);
    }
  } catch (error) {
    console.warn(`Sitemap generation warning: ${error.message}`);
  }

  const sitemapXml = buildSitemap([...urls]);
  fs.writeFileSync(outputPath, sitemapXml, 'utf8');
  console.log(`Wrote ${outputPath} with ${urls.size} URLs`);
}

generate();
