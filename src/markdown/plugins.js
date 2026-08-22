import Slugger from 'github-slugger';

/**
 * Sätteri hast plugins.
 *
 * Astro 7 replaced the unified/rehype pipeline with Sätteri, so the usual
 * rehype-slug / rehype-autolink-headings / rehype-external-links trio does not
 * apply. These are the equivalents, written against the visitor API.
 */

const el = (tagName, properties = {}, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const text = (value) => ({ type: 'text', value });

/**
 * Give every h2–h4 a stable id and a hover anchor.
 *
 * Astro's own heading-ids plugin runs *after* user plugins and reuses an id we
 * already set, so assigning it here keeps the two in sync. The anchor is left
 * empty on purpose and its "#" comes from CSS: any text content here would leak
 * into `ctx.textContent()` and end up in the table of contents.
 */
export function headingAnchors() {
  const slugger = new Slugger();

  return {
    name: 'heading-anchors',
    element: {
      filter: ['h2', 'h3', 'h4'],
      visit(node, ctx) {
        const existing = node.properties?.id;
        const slug = typeof existing === 'string' ? existing : slugger.slug(ctx.textContent(node));

        if (typeof existing !== 'string') ctx.setProperty(node, 'id', slug);

        ctx.appendChild(
          node,
          el('a', {
            href: `#${slug}`,
            className: ['heading-anchor'],
            ariaHidden: 'true',
            tabIndex: -1,
          })
        );
      },
    },
  };
}

/**
 * Open off-site links in a new tab, and mark them rel="noopener noreferrer" so
 * the target can't reach back through window.opener.
 */
export function externalLinks({ site }) {
  const host = new URL(site).host;

  return {
    name: 'external-links',
    element: {
      filter: ['a'],
      visit(node, ctx) {
        const href = node.properties?.href;
        if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return;
        if (new URL(href).host === host) return;

        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', 'noopener noreferrer');
      },
    },
  };
}

/**
 * Lazy-load in-article images and, where the author wrote alt text, promote the
 * image to a <figure> with that text as a visible caption.
 */
export function articleImages() {
  return {
    name: 'article-images',
    element: {
      filter: ['img'],
      visit(node, ctx) {
        const props = node.properties ?? {};
        if (props.loading) return; // already processed

        const alt = typeof props.alt === 'string' ? props.alt.trim() : '';
        const image = el('img', { ...props, alt, loading: 'lazy', decoding: 'async' });

        const parent = ctx.parent(node);
        const isLoneImageParagraph =
          parent?.type === 'element' &&
          parent.tagName === 'p' &&
          parent.children.filter((c) => c.type !== 'text' || c.value.trim() !== '').length === 1;

        // A <figure> is flow content and cannot live inside a <p>, so it is
        // only built where the image is the paragraph's sole content and the
        // paragraph itself can be replaced. An inline image just gets the
        // loading hints.
        if (!alt || !isLoneImageParagraph) {
          ctx.replaceNode(node, image);
          return;
        }

        ctx.replaceNode(parent, el('figure', {}, [image, el('figcaption', {}, [text(alt)])]));
      },
    },
  };
}
