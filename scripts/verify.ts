/**
 * Visual verification — captures all key pages at all breakpoints in one run.
 *
 * Usage:
 *   bun run scripts/verify.ts                    # all pages, desktop + mobile
 *   bun run scripts/verify.ts /                  # single path
 *   bun run scripts/verify.ts / --full           # full-page capture
 *   PORT=4321 bun run scripts/verify.ts          # custom dev/preview port
 *
 * Output: shots/<page>-<viewport>.png (overwritten each run, gitignored)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT ?? '4321';
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('../shots/', import.meta.url).pathname;

const PAGES: Record<string, string> = {
  home: '/',
  news: '/news',
  viewpoints: '/viewpoints',
  original: '/original',
  blog: '/blog',
  donate: '/donate',
  search: '/search',
  pitch: '/about-this-redesign',
};

// Article shot: resolve the first news slug from the built snapshot.
try {
  const { default: snapshot } = await import('../src/data/snapshot.json');
  const slug = (snapshot as { news?: Array<{ slug: string }> }).news?.[0]?.slug;
  if (slug) PAGES.article = `/news/${slug}`;
} catch {
  /* snapshot absent — skip article shot */
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

const args = process.argv.slice(2);
const fullPage = args.includes('--full');
const onlyPath = args.find((a) => a.startsWith('/'));

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const [name, path] of Object.entries(PAGES)) {
  if (onlyPath && path !== onlyPath) continue;
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const page = await browser.newPage({ viewport: vp });
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 20000 });
      const file = `${OUT}${name}-${vpName}.png`;
      await page.screenshot({ path: file, fullPage });
      console.log(`✓ ${file}`);
    } catch (e) {
      console.error(`✗ ${name}-${vpName}: ${e instanceof Error ? e.message : e}`);
    } finally {
      await page.close();
    }
  }
}

await browser.close();
