// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';

import { SITE } from './src/consts.js';
import { articleImages, externalLinks, headingAnchors } from './src/markdown/plugins.js';
import legacyRedirects from './src/integrations/legacy-redirects.js';

const root = path.dirname(fileURLToPath(import.meta.url));

const postFiles = fs
  .readdirSync(path.join(root, 'src/content/blog'))
  .filter((file) => file.endsWith('.md'));

const postSlugs = postFiles.map((file) => file.replace(/\.md$/, ''));

/**
 * slug -> ISO date, read straight from frontmatter so the sitemap can carry a
 * real `lastmod` (Astro's sitemap integration has no access to collection data).
 */
const postDates = Object.fromEntries(
  postFiles.map((file) => {
    const source = fs.readFileSync(path.join(root, 'src/content/blog', file), 'utf8');
    const updated = source.match(/^updatedDate:\s*(\S+)/m)?.[1];
    const published = source.match(/^pubDate:\s*(\S+)/m)?.[1];
    return [file.replace(/\.md$/, ''), (updated ?? published ?? '').replace(/['"]/g, '')];
  })
);

/**
 * Every URL the Jekyll site published, mapped to where it lives now, so inbound
 * links and accumulated search rankings survive the rebuild.
 */
const LEGACY_URLS = {
  // Posts: /general/<slug>.html -> /blog/<slug>/
  ...Object.fromEntries(postSlugs.map((slug) => [`/general/${slug}.html`, `/blog/${slug}/`])),
  '/general/index.html': '/blog/',
  '/categories/general/index.html': '/blog/',
  '/resume/index.html': '/about/',
};

/**
 * Paths where the old file itself must keep working. A feed reader polling
 * /feed.xml needs XML back, so the built feed is copied there rather than
 * replaced with a redirect page the reader would choke on.
 */
const LEGACY_ALIASES = {
  '/feed.xml': '/rss.xml',
  '/atom.xml': '/rss.xml',
};

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'ignore',
  build: { format: 'directory' },

  // Extensionless legacy paths are safe to route through Astro itself.
  redirects: {
    '/general': '/blog/',
    '/categories/general': '/blog/',
    '/resume': '/about/',
  },

  integrations: [
    sitemap({
      // Redirect stubs and the 404 page must stay out of the sitemap.
      filter: (page) =>
        !page.includes('/general/') && !page.includes('/categories/') && !page.includes('/404'),
      serialize(item) {
        if (item.url === `${SITE.url}/`) item.priority = 1.0;
        else if (item.url.includes('/blog/')) item.priority = 0.8;
        else if (item.url.includes('/tags/')) item.priority = 0.4;
        else item.priority = 0.6;

        const slug = item.url.match(/\/blog\/([^/]+)\/$/)?.[1];
        const date = slug && postDates[slug];
        if (date) item.lastmod = new Date(date).toISOString();

        return item;
      },
    }),
    legacyRedirects({ site: SITE.url, map: LEGACY_URLS, copies: LEGACY_ALIASES }),
  ],

  vite: { plugins: [tailwindcss()] },

  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-default' },
      wrap: false,
    },
    processor: satteri({
      hastPlugins: [headingAnchors(), externalLinks({ site: SITE.url }), articleImages()],
    }),
  },
});
