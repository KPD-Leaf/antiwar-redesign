/**
 * Content loaders — fetch live data from antiwar.com properties at build time.
 *
 * Fail-soft strategy: every loader falls back to the last-good snapshot in
 * src/data/snapshot.json (committed) if the live fetch fails, so builds
 * never break on upstream hiccups.
 */
import type { Article, Columnist, RegionGroup, RiverGroup, RiverItem, SiteContent, Viewpoint } from './types';
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

/* ---------------- Full articles (original.antiwar.com page scrape) ---------------- */

/**
 * original.antiwar.com's WP REST API is closed (401), so full Opinion article
 * bodies are scraped from the page HTML. The Divi theme wraps the body in
 * <div class="… et_pb_post_content_0_tb_body">…</div> — walk nested divs to
 * find the matching close, then drop the trailing share widget.
 */
function extractOriginalBody(html: string): string {
  const i = html.indexOf('et_pb_post_content_0_tb_body');
  if (i === -1) return '';
  let body = html.slice(html.indexOf('>', i) + 1);
  let depth = 1;
  const re = /<div\b|<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    depth += m[0] === '<div' ? 1 : -1;
    if (depth === 0) {
      body = body.slice(0, m.index);
      break;
    }
  }
  body = body
    .replace(/<div[^>]*class="[^"]*addtoany[\s\S]*$/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .trim();
  // Sanity check: if the anchor matched somewhere unexpected (e.g. inline
  // CSS), the slice is garbage. Return '' so the snapshot fallback fires
  // instead of shipping a broken body.
  return body.includes('<p') ? body : '';
}

export function originalSlug(url: string): string {
  return url.split('?')[0].replace(/\/$/, '').split('/').pop() ?? url;
}

