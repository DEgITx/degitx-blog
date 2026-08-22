import { OGImageRoute } from 'astro-og-canvas';
import { SITE } from '../../consts.js';
import { getPosts } from '../../utils/posts';

/**
 * Social cards, rendered at build time to /og/<key>.png.
 *
 * Fonts are committed as TTFs under src/assets rather than fetched, so a build
 * never depends on the network and CanvasKit gets a format it can actually
 * parse (it does not read woff2).
 */
const FONTS = ['./src/assets/fonts/Inter-Regular.ttf', './src/assets/fonts/Inter-Bold.ttf'];

const posts = await getPosts();

type Card = { title: string; description: string; label: string };

const pages: Record<string, Card> = {
  // Site-wide fallback, referenced by SITE.ogImage.
  site: {
    title: SITE.title,
    description: SITE.description,
    label: SITE.tagline,
  },
  blog: {
    title: 'Writing',
    description: `${posts.length} articles on systems programming, embedded platforms and multimedia.`,
    label: SITE.title,
  },
  tags: {
    title: 'Topics',
    description: 'Every subject covered on this blog, from C++ toolchains to board bring-up.',
    label: SITE.title,
  },
  about: {
    title: 'Alexey Kasyanchuk',
    description: 'Senior Software Engineer — C/C++, Android NDK, embedded Linux, multimedia.',
    label: 'About',
  },
};

for (const post of posts) {
  pages[post.id] = {
    title: post.data.title,
    description: post.data.description,
    label: post.data.tags.slice(0, 3).join('  ·  ') || SITE.title,
  };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,

  getImageOptions: (_path, page: Card) => ({
    title: page.title,
    description: page.description,
    logo: { path: './public/favicon.png', size: [72] },
    bgGradient: [
      [22, 24, 29],
      [30, 34, 46],
    ],
    border: { color: [96, 132, 255], width: 12, side: 'inline-start' },
    padding: 72,
    font: {
      title: {
        size: 62,
        lineHeight: 1.15,
        weight: 'Bold',
        color: [248, 250, 252],
        families: ['Inter'],
      },
      description: {
        size: 30,
        lineHeight: 1.4,
        weight: 'Normal',
        color: [156, 163, 178],
        families: ['Inter'],
      },
    },
    fonts: FONTS,
    format: 'PNG',
  }),
});
