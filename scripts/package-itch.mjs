/**
 * Packages dist/ into release/glint-world-sprint-itch.zip with index.html at ZIP root.
 * Bootstrap implementation by A0; A7 owns release tooling afterwards.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');
const zipPath = resolve(releaseDir, 'glint-world-sprint-itch.zip');

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('dist/index.html missing. Run `npm run build` first.');
  process.exit(1);
}

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });

try {
  execFileSync('zip', ['-r', '-q', '-X', zipPath, '.'], { cwd: dist, stdio: 'inherit' });
} catch (error) {
  console.error('Packaging failed. The `zip` command must be available on PATH.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const sizeMb = statSync(zipPath).size / 1024 / 1024;
console.log(`Wrote ${zipPath} (${sizeMb.toFixed(2)} MB)`);
