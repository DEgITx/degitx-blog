import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

const isPublished = (post: Post) =>
  import.meta.env.DEV || post.data.draft !== true;

/** All published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', isPublished);
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
}

/** URL-safe form of a tag: "C++" -> "c-plus-plus", "Cross-platform" -> "cross-platform". */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/#/g, '-sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type TagInfo = { name: string; slug: string; count: number };

/** Every tag in use, most-used first, ties broken alphabetically. */
export async function getTags(posts?: Post[]): Promise<TagInfo[]> {
  const all = posts ?? (await getPosts());
  const counts = new Map<string, TagInfo>();

  for (const post of all) {
    for (const name of post.data.tags) {
      const slug = tagSlug(name);
      const existing = counts.get(slug);
      if (existing) existing.count += 1;
      else counts.set(slug, { name, slug, count: 1 });
    }
  }

  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

export async function getPostsByTag(slug: string, posts?: Post[]): Promise<Post[]> {
  const all = posts ?? (await getPosts());
  return all.filter((p) => p.data.tags.some((t) => tagSlug(t) === slug));
}

/**
 * Reading time in minutes. Code blocks are scanned much slower than prose in
 * practice, so they are counted at a third of the normal rate.
 */
export function readingTime(body: string): number {
  const codeChars = (body.match(/```[\s\S]*?```/g) ?? []).join('').length;
  const prose = body.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter(Boolean).length;
  const minutes = words / 220 + codeChars / 900;
  return Math.max(1, Math.round(minutes));
}

/** Posts sharing the most tags with `post`, excluding itself. */
export function relatedPosts(post: Post, all: Post[], limit = 3): Post[] {
  const own = new Set(post.data.tags.map(tagSlug));
  if (own.size === 0) return [];

  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      post: p,
      score: p.data.tags.filter((t) => own.has(tagSlug(t))).length,
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf()
    )
    .slice(0, limit)
    .map((x) => x.post);
}

export const postPath = (post: Post) => `/blog/${post.id}/`;

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
