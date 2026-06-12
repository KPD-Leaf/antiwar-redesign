export interface Article {
  source: 'news' | 'blog' | 'original';
  slug: string;
  title: string;
  /** Original URL on antiwar.com properties */
  url: string;
  author: string;
  date: string; // ISO 8601
  excerpt: string; // plain text
  /** Full rendered HTML — empty for `original` (RSS excerpts only) */
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
  /** e.g. "June 12th, 2026" */
  dateLabel: string;
  items: RiverItem[];
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
  river: RiverGroup[];
  viewpoints: Viewpoint[];
  fetchedAt: string;
}
