import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the site from /second-face/
  base: process.env.GITHUB_ACTIONS ? '/second-face/' : '/',
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'] },
});
