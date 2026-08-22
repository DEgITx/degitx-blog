# blog.degitx.com

Personal engineering blog of Alexey Kasyanchuk (DEgITx).

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com), deployed
as a static site to GitHub Pages. No client-side framework: pages ship zero JavaScript
bundles, only two small inline scripts (theme toggle and table-of-contents highlighting).

## Commands

| Command         | Does                                                            |
| --------------- | --------------------------------------------------------------- |
| `npm install`   | Install dependencies                                              |
| `npm run dev`   | Dev server at <http://localhost:4321> with hot reload              |
| `npm run build` | Type-check, then build the static site into `dist/`                |
| `npm run preview` | Serve the built `dist/` locally                                  |
| `npm run audit` | Post-build SEO / link / a11y checks over `dist/` (exits non-zero on failure) |
| `npm run icons` | Regenerate `favicon.png` and `apple-touch-icon.png`               |

## Writing a post

Add a Markdown file to `src/content/blog/`. The filename becomes the URL:
`src/content/blog/my-post.md` → `/blog/my-post/`.

```markdown
---
title: "The full headline, shown as the page's H1"
seoTitle: "Short version for <title>" # optional; use when the title exceeds ~55 chars
description: "One or two sentences, 70–165 characters. This is the search snippet."
pubDate: 2026-08-22
updatedDate: 2026-09-01 # optional
tags:
  - "C++"
  - "Embedded"
draft: false # optional; drafts show in dev, never in the build
---

Body starts here. Use `##` for top-level sections — the `<h1>` comes from the title.
```

Everything else is derived automatically: reading time, the table of contents, related
posts (by shared tags), the tag pages, the RSS entry, the sitemap entry, the JSON-LD, and
a social card at `/og/<slug>.png`.

Images go in `public/images/<topic>/`. Reference them as `/images/topic/file.png`. An image
with alt text is rendered as a `<figure>` with the alt text as a visible caption.

## Structure

```
src/
  consts.js              Site metadata, nav, social links — single source of truth
  content.config.ts      Frontmatter schema for the blog collection
  content/blog/          The posts
  data/resume.ts         Career history rendered by /about
  markdown/plugins.js    Sätteri hast plugins: heading anchors, external links, figures
  integrations/          Build-time integration writing the legacy redirect stubs
  utils/posts.ts         Sorting, tags, reading time, related posts
  components/            Head/SEO, header, footer, cards, icons
  layouts/BaseLayout     The one page shell
  pages/                 Routes, plus rss.xml, robots.txt and the OG image endpoint
  styles/global.css      Design tokens (OKLCH), base styles, article typography
public/                  Copied verbatim: images, icons, CNAME, RSS stylesheet
scripts/                 One-off icon generator and the SEO audit
```

## SEO

Handled centrally in `src/components/BaseHead.astro` and verified by `npm run audit`:

- Canonical URLs, per-page titles capped at ~60 characters, meta descriptions
- Open Graph and Twitter cards, with a generated 1200×630 image per post
- JSON-LD graph: `Person`, `WebSite`, `Blog`, `BlogPosting`, `BreadcrumbList`, `ProfilePage`
- `sitemap-index.xml` with per-section priorities, `robots.txt`, RSS with an XSL stylesheet
- Semantic headings (exactly one `h1` per page), alt text on every image, skip link

### Legacy URLs

The site previously ran on Jekyll. `astro.config.mjs` maps every old path to its new home:

- `/general/<slug>.html` → `/blog/<slug>/` (redirect stubs, written by the integration
  so the paths keep their `.html` extension instead of becoming directories)
- `/resume/` → `/about/`, `/categories/general/` → `/blog/`
- `/feed.xml` and `/atom.xml` are served as real copies of `/rss.xml`, so existing feed
  subscribers keep getting XML rather than a redirect page

Those paths are `Disallow`ed in `robots.txt` and excluded from the sitemap.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages. The custom domain comes from `public/CNAME`.

## Analytics

Google Analytics 4 is loaded in production builds only, from `SITE.analyticsId` in
`src/consts.js`. Set it to `null` to remove tracking entirely.
