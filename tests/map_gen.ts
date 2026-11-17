import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const GEN_DIR = join('tools', 'maps');
const MAP_DIR = join('src', 'content', 'maps');

/** Every map generator in tools/maps/, by file name. */
export const generators = (): string[] => readdirSync(GEN_DIR).filter((f) => /^gen_.*\.py$/.test(f)).sort();

/**
 * Runs a map generator (tools/maps/<script>) in a scratch copy of the tree and returns every map it writes beside the
 * committed one (null when there is none). A generator reproduces its maps when each pair is equal byte for byte; a hand edit
 * to a generated map, or a generator change whose map was never regenerated, shows up as a difference.
 */
export function regenerate(script: string): { map: string; generated: string; committed: string | null }[] {
  const root = mkdtempSync(join(tmpdir(), 'mapgen-'));
  try {
    const out = join(root, MAP_DIR);
    mkdirSync(join(root, GEN_DIR), { recursive: true });
    mkdirSync(out, { recursive: true });
    // the whole folder, so a generator may import a helper module beside it
    for (const f of readdirSync(GEN_DIR).filter((x) => x.endsWith('.py'))) copyFileSync(join(GEN_DIR, f), join(root, GEN_DIR, f));
    execFileSync('python3', [join(root, GEN_DIR, script)], { stdio: 'pipe' });
    return readdirSync(out).sort().map((f) => ({
      map: f.replace(/\.ts$/, ''),
      generated: readFileSync(join(out, f), 'utf8'),
      committed: existsSync(join(MAP_DIR, f)) ? readFileSync(join(MAP_DIR, f), 'utf8') : null,
    }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** The first line where a generated map and the committed one differ, said plainly; null when they are equal. */
export function firstDiff(generated: string, committed: string | null): string | null {
  if (committed === null) return 'not committed';
  if (generated === committed) return null;
  const a = generated.split('\n'), b = committed.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `line ${i + 1}: the generator writes ${JSON.stringify(a[i] ?? '(end of file)')}, the committed map has ${JSON.stringify(b[i] ?? '(end of file)')}`;
  }
  return 'they differ';
}
