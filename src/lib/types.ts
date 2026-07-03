export interface Article {
  source: 'news' | 'blog' | 'original';
  slug: string;
  title: string;
  /** Original URL on antiwar.com properties */
  url: string;
  author: string;
  date: string; // ISO 8601
  excerpt: string; // plain text
  /** Full rendered HTML — scraped from the article page for `original` */
  contentHtml: string;
  tags: string[];
  image?: string;
}

export interface RiverItem {
  title: string;
  url: string;
  /** Hostname-derived source label, e.g. "Al Jazeera" — undefined for antiwar.com items */
  sourceLabel?: string;
}

export interface RiverGroup {
  /** Normalized at load time, e.g. "June 12, 2026" */
  dateLabel: string;
  items: RiverItem[];
}

export interface RegionGroup {
  /** Hand-curated section name from the antiwar.com homepage, e.g. "Gaza", "The War at Home" */
  name: string;
  items: RiverItem[];
}

export interface Columnist {
  name: string;
  /** Author archive on original.antiwar.com */
  url: string;
  /** antiwar.com groups columnists: "top" (homepage rail), "bottom", and "former" */
  tier: 'featured' | 'regular' | 'former';
  latestTitle?: string;
  latestUrl?: string;
  /** As printed by the API, e.g. "June 29, 2026" */
  latestDate?: string;
}

export interface Viewpoint {
  title: string;
  url: string;
  author: string;
  date: string; // as printed, e.g. "5/19/2026"
  sourceLabel?: string;
}

export interface SiteContent {
  news: Article[];
  blog: Article[];
  original: Article[];
  /**
   * Older original.antiwar.com articles we link to from elsewhere (columnist
   * latest posts, the Raimondo memorial) — rendered as local pages but kept
   * out of the Opinion index listing.
   */
  originalExtras: Article[];
  river: RiverGroup[];
  viewpoints: Viewpoint[];
  regions: RegionGroup[];
  columnists: Columnist[];
  fetchedAt: string;
}
