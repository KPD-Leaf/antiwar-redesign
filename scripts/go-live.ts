/**
 * go-live.ts — one command to convert the demo into the real antiwar.com.
 *
 * Does ADOPTION.md steps 2 and 3 automatically:
 *   1. Points astro.config.mjs at the production domain (site + base)
 *   2. Removes the "unofficial redesign" banner from the masthead
 *   3. Removes the demo note from the footer
 *   4. Deletes the pitch page (about-this-redesign)
 *
 * Usage:
 *   bun run scripts/go-live.ts                                  # defaults to https://www.antiwar.com
 *   bun run scripts/go-live.ts --domain https://staging.antiwar.com
 *
 * Safe to re-run: steps already done are skipped. Nothing is pushed or
 * committed — review with `git diff`, then commit when happy.
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const domainFlag = args.indexOf('--domain');
const domain = domainFlag !== -1 ? args[domainFlag + 1] : 'https://www.antiwar.com';

if (!domain || !/^https:\/\/[\w.-]+$/.test(domain)) {
  console.error(`Invalid --domain: ${domain}\nExpected something like: https://www.antiwar.com`);
  process.exit(1);
}

const root = resolve(import.meta.dir, '..');
let changes = 0;
let skips = 0;

function done(msg: string) {
  changes++;
  console.log(`  ✔ ${msg}`);
}

function skip(msg: string) {
  skips++;
  console.log(`  – ${msg} (already done)`);
}

function fail(msg: string): never {
  console.error(`  ✘ ${msg}`);
  console.error('\nThe file no longer matches what this script expects.');
  console.error('Follow the manual steps in ADOPTION.md instead, or open an issue.');
  process.exit(1);
}

interface Replacement {
  name: string;
  find: string;
  replace: string;
  /**
   * Short string that still exists in the file if the edit is needed but
   * `find` failed to match (i.e. the file drifted). If the signature is also
   * gone, the edit was already applied and we skip.
   */
  signature: string;
}

async function edit(relPath: string, label: string, replacements: Replacement[]) {
  const path = resolve(root, relPath);
  let text = await readFile(path, 'utf8');
  let touched = false;

  for (const { name, find, replace, signature } of replacements) {
    if (text.includes(find)) {
      text = text.replace(find, replace);
      touched = true;
      done(`${label}: ${name}`);
    } else if (text.includes(signature)) {
      fail(`${label}: "${name}" needs changing but the surrounding code has drifted`);
    } else {
      skip(`${label}: ${name}`);
    }
  }

  if (touched) await writeFile(path, text);
}

console.log(`\nGoing live for ${domain}\n`);

// 1. astro.config.mjs — site + base
await edit('astro.config.mjs', 'astro.config.mjs', [
  {
    name: `site → ${domain}`,
    find: `site: 'https://kpd-leaf.github.io',`,
    replace: `site: '${domain}',`,
    signature: `site: 'https://kpd-leaf.github.io'`,
  },
  {
    name: "base → '/'",
    find: `base: '/antiwar-redesign',`,
    replace: `base: '/',`,
    signature: `base: '/antiwar-redesign'`,
  },
]);

// 2. Masthead — remove demo banner and its styles
await edit('src/components/Masthead.astro', 'Masthead', [
  {
    name: 'demo banner',
    find: `  <div class="notice">
    <div class="container">
      Unofficial redesign concept &mdash; not affiliated with Antiwar.com.
      <a href={withBase('/about-this-redesign')}>About this project &rarr;</a>
    </div>
  </div>

`,
    replace: '',
    signature: '<div class="notice">',
  },
  {
    name: 'banner styles',
    find: `  .notice {
    background: #1b2a4a;
    color: #fff;
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    text-align: center;
    padding-block: var(--sp-1);
  }

  .notice a {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 2px;
    font-weight: 600;
  }

`,
    replace: '',
    signature: '.notice {',
  },
]);

// 3. Footer — remove demo note and its style
await edit('src/components/SiteFooter.astro', 'SiteFooter', [
  {
    name: 'demo note',
    find: `      <p class="footer-demo-note">
        Unofficial redesign concept — all content © Antiwar.com / Randolph Bourne Institute.
        <a href={withBase('/about-this-redesign')}>About this redesign</a>
      </p>
`,
    replace: '',
    signature: '<p class="footer-demo-note">',
  },
  {
    name: 'demo note style',
    find: `  .footer-demo-note a {
    text-decoration: underline;
  }

`,
    replace: '',
    signature: '.footer-demo-note a',
  },
]);

// 4. Delete the pitch page
const pitchPage = resolve(root, 'src/pages/about-this-redesign.astro');
if (existsSync(pitchPage)) {
  await unlink(pitchPage);
  done('deleted src/pages/about-this-redesign.astro');
} else {
  skip('src/pages/about-this-redesign.astro');
}

console.log(`\n${changes} change(s), ${skips} skipped.`);
console.log(`
Next steps:
  1. Review:        git diff
  2. Test locally:  bun run build && bun run preview
  3. Commit:        git add -A && git commit -m "Go live at ${domain}"
  4. Follow ADOPTION.md from step 4 (hosting) onward.
`);
