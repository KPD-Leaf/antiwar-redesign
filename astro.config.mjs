// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kpd-leaf.github.io',
  base: '/antiwar-redesign',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
