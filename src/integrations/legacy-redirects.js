import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * The Jekyll site served posts at `/general/<slug>.html` — a path with a file
 * extension. Astro's own `redirects` option would emit that as a *directory*
 * (`/general/<slug>.html/index.html`) under `build.format: 'directory'`, which
 * only resolves if the host happens to redirect to a trailing slash.
 *
 * So the stubs are written directly instead, at the exact paths the old site
 * used. Each one carries a canonical link plus a meta refresh, which Google
 * treats as a permanent redirect and which works on a static host with no
 * redirect rules of its own.
 *
 * @param {{
 *   site: string,
 *   map: Record<string, string>,
 *   copies?: Record<string, string>,
 * }} options
 *   `map` is oldPath -> newPath, both root-relative, served as a redirect stub.
 *   `copies` is oldPath -> builtPath: the built file is duplicated at the old
 *   path instead. Use it where an HTML stub would break the client — a feed
 *   reader polling /feed.xml wants XML, not a redirect page it cannot parse.
 */
export default function legacyRedirects({ site, map, copies = {} }) {
  const entries = Object.entries(map);
  const copyEntries = Object.entries(copies);

  return {
    name: 'legacy-redirects',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = dir.pathname.replace(/^\/([A-Za-z]:)/, '$1');

        await Promise.all(
          entries.map(async ([from, to]) => {
            const target = new URL(to, site).href;
            const file = path.join(root, from);

            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, stub(target), 'utf8');
          })
        );

        await Promise.all(
          copyEntries.map(async ([from, source]) => {
            const file = path.join(root, from);
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.copyFile(path.join(root, source), file);
          })
        );

        logger.info(
          `Wrote ${entries.length} redirect stubs and ${copyEntries.length} legacy aliases`
        );
      },
    },
  };
}

const stub = (target) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting&hellip;</title>
    <link rel="canonical" href="${target}" />
    <meta name="robots" content="noindex, follow" />
    <meta http-equiv="refresh" content="0; url=${target}" />
  </head>
  <body>
    <p>This page has moved to <a href="${target}">${target}</a>.</p>
    <script>window.location.replace(${JSON.stringify(target)});</script>
  </body>
</html>
`;
