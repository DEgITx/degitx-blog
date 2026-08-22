import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    /**
     * Shorter title for <title> and social cards, when the on-page headline is
     * too long to survive a search result (~60 chars including the site suffix).
     */
    seoTitle: z.string().optional(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Set to true to hide from listings, feed and sitemap. */
    draft: z.boolean().default(false),
    /** Overrides the auto-generated social card. */
    heroImage: z.string().optional(),
  }),
});

export const collections = { blog };
