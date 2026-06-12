# Phase 0 — Content & Architecture Intelligence

Audit date: 2026-06-12. Target: antiwar.com redesign demo (live-data, RSS/API-fed).

## 1. Content sources inventory

| Source | Type | Access | Richness | Use for |
|---|---|---|---|---|
| `news.antiwar.com` | WordPress | **REST API** `/wp-json/wp/v2/posts?_embed` (200 OK) | Full article HTML, date, slug, tags, coauthors. No featured images set. | News section + article pages |
| `www.antiwar.com/blog` | WordPress | **REST API** `/wp-json/wp/v2/posts?_embed` (200 OK) | Full article HTML | Blog section |
| `original.antiwar.com` | WordPress | RSS only (`/feed/`) — REST returns **401** | Title, link, author, date, category, excerpt (truncated) | Columnists/Original section |
| `www.antiwar.com/latest.php` | Hand-edited HTML | Scrape (parseable) | Curated external headlines grouped by date `<h1>`, links in `#content2` table cells | **Curated news river** (the core aggregator product) |
| `www.antiwar.com/viewpoints.php` | Hand-edited HTML | Scrape (parseable) | External op-ed links with `<span><b>author</b>, date</span>` | Viewpoints section |
| Homepage `antiwar.com` | Hand-edited HTML | Scrape | Top headlines w/ nested sub-bullets, spotlight, regional links | Editorial hierarchy signal (lead story selection) |

### Feed details
- All three RSS feeds: 10 items, `title/link/pubDate/dc:creator/category/guid/description`. Descriptions are truncated excerpts. Almost no images (1 enclosure across 30 items).
- WP REST gives full `content.rendered` (~2.4KB/article), `excerpt`, `slug`, `modified`, `tags`, `coauthors` field (Co-Authors Plus plugin). Author embedded via `wp:term` group 3 (e.g. `Kyle_Anzalone`).
- Official syndication page (`/syndication.php`) lists: news feed, original feed, FeedBurner blog feed.
- `rss.php` is dead (200, empty body). No sitemap exists anywhere. robots.txt has `Crawl-delay: 10`.

## 2. Information architecture (current site)

**Primary nav:** Original | Blog | US Casualties | Iraqi Casualties | Contact | Donate

**Sidebar nav:** Antiwar Radio, Who We Are, Search, Regional News (country dropdown), Last 7 Days / Previous Days (daily archives at `/past/YYYYMMDD.html`), Latest News, Viewpoints, Prison Scandal Resources, Photos of the Fallen, Free Newsletter, Shop, Quotes, Sources, Reprint Policy, Submission Guidelines, RSS, Privacy Policy

**Homepage sections (content zones):**
1. Top strip: Highlights (3) | Breaking News (3) | Scott Horton Show (4)
2. News column: lead headlines with nested sub-bullet related links (mix of news.antiwar.com + external)
3. Viewpoints: external + original op-eds
4. Spotlight: featured original article + photo
5. Frontline: secondary curated links
6. Right rail: YouTube embed (Dave DeCamp news show), Antiwar.Blog headline list, donate banner, columnists list (React component `#columnists-container`)
7. Regional sections: The War at Home / United States / Europe / Middle East / The Americas / Asia-Pacific etc. (visible on full-page screenshot)

**Identity/legal:** A project of the Randolph Bourne Institute, 501(c)(3) #71-0929026. Founded 1995.

## 3. Technical findings (from audit)

- Homepage: hand-coded XHTML table layout (48 tables, 87 `<font>` tags), no viewport meta → completely broken on mobile, no h1/h2, no canonical, no structured data, no semantic elements. 56/69 images missing alt.
- Already loads React from CDN for one component (columnists list) — precedent for modernization.
- Search = Google CSE embed at `/search/`.
- Title is just "Antiwar.com"; meta description generic; OG/Twitter cards present (site-wide static).
- HTTPS OK. ~52 requests, 102KB HTML. Old Google Analytics + DoubleClick ads.

## 4. Pipeline plan implications

```
Build-time loaders (Astro content layer):
  ├─ wp-rest:  news.antiwar.com  → full articles (news)
  ├─ wp-rest:  antiwar.com/blog  → full articles (blog)
  ├─ rss:      original.antiwar.com → headline/excerpt/author (original)
  ├─ scrape:   latest.php        → curated river [(date, url, title, isExternal)]
  ├─ scrape:   viewpoints.php    → viewpoints [(url, title, author, date)]
  └─ scrape:   homepage          → lead-story + sub-bullet hierarchy (editorial signal)
Rebuild: cron every 30–60 min (Vercel/CF Pages deploy hook)
```

**Risks:**
- Scrapers depend on their hand-edited HTML staying consistent (`#content2`, `.headlines` classes have clearly been stable for years — low risk, but loaders must fail soft: keep last-good JSON snapshot).
- `original` articles only have excerpts via RSS → article pages for Original link out to original.antiwar.com, or render excerpt + "continue reading" (respect their reprint policy framing; this is a demo).
- No images in feeds → design must be typography-first (which suits the dense-news aesthetic anyway). Can extract og:image per-article later if desired (each WP article page has them) — optional enhancement, costs a fetch per article.
- Crawl-delay: 10 in robots.txt — keep scraping respectful: 1 page/source per build, cache aggressively.

## 5. Demo page set (Phase 2 scope)

1. `/` homepage — modern high-density aggregator layout
2. `/news/[slug]` — article template (full content via REST) w/ NewsArticle JSON-LD
3. `/viewpoints` — viewpoints index
4. `/original` — columnists index (RSS-fed)
5. `/blog` — blog index
6. `/donate` — modern donate page
7. `/about-this-redesign` — the pitch: before/after, Lighthouse scores, audit summary
