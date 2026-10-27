import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the site from /second-face/
  // VITE_BASE lets the Pages workflow build a frozen playtest version into a sub-path (e.g. /second-face/act1/).
  base: process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/second-face/' : '/'),
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'] },
});
