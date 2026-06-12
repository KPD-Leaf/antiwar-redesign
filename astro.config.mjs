// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://antiwar-redesign.pages.dev',
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'auto',
  },
});
