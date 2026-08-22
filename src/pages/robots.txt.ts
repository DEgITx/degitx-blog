import type { APIContext } from 'astro';
import { SITE } from '../consts.js';

export async function GET(_context: APIContext) {
  const body = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Legacy Jekyll paths; these only serve redirect stubs.
Disallow: /general/
Disallow: /tag/
Disallow: /categories/

Sitemap: ${SITE.url}/sitemap-index.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
