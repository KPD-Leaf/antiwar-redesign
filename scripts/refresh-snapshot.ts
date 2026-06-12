/**
 * Refresh the fail-soft content snapshot from live sources.
 * Run occasionally (or in CI) so fallback content stays reasonably fresh:
 *   bun run scripts/refresh-snapshot.ts
 */
import { loadContent } from '../src/lib/loaders';
import { writeFileSync } from 'node:fs';

const content = await loadContent();
const counts = `news=${content.news.length} blog=${content.blog.length} original=${content.original.length} river-groups=${content.river.length} viewpoints=${content.viewpoints.length}`;

const out = new URL('../src/data/snapshot.json', import.meta.url).pathname;
writeFileSync(out, JSON.stringify(content, null, 1));
console.log(`Snapshot written: ${counts}`);

const withImages = [...content.news, ...content.original, ...content.blog].filter((a) => a.image).length;
console.log(`Articles with images: ${withImages}`);
