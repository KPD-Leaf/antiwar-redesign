/**
 * Article body sanitation, applied at render time so it covers both live
 * WordPress content and snapshot fallbacks:
 *
 * 1. Removes the featured/hero image when the body repeats it (WordPress
 *    posts often embed the featured image again at the top), so it only
 *    appears once — as the header image.
 * 2. Strips the hardcoded pixel widths WordPress puts on caption wrappers
 *    (`<div class="wp-caption" style="width: 2058px">`), which otherwise
 *    blow out the page horizontally. CSS `max-width` on the <img> can't
 *    save a fixed-width parent.
 */

/** Normalize an image URL to a comparison key: path without extension or a
 *  WordPress size suffix (`-1280x853`), so size variants of the same image match. */
function imageKey(src: string): string {
  let path = src;
  try {
    path = new URL(src, 'https://www.antiwar.com').pathname;
  } catch {
    /* keep raw src */
  }
  return path
    .toLowerCase()
    .replace(/\.\w+$/, '')
    .replace(/-\d+x\d+$/, '');
}

function firstImgSrc(block: string): string | undefined {
  return block.match(/<img[^>]*\ssrc="([^"]+)"/i)?.[1];
}

export function cleanArticleBody(html: string, heroImage?: string): string {
  if (!html) return html;
  let out = html;

  // WP caption wrappers: drop the inline style (fixed pixel width) entirely.
  out = out.replace(/<(?:div|figure)[^>]*class="[^"]*wp-caption[^"]*"[^>]*>/gi, (tag) =>
    tag.replace(/\s*style="[^"]*"/i, ''),
  );

  if (heroImage) {
    const heroKey = imageKey(heroImage);
    const isHero = (block: string) => {
      const src = firstImgSrc(block);
      return src !== undefined && imageKey(src) === heroKey;
    };

    // Remove wrapped duplicates first (caption div / figure), then bare imgs,
    // so removing the img doesn't leave an empty shell behind.
    out = out.replace(/<div[^>]*class="[^"]*wp-caption[^"]*"[^>]*>[\s\S]*?<\/div>/gi, (block) =>
      isHero(block) ? '' : block,
    );
    out = out.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, (block) => (isHero(block) ? '' : block));
    out = out.replace(/<img[^>]*\ssrc="([^"]+)"[^>]*\/?>/gi, (tag, src) =>
      imageKey(src) === heroKey ? '' : tag,
    );
    // Tidy paragraphs that only wrapped the removed image.
    out = out.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  }

  return out;
}

/**
 * True when the (already cleaned) body opens with its own image — i.e. an
 * <img> appears before much text has run. Posts sometimes lead with an inline
 * photo that is a *different file* from the featured image but shows the same
 * scene; rendering our injected hero above it reads as a duplicate. In that
 * case the layout skips the hero and lets the editorial image lead.
 */
export function hasEarlyBodyImage(html: string, textThreshold = 800): boolean {
  if (!html) return false;
  const i = html.search(/<img\b/i);
  if (i === -1) return false;
  const textBefore = html
    .slice(0, i)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return textBefore.length < textThreshold;
}
