/**
 * Post-build audit: walks dist/ and asserts the things that silently break SEO.
 *
 * Run with `npm run audit` after a build. Exits non-zero on any failure, so it
 * can gate CI.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const SITE = 'https://blog.degitx.com';

const failures = [];
const warnings = [];

const fail = (file, msg) => failures.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const all = await walk(DIST);
const htmlFiles = all.filter((f) => f.endsWith('.html'));

// Every asset the site can link to, as a root-relative URL.
const assets = new Set(
  all.map((f) => '/' + path.relative(DIST, f).split(path.sep).join('/'))
);

const attr = (html, tag, name) => {
  const re = new RegExp(`<${tag}[^>]*\\b${name}=("|')(.*?)\\1`, 'is');
  return html.match(re)?.[2];
};

const metaContent = (html, key, value) => {
  const re = new RegExp(`<meta[^>]*\\b${key}=("|')${value}\\1[^>]*content=("|')(.*?)\\2`, 'is');
  const alt = new RegExp(`<meta[^>]*content=("|')(.*?)\\1[^>]*\\b${key}=("|')${value}\\3`, 'is');
  return html.match(re)?.[3] ?? html.match(alt)?.[2];
};

for (const file of htmlFiles) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  const html = await fs.readFile(file, 'utf8');

  const isRedirectStub = html.includes('http-equiv="refresh"');
  if (isRedirectStub) {
    if (!/<link rel="canonical"/.test(html)) fail(rel, 'redirect stub has no canonical');
    continue;
  }

  // --- Core tags -----------------------------------------------------------
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1];
  if (!title) fail(rel, 'missing <title>');
  else if (title.length > 65) warn(rel, `title is ${title.length} chars (>65 gets truncated)`);

  const isNoindex = /content=("|')noindex/i.test(html);

  const description = metaContent(html, 'name', 'description');
  if (!description) fail(rel, 'missing meta description');
  else if (!isNoindex && (description.length < 70 || description.length > 165))
    warn(rel, `meta description is ${description.length} chars (aim for 70-165)`);

  const canonical = attr(html, 'link rel="canonical"', 'href');
  if (!canonical) fail(rel, 'missing canonical link');
  else if (!canonical.startsWith(SITE)) fail(rel, `canonical is not absolute: ${canonical}`);

  if (!/<html[^>]*\blang=/i.test(html)) fail(rel, 'missing lang on <html>');

  // --- Social cards --------------------------------------------------------
  if (!isNoindex) {
    for (const [key, value] of [
      ['property', 'og:title'],
      ['property', 'og:description'],
      ['property', 'og:image'],
      ['property', 'og:url'],
      ['name', 'twitter:card'],
    ]) {
      if (!metaContent(html, key, value)) fail(rel, `missing ${value}`);
    }

    const ogImage = metaContent(html, 'property', 'og:image');
    if (ogImage) {
      const local = ogImage.replace(SITE, '');
      if (local.startsWith('/') && !assets.has(local)) fail(rel, `og:image not built: ${local}`);
    }
  }

  // --- Headings ------------------------------------------------------------
  const h1s = html.match(/<h1[\s>]/gi) ?? [];
  if (h1s.length === 0) fail(rel, 'no <h1>');
  else if (h1s.length > 1) fail(rel, `${h1s.length} <h1> elements (expected exactly 1)`);

  // --- Structured data -----------------------------------------------------
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gis)];
  if (blocks.length === 0) fail(rel, 'no JSON-LD');
  for (const [, raw] of blocks) {
    try {
      JSON.parse(raw);
    } catch (error) {
      fail(rel, `invalid JSON-LD: ${error.message}`);
    }
  }

  // --- Images --------------------------------------------------------------
  for (const [, tag] of html.matchAll(/(<img\b[^>]*>)/gi)) {
    if (!/\balt=/i.test(tag)) fail(rel, `<img> without alt: ${tag.slice(0, 90)}`);
    const src = tag.match(/\bsrc=("|')(.*?)\1/i)?.[2];
    if (src?.startsWith('/') && !assets.has(src)) fail(rel, `broken image src: ${src}`);
  }

  // --- Internal links ------------------------------------------------------
  for (const [, , href] of html.matchAll(/<a\b[^>]*\bhref=("|')(\/[^"'#?]*)\1/gi)) {
    const target = href.endsWith('/') ? `${href}index.html` : href;
    if (assets.has(target) || assets.has(`${href}/index.html`) || assets.has(href)) continue;
    fail(rel, `broken internal link: ${href}`);
  }
}

// --- Site-level files ------------------------------------------------------
for (const required of [
  '/sitemap-index.xml',
  '/robots.txt',
  '/rss.xml',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/CNAME',
  '/404.html',
]) {
  if (!assets.has(required)) fail('site', `missing ${required}`);
}

const sitemap = await fs.readFile(path.join(DIST, 'sitemap-0.xml'), 'utf8');
for (const bad of ['/general/', '/categories/', '/404']) {
  if (sitemap.includes(bad)) fail('sitemap-0.xml', `contains ${bad}`);
}

const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

// Redirect stubs (including the ones Astro emits for `redirects`) are not pages.
let expected = 0;
for (const file of htmlFiles) {
  if (file.endsWith('404.html')) continue;
  const html = await fs.readFile(file, 'utf8');
  if (!html.includes('http-equiv="refresh"')) expected += 1;
}
if (sitemapUrls.length !== expected)
  warn('sitemap-0.xml', `${sitemapUrls.length} urls for ${expected} indexable pages`);

// --- Report ----------------------------------------------------------------
console.log(`Audited ${htmlFiles.length} HTML files.\n`);

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  ! ${w}`);
  console.log();
}

if (failures.length) {
  console.log(`Failures (${failures.length}):`);
  for (const f of failures) console.log(`  x ${f}`);
  process.exit(1);
}

console.log('All checks passed.');
