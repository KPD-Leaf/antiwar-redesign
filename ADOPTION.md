# Making This the Real Antiwar.com

A step-by-step guide for the Antiwar.com team: everything needed to take this redesign live, and — just as important — everything that **doesn't change**.

The short version: your editors keep posting to WordPress exactly as they do today. This site reads your existing feeds and APIs and republishes them as fast static pages. Switching over is a hosting/DNS change plus a two-line config edit, not a content migration.

## What doesn't change (nothing to migrate)

- **Editorial workflow** — News and Blog posts keep going into WordPress at `news.antiwar.com` and `www.antiwar.com/blog`; Opinion keeps publishing to `original.antiwar.com`. The site pulls from your existing WordPress REST APIs and RSS feeds at build time. No new CMS, no retraining, no content export/import.
- **The headline river and viewpoints** — pulled from the same curated feeds you maintain now.
- **Columnists** — read from your existing columnists JSON (top/bottom/former tiers map to featured/regular/former).
- **Donations** — the donate page links to your existing donation processor. No payment infrastructure moves.
- **Newsletter** — the signup form posts to your existing Lyris/NetAtlantic list server (`pr3.netatlantic.com`) with the same field set as your current form.
- **Ads** — direct-sold ads render exactly like today (creative + "Advertise on Antiwar.com" link). See [Managing ads](README.md#managing-ads).
- **Deep archive** — pre-redesign article URLs on your existing servers keep working; this site links to them where needed.

If you stop liking the redesign, turn it off and the old site is still there. Nothing is destroyed by trying it.

## The switch, step by step

### 1. Take ownership of the code

Either fork this repository into your own GitHub account/organization, or ask and we'll transfer it outright. The code is MIT-licensed — it's yours, no strings.

### 2. Point the config at your domain (two lines)

In `astro.config.mjs`, change:

```js
site: 'https://kpd-leaf.github.io',   →   site: 'https://www.antiwar.com',
base: '/antiwar-redesign',            →   base: '/',
```

That's the whole config change. Every internal link in the site goes through a `withBase()` helper, so nothing else needs touching — sitemaps, canonical URLs, Open Graph tags, and search all follow automatically.

### 3. Remove the demo notices (three spots)

These exist only because this is an unofficial concept:

| What | Where |
| --- | --- |
| Banner: "Unofficial redesign concept…" | `src/components/Masthead.astro` — delete the `<div class="notice">` block (and its styles) |
| Footer note: "Unofficial redesign concept…" | `src/components/SiteFooter.astro` — delete the `.footer-demo-note` paragraph (and its styles) |
| The pitch page itself | delete `src/pages/about-this-redesign.astro` |

### 4. Choose hosting

It's a plain static site — after a build, `dist/` is just HTML/CSS files. Any of these work:

- **GitHub Pages (zero extra cost, current setup).** The included workflow (`.github/workflows/deploy.yml`) already builds, deploys, and **rebuilds hourly** so new WordPress posts appear on the site automatically. Enable Pages ("GitHub Actions" as source) in your fork, add `www.antiwar.com` as the custom domain, done.
- **Netlify / Cloudflare Pages / Vercel** — connect the repo, set the build command to `bun run build` (or `npm run build` with Node 20+), publish directory `dist/`. Add a scheduled rebuild hook to match the hourly refresh.
- **Your own server** — run the build on any machine on a cron and rsync `dist/` up.

Content freshness = rebuild frequency. Hourly is the default; it can be every 15 minutes if you want tighter turnaround, or a webhook from WordPress can trigger an instant rebuild on publish.

### 5. Cut over DNS

When you're happy with a staging deploy, point `www.antiwar.com` at the new host. Because the site is static and pre-built, there's no warm-up, no database migration window, and rollback is just pointing DNS back.

Keep `news.antiwar.com`, `original.antiwar.com`, and the WordPress installs exactly where they are — the build depends on them.

### 6. Pre-launch checklist

- [ ] `site`/`base` changed in `astro.config.mjs` (step 2)
- [ ] Demo notices removed (step 3)
- [ ] One **real newsletter test submission** from the deployed `/newsletter` page to confirm your list server accepts it end-to-end
- [ ] Current ads entered in `src/data/ads.json` (see [Managing ads](README.md#managing-ads))
- [ ] Analytics, if you use any: add the snippet once in `src/layouts/BaseLayout.astro` and it's on every page
- [ ] Redirects for any legacy URL patterns you want preserved (host-dependent; happy to help map these)
- [ ] Verify `https://www.antiwar.com/sitemap-index.xml` and submit to Google Search Console so search engines pick up the faster pages

## Day-two operations

| Task | How |
| --- | --- |
| Publish an article | Post to WordPress like always — appears on next rebuild |
| Run / pull an ad | Edit `src/data/ads.json` ([details](README.md#managing-ads)) |
| Hand-pick the Top Story | Set `LEAD_SLUG` at the top of `src/pages/index.astro` |
| Change colors / fonts / spacing | Edit tokens in `src/styles/tokens.css` |
| Add a section or feed | One loader in `src/lib/loaders.ts` + one page under `src/pages/` |
| Feed outage | Nothing to do — the build falls back to the last good snapshot and the site stays up |

## Questions

Open a GitHub issue on this repository, or reply to the email that brought you here. Happy to walk anyone on your team through any part of this, help with the DNS cutover, or make changes you'd want before going live.
