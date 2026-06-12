import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://kpd-leaf.github.io/antiwar-redesign/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'shots/live-home.png' });
// Click through to an article via the lead story link
const lead = page.locator('.lead-title a');
const href = await lead.getAttribute('href');
await lead.click();
await page.waitForLoadState('networkidle');
console.log('article url:', page.url());
await page.screenshot({ path: 'shots/live-article.png' });
// Search test
await page.goto('https://kpd-leaf.github.io/antiwar-redesign/search/', { waitUntil: 'networkidle' });
await page.fill('.pagefind-ui__search-input', 'Iran');
await page.waitForTimeout(1500);
const results = await page.locator('.pagefind-ui__result').count();
console.log('search results for Iran:', results);
await page.screenshot({ path: 'shots/live-search.png' });
await browser.close();
