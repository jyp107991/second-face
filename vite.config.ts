import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// A playtest build (VITE_SAVE_NS set) installs as its own app, named so it is never confused with the main game.
const appName = (): Plugin => ({
  name: 'sf-app-name',
  apply: 'build',
  closeBundle() {
    const ns = process.env.VITE_SAVE_NS;
    const f = 'dist/manifest.webmanifest';
    if (!ns || !existsSync(f)) return;
    const m = JSON.parse(readFileSync(f, 'utf8'));
    const tag = ns.replace(/^act(\d+)$/i, 'Act $1');
    m.name = `The Second Face (${tag} test)`;
    m.short_name = `Second Face ${tag}`;
    writeFileSync(f, JSON.stringify(m, null, 2));
  },
});

export default defineConfig({
  // GitHub Pages serves the site from /second-face/
  // VITE_BASE lets the Pages workflow build a frozen playtest version into a sub-path (e.g. /second-face/act1/).
  base: process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS ? '/second-face/' : '/'),
  plugins: [appName()],
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
  test: { include: ['tests/**/*.test.ts'] },
});
