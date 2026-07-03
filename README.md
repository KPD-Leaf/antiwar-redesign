# Antiwar.com — Unofficial Redesign Concept

A modern, fast, accessible front-end for [Antiwar.com](https://www.antiwar.com), built as a good-faith gift by a reader. It renders the site's **real, live content** — pulled from Antiwar.com's own WordPress APIs and RSS feeds at build time — as pre-built static pages.

**Live demo:** https://kpd-leaf.github.io/antiwar-redesign/

> This is an **unofficial concept**, not affiliated with Antiwar.com or the Randolph Bourne Institute. All article content belongs to its original authors and publishers. The code is free to take, adapt, self-host, or ignore — no strings, no fees, no credit required.

## Why

Same content, same homepage, measured under identical conditions (Google Lighthouse, mobile emulation, June 2026):

| Lighthouse (mobile) | antiwar.com today | This concept |
| --- | --- | --- |
| Performance | 58 | **100** |
| Accessibility | 52 | **100** |
| Best practices | 88 | **100** |
| SEO | 75 | **100** |
| First paint | 6.8 s | **0.9 s** |
| Largest paint | 11.3 s | **1.8 s** |
| Layout shift | 0.056 | **0** |

Faster pages keep readers, rank higher on search, and cost less bandwidth for a reader-funded nonprofit.

## What it is

- **[Astro](https://astro.build) static site** — every page is pre-built HTML served from a CDN. No database, no server-side rendering, no render-blocking scripts.
- **Live content at build time** — pulls from the WordPress REST APIs at `news.antiwar.com` and the Antiwar.com blog, the `original.antiwar.com` RSS feed, and the hand-curated headline river. Editors keep posting to WordPress exactly as they do today; nothing about the editorial workflow changes.
- **Rebuilds hourly** — a GitHub Actions cron job regenerates and redeploys the site with fresh content. If a feed is ever unreachable, the build falls back to the last good snapshot (`src/data/snapshot.json`), so the site never breaks.
- **Private, instant search** — [Pagefind](https://pagefind.app) full-text search across news, blog, and original articles. Runs entirely in the browser; no search server, no query logging.
- **Structured data** — `NewsArticle` and `NewsMediaOrganization` JSON-LD, sitemap, canonical URLs, and Open Graph tags on every page.
- **Accessible** — semantic HTML, skip links, keyboard navigation, AA contrast, reduced-motion support, dark mode (system preference + manual toggle).
- **Lightweight by default** — the redesign ships no third-party JavaScript of its own, so pages stay fast. Ad slots and analytics can be dropped in wherever they're needed.

## Quick start

Requires [Bun](https://bun.sh) (or Node 20+ with npm — swap commands accordingly).

```sh
bun install
bun run dev        # dev server at localhost:4321/antiwar-redesign
bun run build      # static build into dist/ (fetches live feeds + indexes search)
bun run preview    # serve the production build locally
```

## Project structure

```
src/
  data/snapshot.json     # last-good content snapshot (fallback if feeds are down)
  lib/loaders.ts         # build-time content pipeline: WP REST + RSS + river
  lib/url.ts             # base-path helper for project-site hosting
  layouts/               # BaseLayout (head/SEO), ArticleLayout, SectionLayout
  components/            # Masthead, LeadStory, FeatureCard, river/viewpoint lists…
  pages/                 # homepage, sections, article pages, search, donate
  styles/tokens.css      # all design tokens: colors, type scale, spacing
scripts/
  refresh-snapshot.ts    # re-fetch feeds and update snapshot.json
  verify.ts              # Playwright screenshot pass across every template
.github/workflows/
  deploy.yml             # build + deploy to GitHub Pages; hourly cron rebuild
```

## How the content pipeline works

At build time, `src/lib/loaders.ts` fetches:

| Source | Method |
| --- | --- |
| News (`news.antiwar.com`) | WordPress REST API |
| Blog (`www.antiwar.com/blog`) | WordPress REST API |
| Original (`original.antiwar.com`) | RSS |
| Headline river + viewpoints | Curated feeds |

Each source is fetched independently and **fail-soft**: if any feed errors, that section falls back to the snapshot and the build still succeeds. Run `bun run scripts/refresh-snapshot.ts` to update the snapshot manually.

Articles are rendered as static pages with full attribution and links back to the original source, per Antiwar.com's reprint policy.

## Deploying

**GitHub Pages (current setup).** Fork the repo, enable Pages with "GitHub Actions" as the source, and push. The included workflow builds, deploys, and rebuilds every hour automatically.

**Anywhere else.** It's a plain static site — `bun run build`, then host `dist/` on Netlify, Cloudflare Pages, Vercel, or your own server. For hosting at a domain root (e.g. `antiwar.com` itself), set in `astro.config.mjs`:

```js
site: 'https://www.antiwar.com',
base: '/',
```

All internal links go through the `withBase()` helper, so changing the base is a one-line change.

## Customizing

- **Colors, fonts, spacing** — everything is a CSS custom property in `src/styles/tokens.css` (brand red, navy, type scale, dark-mode palette). Change a token, change the whole site.
- **Layout** — the homepage grid lives in `src/pages/index.astro`; the masthead and nav in `src/components/Masthead.astro`.
- **Top Story** — algorithmic by default (newest news article with an image). To hand-pick it editorially, set `LEAD_SLUG` at the top of `src/pages/index.astro` to the slug of any news post; it falls back to the algorithmic pick if that slug isn't in the feed.
- **Sections** — adding a feed means one loader in `src/lib/loaders.ts` and one page under `src/pages/`.

## License & attribution

The **code** is released under the MIT License — use it however you like.

All **content** (articles, headlines, excerpts) remains the property of Antiwar.com, the Randolph Bourne Institute, and the respective authors. This demo fetches and displays it with attribution solely to demonstrate the redesign; any production use of the content is governed by Antiwar.com's own policies.
