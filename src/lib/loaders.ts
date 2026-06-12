/**
 * Content loaders — fetch live data from antiwar.com properties at build time.
 *
 * Fail-soft strategy: every loader falls back to the last-good snapshot in
 * src/data/snapshot.json (committed) if the live fetch fails, so builds
 * never break on upstream hiccups.
 */
import type { Article, RiverGroup, RiverItem, SiteContent, Viewpoint } from './types';
import snapshot from '../data/snapshot.json';

const UA = 'AntiwarRedesignDemo/0.1 (unofficial redesign concept; respectful build-time fetch)';

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/* ---------------- text utils ---------------- */

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&rsquo;/g, '\u2019')
    .replace(/&#8216;|&lsquo;/g, '\u2018')
    .replace(/&#8220;|&ldquo;/g, '\u201c')
    .replace(/&#8221;|&rdquo;/g, '\u201d')
    .replace(/&#8211;|&ndash;/g, '\u2013')
    .replace(/&#8212;|&mdash;/g, '\u2014')
    .replace(/&#8230;|&hellip;/g, '\u2026');
}

/** Map external hostnames to readable source labels. */
export function sourceLabel(url: string): string | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
  if (host.endsWith('antiwar.com')) return undefined;
  const known: Record<string, string> = {
    'aljazeera.com': 'Al Jazeera',
    'middleeasteye.net': 'Middle East Eye',
    'tass.com': 'TASS',
    'aa.com.tr': 'Anadolu Agency',
    'english.almayadeen.net': 'Al Mayadeen',
    'arabnews.com': 'Arab News',
    'english.alarabiya.net': 'Al Arabiya',
    'thecradle.co': 'The Cradle',
    'responsiblestatecraft.org': 'Responsible Statecraft',
    'theamericanconservative.com': 'The American Conservative',
    'apnews.com': 'AP',
    'reuters.com': 'Reuters',
    'declassifieduk.org': 'Declassified UK',
    'rudaw.net': 'Rudaw',
    'itv.com': 'ITV',
    'mises.org': 'Mises Institute',
    'scotthorton.org': 'Scott Horton',
    'libertarianinstitute.org': 'Libertarian Institute',
    'timesofisrael.com': 'Times of Israel',
    'haaretz.com': 'Haaretz',
    'jpost.com': 'Jerusalem Post',
    'theguardian.com': 'The Guardian',
    'bbc.com': 'BBC',
    'bbc.co.uk': 'BBC',
    'nytimes.com': 'NY Times',
    'washingtonpost.com': 'Washington Post',
    'wsj.com': 'WSJ',
    'cnn.com': 'CNN',
    'presstv.ir': 'Press TV',
    'timesofindia.indiatimes.com': 'Times of India',
    'scmp.com': 'SCMP',
    'kyivindependent.com': 'Kyiv Independent',
    'rt.com': 'RT',
  };
  if (known[host]) return known[host];
  // Fallback: strip TLD, title-case the domain
  const stem = host.split('.').slice(0, -1).join('.') || host;
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

/* ---------------- WordPress REST ---------------- */

interface WpPost {
  slug: string;
  link: string;
  date_gmt: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  jetpack_featured_media_url?: string;
  _embedded?: {
    'wp:term'?: Array<Array<{ name: string; taxonomy: string }>>;
  };
}

function wpAuthor(post: WpPost): string {
  // Co-Authors Plus exposes authors as a taxonomy term group (e.g. "Kyle_Anzalone")
  const groups = post._embedded?.['wp:term'] ?? [];
  for (const group of groups) {
    for (const term of group) {
      if (term.taxonomy === 'author') return term.name.replace(/_/g, ' ');
    }
  }
  return 'Antiwar.com Staff';
}

function wpTags(post: WpPost): string[] {
  const groups = post._embedded?.['wp:term'] ?? [];
  return groups
    .flat()
    .filter((t) => t.taxonomy === 'post_tag')
    .map((t) => t.name);
}

async function loadWp(base: string, source: 'news' | 'blog', perPage: number): Promise<Article[]> {
  const json = await get(`${base}/wp-json/wp/v2/posts?per_page=${perPage}&_embed=author,wp:term`);
  const posts = JSON.parse(json) as WpPost[];
  return posts.map((p) => ({
    source,
    slug: p.slug,
    title: stripTags(p.title.rendered),
    url: p.link,
    author: wpAuthor(p),
    date: p.date_gmt.endsWith('Z') ? p.date_gmt : `${p.date_gmt}Z`,
    excerpt: stripTags(p.excerpt.rendered)
      .replace(/\s*Continue reading.*$/i, '')
      .replace(/\s*\[\u2026\]\s*$/, '\u2026')
      .trim(),
    contentHtml: p.content.rendered,
    tags: wpTags(p),
    image: p.jetpack_featured_media_url || undefined,
  }));
}

/* ---------------- RSS (original.antiwar.com) ---------------- */

function rssField(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

async function loadOriginalRss(): Promise<Article[]> {
  const xml = await get('https://original.antiwar.com/feed/');
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((item) => {
    const link = rssField(item, 'link').split('?')[0];
    const slugMatch = link.match(/\/([^/]+)\/?$/);
    return {
      source: 'original' as const,
      slug: slugMatch?.[1] ?? link,
      title: decodeEntities(rssField(item, 'title')),
      url: link,
      author: decodeEntities(rssField(item, 'dc:creator')) || 'Antiwar.com',
      date: new Date(rssField(item, 'pubDate')).toISOString(),
      excerpt: stripTags(rssField(item, 'description')).replace(/\s*\[\u2026\]\s*$/, '\u2026'),
      contentHtml: '',
      tags: [decodeEntities(rssField(item, 'category'))].filter(Boolean),
    };
  });
}

/* ---------------- Scrapers (hand-edited HTML) ---------------- */

/** latest.php — curated external/internal headline river grouped by date <h1>s */
async function loadRiver(): Promise<RiverGroup[]> {
  const html = await get('https://www.antiwar.com/latest.php');
  const start = html.indexOf('id="content2"');
  const end = html.indexOf('</table>', start);
  const seg = html.slice(start, end === -1 ? undefined : end);

  const groups: RiverGroup[] = [];
  let current: RiverGroup | null = null;
  const re = /<h1>([^<]+)<\/h1>|<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) {
    if (m[1]) {
      current = { dateLabel: decodeEntities(m[1].trim()), items: [] };
      groups.push(current);
    } else if (current && m[2]) {
      const url = m[2];
      const title = stripTags(m[3]);
      if (title.length > 3) current.items.push({ title, url, sourceLabel: sourceLabel(url) });
    }
  }
  return groups.filter((g) => g.items.length > 0);
}

/** viewpoints.php — external op-ed links w/ author + date spans */
async function loadViewpoints(): Promise<Viewpoint[]> {
  const html = await get('https://www.antiwar.com/viewpoints.php');
  const start = html.indexOf('id="content2"');
  const seg = html.slice(start);
  const re = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<span><b>([\s\S]*?)<\/b>,?\s*([\d/]+)\s*<\/span>/g;
  const out: Viewpoint[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) {
    out.push({
      title: stripTags(m[2]),
      url: m[1].split('?')[0],
      author: stripTags(m[3]).replace(/^by\s+/i, ''),
      date: m[4],
      sourceLabel: sourceLabel(m[1]),
    });
  }
  return out;
}

/* ---------------- og:image harvest ---------------- */

/** Fetch og:image for articles that lack one (limited to first N to keep builds fast). */
async function harvestImages(articles: Article[], limit: number): Promise<void> {
  const targets = articles.filter((a) => !a.image).slice(0, limit);
  await Promise.allSettled(
    targets.map(async (a) => {
      const html = await get(a.url);
      const m = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (m) a.image = m[1];
    }),
  );
}

/* ---------------- Orchestrator ---------------- */

let cached: Promise<SiteContent> | null = null;

export function loadContent(): Promise<SiteContent> {
  cached ??= (async () => {
    const fallback = snapshot as unknown as SiteContent;

    async function attempt<T>(name: string, fn: () => Promise<T>, fb: T): Promise<T> {
      try {
        const v = await fn();
        if (Array.isArray(v) && v.length === 0) throw new Error('empty result');
        console.log(`[loaders] ${name}: live ✓`);
        return v;
      } catch (e) {
        console.warn(`[loaders] ${name}: falling back to snapshot (${e instanceof Error ? e.message : e})`);
        return fb;
      }
    }

    const [news, blog, original, river, viewpoints] = await Promise.all([
      attempt('news', () => loadWp('https://news.antiwar.com', 'news', 20), fallback.news),
      attempt('blog', () => loadWp('https://www.antiwar.com/blog', 'blog', 12), fallback.blog),
      attempt('original', loadOriginalRss, fallback.original),
      attempt('river', loadRiver, fallback.river),
      attempt('viewpoints', loadViewpoints, fallback.viewpoints),
    ]);

    // Images: lead/feature zone only — news top 8, original top 6, blog top 4
    await Promise.allSettled([
      harvestImages(news, 8),
      harvestImages(original, 6),
      harvestImages(blog, 4),
    ]);

    return { news, blog, original, river, viewpoints, fetchedAt: new Date().toISOString() };
  })();
  return cached;
}
