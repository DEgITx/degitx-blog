import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../consts.js';
import { getPosts, postPath } from '../utils/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: `${SITE.title} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postPath(post),
      author: `${SITE.email} (${SITE.author})`,
      categories: post.data.tags,
    })),
    customData: [
      `<language>${SITE.lang}</language>`,
      `<managingEditor>${SITE.email} (${SITE.author})</managingEditor>`,
      `<webMaster>${SITE.email} (${SITE.author})</webMaster>`,
      `<copyright>Copyright ${new Date().getFullYear()} ${SITE.author}</copyright>`,
    ].join(''),
    stylesheet: '/rss-styles.xsl',
  });
}