/** original.antiwar.com permalinks embed the publish date: /author/YYYY/MM/DD/slug/ */
function dateFromOriginalUrl(url: string): string | undefined {
  const m = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z` : undefined;
}

/** Fetch full contentHtml for RSS-sourced Opinion articles (fail-soft per article). */
async function enrichOriginalContent(articles: Article[], fallback: Article[]): Promise<void> {
  const fbBySlug = new Map(fallback.map((a) => [a.slug, a]));
  await Promise.allSettled(
    articles.map(async (a) => {
      try {
        a.contentHtml = extractOriginalBody(await get(a.url));
      } catch {
        /* fall through to snapshot */
      }
      if (!a.contentHtml) a.contentHtml = fbBySlug.get(a.slug)?.contentHtml ?? '';
    }),
  );
}

/** Scrape a standalone original.antiwar.com article (metadata + body from page HTML). */
async function scrapeOriginalArticle(url: string): Promise<Article> {
  const clean = url.split('?')[0];
  const html = await get(clean);
  const contentHtml = extractOriginalBody(html);
  if (!contentHtml) throw new Error(`no article body found: ${clean}`);
  const title = stripTags(html.match(/<h1 class="entry-title">([\s\S]*?)<\/h1>/)?.[1] ?? '');
  if (!title) throw new Error(`no title found: ${clean}`);
  const author = stripTags(html.match(/rel="author"[^>]*>([^<]+)<\/a>/)?.[1] ?? 'Antiwar.com');
  const image = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  return {
    source: 'original',
    slug: originalSlug(clean),
    title,
    url: clean,
    author,
    date: dateFromOriginalUrl(clean) ?? new Date().toISOString(),
    excerpt: stripTags(contentHtml).slice(0, 200).replace(/\s+\S*$/, '') + '\u2026',
    contentHtml,
    tags: [],
    // The site-wide default og:image is a generic logo card — skip it
    image: image && !image.includes('AWC_summary_large_image') ? image : undefined,
  };
}

export const RAIMONDO_MEMORIAL_SLUG = 'justin-raimondo-rip-1951-2019';
const RAIMONDO_MEMORIAL_URL =
  'https://original.antiwar.com/Antiwar_Staff/2019/06/27/justin-raimondo-rip-1951-2019/';

/**
 * Extra original.antiwar.com articles we link from site chrome (the Raimondo
 * memorial) and from the columnists rail (each columnist's latest piece).
 * Scraped as full local pages; snapshot entries fill in any failed scrape.
 */
async function loadOriginalExtras(urls: string[], fallback: Article[]): Promise<Article[]> {
  const results = await Promise.allSettled(urls.map(scrapeOriginalArticle));
  const out = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const have = new Set(out.map((a) => a.slug));
  for (const fb of fallback) {
    if (!have.has(fb.slug) && fb.contentHtml) out.push(fb);
  }
  return out;
}

/* ---------------- Scrapers (hand-edited HTML) ---------------- */

/** antiwar.com renders river dates like "July 02nd, 2026" — normalize to "July 2, 2026" */
function normalizeDateLabel(label: string): string {
  return label.replace(/\b0?(\d{1,2})(?:st|nd|rd|th)\b/i, '$1');
}

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
      current = { dateLabel: normalizeDateLabel(decodeEntities(m[1].trim())), items: [] };
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

/** Homepage regional hotspots — hand-curated sections like "Gaza", "The War at Home" */
async function loadRegions(): Promise<RegionGroup[]> {
  const html = await get('https://www.antiwar.com/');
  const groups: RegionGroup[] = [];
  // Each section: <td class="hotspot">Name</td> ... <table ... bgcolor="#F3F5F6"> [links] </table>
  const chunks = html.split(/class="hotspot">/).slice(1);
  for (const chunk of chunks) {
    const name = decodeEntities(chunk.slice(0, chunk.indexOf('</td>')).trim());
    if (!name) continue;
    const table = chunk.match(/<table[^>]*bgcolor="#F3F5F6"[\s\S]*?<\/table>/)?.[0];
    if (!table) continue;
    const items: RiverItem[] = [];
    const re = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(table))) {
      const title = stripTags(m[2]);
      if (title.length > 3) items.push({ title, url: m[1], sourceLabel: sourceLabel(m[1]) });
    }
    if (items.length > 0) groups.push({ name, items });
  }
  return groups;
}

/* ---------------- Columnists (original.antiwar.com JSON) ---------------- */

/**
 * antiwar.com renders its homepage columnists list with client-side React
 * fetching this JSON. We consume the same endpoint at build time — zero JS shipped.
 */
interface ColumnistJson {
  awcol_author_name: string;
  user_link: string;
  latest_post?: { title: string; date: string; link: string };
}

async function loadColumnists(): Promise<Columnist[]> {
  const json = await get('https://original.antiwar.com/columnists/public_cached.json/');
  const data = JSON.parse(json) as Partial<Record<'top' | 'bottom' | 'former', ColumnistJson[]>>;
  const tiers = [
    ['top', 'featured'],
    ['bottom', 'regular'],
    ['former', 'former'],
  ] as const;
  return tiers.flatMap(([group, tier]) =>
    (data[group] ?? []).map((c) => ({
      name: decodeEntities(c.awcol_author_name),
      url: c.user_link,
      tier,
      latestTitle: c.latest_post ? decodeEntities(c.latest_post.title) : undefined,
      latestUrl: c.latest_post?.link,
      latestDate: c.latest_post?.date,
    })),
  );
}

/* ---------------- YouTube (Antiwar News With Dave DeCamp) ---------------- */

export const DECAMP_CHANNEL_URL = 'https://www.youtube.com/channel/UCuGQ0-iW7CPj-ul-DKHmh2A';

export interface LatestVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
}

/** Latest video from the channel's Atom feed. Fail-soft: returns null so the
 *  section can fall back to a plain channel link. */
export async function loadLatestVideo(): Promise<LatestVideo | null> {
  try {
    const xml = await get('https://www.youtube.com/feeds/videos.xml?channel_id=UCuGQ0-iW7CPj-ul-DKHmh2A');
    const id = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = xml.match(/<media:title>([^<]+)<\/media:title>/)?.[1];
    if (!id || !title) return null;
    return {
      id,
      title: decodeEntities(title),
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

/* ---------------- The Scott Horton Show (RSS) ---------------- */

export interface HortonEpisode {
  title: string;
  url: string;
  /** Recording date as printed in the feed title, e.g. "6/26/26" */
  dateLabel?: string;
}

/** Latest interviews from scotthorton.org. Fail-soft: null keeps the static promo. */
export async function loadHortonEpisodes(limit = 2): Promise<HortonEpisode[] | null> {
  try {
    const xml = await get('https://scotthorton.org/feed/');
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const episodes = items.slice(0, limit).map((item) => {
      // Feed titles look like "6/26/26 Guest Name on Topic" — split date from title
      const raw = decodeEntities(rssField(item, 'title'));
      const m = raw.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.*)$/);
      return {
        title: m ? m[2] : raw,
        url: rssField(item, 'link'),
        dateLabel: m?.[1],
      };
    });
    const valid = episodes.filter((e) => e.title && e.url);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
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

    const [news, blog, original, river, viewpoints, regions, columnists] = await Promise.all([
      attempt('news', () => loadWp('https://news.antiwar.com', 'news', 20), fallback.news),
      attempt('blog', () => loadWp('https://www.antiwar.com/blog', 'blog', 12), fallback.blog),
      attempt('original', loadOriginalRss, fallback.original),
      attempt('river', loadRiver, fallback.river),
      attempt('viewpoints', loadViewpoints, fallback.viewpoints),
      attempt('regions', loadRegions, fallback.regions ?? []),
      attempt('columnists', loadColumnists, fallback.columnists ?? []),
    ]);

    // Extra full articles: the Raimondo memorial + featured-columnist latest
    // posts that aren't already in the Opinion feed.
    const feedSlugs = new Set(original.map((a) => a.slug));
    const extraUrls = [
      RAIMONDO_MEMORIAL_URL,
      ...columnists
        .filter((c) => c.tier === 'featured')
        .map((c) => c.latestUrl)
        .filter((u): u is string => Boolean(u) && !feedSlugs.has(originalSlug(u!))),
    ];

    const [originalExtras] = await Promise.all([
      attempt(
        'original extras',
        () => loadOriginalExtras(extraUrls, fallback.originalExtras ?? []),
        fallback.originalExtras ?? [],
      ),
      // Full bodies for the Opinion feed + images for the lead/feature zones
      enrichOriginalContent(original, fallback.original),
      harvestImages(news, 8),
      harvestImages(original, 6),
      harvestImages(blog, 4),
    ]);

    return {
      news,
      blog,
      original,
      originalExtras,
      river,
      viewpoints,
      regions,
      columnists,
      fetchedAt: new Date().toISOString(),
    };
  })();
  return cached;
}
