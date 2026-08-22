/** Single source of truth for site-wide metadata and SEO defaults. */
export const SITE = {
  url: 'https://blog.degitx.com',
  title: 'Alexey Kasyanchuk',
  /** Used as the suffix in <title> and as the schema.org Blog name. */
  name: 'DEgITx',
  tagline: 'Systems engineering notes',
  description:
    'Engineering notes by Alexey Kasyanchuk (DEgITx) on C/C++, Android NDK, embedded Linux and multimedia — the low-level details the docs leave out.',
  lang: 'en',
  locale: 'en_US',
  author: 'Alexey Kasyanchuk',
  email: 'degitx@gmail.com',
  avatar: '/degitx.jpg',
  /** Fallback social card, used when a page has no generated OG image. */
  ogImage: '/og/site.png',
  postsPerPage: 10,
  /**
   * GA4 measurement id, carried over from the previous site so historical
   * traffic data stays continuous. Set to null to drop analytics entirely —
   * nothing else in the site depends on it.
   */
  analyticsId: 'G-NF83F10V5F',
};

export const SOCIAL = [
  { name: 'GitHub', handle: 'DEgITx', url: 'https://github.com/DEgITx', icon: 'github' },
  {
    name: 'LinkedIn',
    handle: 'alexey-kasyanchuk',
    url: 'https://www.linkedin.com/in/alexey-kasyanchuk-60301456/',
    icon: 'linkedin',
  },
  {
    name: 'Stack Overflow',
    handle: 'degitx',
    url: 'https://stackoverflow.com/users/1315059/degitx',
    icon: 'stackoverflow',
  },
  { name: 'X', handle: 'DEgITx', url: 'https://x.com/DEgITx', icon: 'x' },
];

export const NAV = [
  { label: 'Writing', href: '/blog/' },
  { label: 'Topics', href: '/tags/' },
  { label: 'About', href: '/about/' },
];
