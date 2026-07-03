const FMT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
});

const FMT_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
});

export function formatDate(iso: string): string {
  return FMT.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  // Older pieces (e.g. the Raimondo memorial) show the full date instead of
  // a same-year "Jun 27, 8:00 AM" style that would read as recent.
  if (d.getFullYear() !== new Date().getFullYear()) return FMT.format(d);
  return FMT_TIME.format(d);
}

export function readingTime(html: string): string {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 230))} min read`;
}

export function authorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
