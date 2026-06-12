/**
 * Prefix internal root-relative paths with the configured base path
 * (needed for GitHub Pages project-site hosting at /antiwar-redesign).
 * External URLs pass through untouched.
 */
const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

export function withBase(href: string): string {
  if (!href.startsWith('/')) return href;
  return `${base}${href}`;
}
