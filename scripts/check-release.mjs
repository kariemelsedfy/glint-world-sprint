/**
 * Verifies the itch.io ZIP: index.html at root, relative asset URLs, no source maps, sane size.
 * Bootstrap implementation by A0; A7 owns release tooling afterwards.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const zipPath = resolve(root, 'release', 'glint-world-sprint-itch.zip');
const failures = [];

if (!existsSync(zipPath)) {
  console.error('release ZIP missing. Run `npm run package:itch` first.');
  process.exit(1);
}

const listing = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (!listing.includes('index.html')) failures.push('index.html is not at the ZIP root');

const maps = listing.filter((entry) => entry.endsWith('.map'));
if (maps.length > 0) failures.push(`source maps shipped: ${maps.join(', ')}`);

const html = readFileSync(resolve(root, 'dist', 'index.html'), 'utf8');
if (/(src|href)="\//.test(html)) failures.push('dist/index.html uses absolute asset paths; Vite base must be "./"');

const secretPattern = /(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})/;
if (secretPattern.test(html)) failures.push('dist/index.html contains a credential-shaped string');

const sizeMb = statSync(zipPath).size / 1024 / 1024;
if (sizeMb > 120) failures.push(`ZIP is ${sizeMb.toFixed(1)} MB, above the 120 MB budget`);

if (failures.length > 0) {
  console.error('Release check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`Release check passed: ${listing.length} entries, ${sizeMb.toFixed(2)} MB.`);
