# Antiwar.com Redesign — Design System

Goal: **modern high-density news**. Respect the heritage (founded 1995, red/blue identity, Drudge-era density their audience loves) while delivering 2026-grade craft. References: Techmeme (density), The Economist/Reuters (editorial red), Tangle/The Information (typographic confidence).

## Brand foundation

Derived from their existing identity — current site uses headline red `#990000` and navy `#0E2461`. We refine rather than replace.

### Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#FAF9F6` (newsprint warm white) | `#121417` | page background |
| `--surface` | `#FFFFFF` | `#1A1D21` | cards, rails |
| `--ink` | `#16181D` | `#E8E6E1` | body text |
| `--ink-2` | `#5A5F6A` | `#9BA0AA` | meta, bylines, timestamps |
| `--brand` | `#A41E22` (refined heritage red) | `#D4565A` | headlines accents, links, CTAs |
| `--brand-press` | `#7E1518` | `#B23A3E` | hover/active |
| `--navy` | `#1B2A4A` | `#8FA8D6` | visited links, secondary accents |
| `--rule` | `#E4E1DA` | `#2A2E34` | hairline dividers (the density workhorse) |
| `--breaking` | `#C8102E` | `#E8434F` | breaking tag only — earned, rare |
| `--focus` | `#1B6EC2` | `#5AA2E8` | a11y focus rings |

Newsprint warmth + hairline rules deliver density without the 1998 chaos. Red is *earned* (lead stories, breaking, CTAs) — not every link.

### Typography

| Role | Face | Notes |
|---|---|---|
| Headlines & article body | **Newsreader** (variable, optical sizes) | Designed for on-screen news. Display cuts for heds, text cut for body. |
| UI, meta, navigation, river | **Inter** (variable) | Dense lists, bylines, timestamps, buttons |
| Timestamps/data accents | Inter tabular-nums | No third font |

Self-hosted via Fontsource, `font-display: swap`, latin subset only.

**Scale (fluid, clamp-based):**
- `--text-xs` 12px — timestamps, tags
- `--text-sm` 13.5px — river items, meta
- `--text-base` 15px — UI default
- `--text-md` 17px — article body (`Newsreader`, 1.65 line-height)
- `--text-lg` clamp(19→22px) — river lead items, card heds
- `--text-xl` clamp(24→30px) — section leads
- `--text-2xl` clamp(32→44px) — homepage lead story
- `--text-3xl` clamp(38→56px) — article page h1

Density rules: river line-height 1.35, 10–12px vertical rhythm between items, hairline rules between groups.

### Spacing & layout

- Base unit 4px; scale: 4/8/12/16/24/32/48/64.
- Max content width 1280px; article measure 680px (~70ch).
- Breakpoints: `sm 640` / `md 768` / `lg 1024` / `xl 1280`.

**Homepage grid (desktop ≥1024):**
```
┌────────────────────────────────────────────────┐
│ masthead: logo · nav · search · theme · DONATE │
├──────────────┬───────────────────┬─────────────┤
│ LEAD STORY   │ NEWS RIVER        │ RIGHT RAIL  │
│ (image card) │ curated headlines │ blog list   │
│ + secondary  │ date-grouped,     │ video embed │
│ features     │ nested sub-links  │ viewpoints  │
│ 5 cols       │ 4 cols            │ 3 cols      │
├──────────────┴───────────────────┴─────────────┤
│ regional sections (multi-col compact)          │
├────────────────────────────────────────────────┤
│ newsletter band · donate band · footer         │
└────────────────────────────────────────────────┘
```
Mobile: single column, priority order = lead → breaking/news river → viewpoints → blog → regions. Sticky compact masthead.

### Images

- Harvest `og:image` per article at build (verified available on all 3 WP properties).
- Lead story: 16:9, full-bleed within card. Feature cards: 3:2 thumb left or top.
- News river: **text-only** (speed + density; images would dilute scanning).
- All images: lazy-loaded except lead, explicit width/height (CLS=0), `Astro:assets` optimized AVIF/WebP.
- Fallback for missing images: typographic card w/ section color — AI-generated topical art as later option.

### Components

1. `Masthead` — wordmark (modernized "ANTIWAR.COM" lockup), primary nav, search, theme toggle, donate button
2. `BreakingBar` — optional thin ticker under masthead (only when breaking exists)
3. `LeadStory` — image + 2xl hed + dek + byline/time
4. `FeatureCard` — thumb + lg hed + meta
5. `RiverGroup` — date header + `RiverItem[]`
6. `RiverItem` — hed link (+ source tag if external, e.g. "Al Jazeera") + optional nested sub-links
7. `SectionHeader` — small-caps Inter w/ hairline rule
8. `Byline` — author link · date · reading time
9. `Prose` — article body styles (Newsreader)
10. `ViewpointItem` — hed + author + source + date
11. `DonateBand` / `NewsletterBand` — conversion units
12. `ColumnistList` — right rail
13. `SiteFooter` — full nav, 501(c)(3) info, RBI attribution
14. `ThemeToggle` — dark mode, localStorage + prefers-color-scheme

### Voice/labels

Keep their section names: News, Viewpoints, Original, Blog, Regional News, Latest News. Keep "Your best source for antiwar news, viewpoints, and activities" tagline. External river items get source attribution chips — turning their aggregation into a visible feature, not a buried link.

### Accessibility & quality bars

- WCAG AA contrast minimum (brand red on paper = 6.2:1 ✓)
- Visible focus states everywhere; skip-to-content link
- Semantic landmarks: `header/nav/main/article/aside/footer`
- Lighthouse targets: 100/100/100/100 mobile + desktop
- Zero CLS, LCP < 1.5s on homepage
