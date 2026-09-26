/**
 * Packages dist/ into release/glint-world-sprint-itch.zip with index.html at the ZIP root and
 * writes release/glint-world-sprint-itch.manifest.json (ZIP SHA-256, per-file sizes/digests,
 * commit). Owner: A7. Requires the `zip` CLI.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const releaseDir = resolve(root, 'release');
const zipName = 'glint-world-sprint-itch.zip';
const zipPath = resolve(releaseDir, zipName);
const manifestPath = resolve(releaseDir, 'glint-world-sprint-itch.manifest.json');

/** Files that must never reach the upload even if something drops them into dist/. */
const EXCLUDED = [/(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /\.map$/, /(^|\/)\.env(\..*)?$/];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

if (!existsSync(resolve(dist, 'index.html'))) fail('dist/index.html missing. Run `npm run build` first.');

const files = walk(dist)
  .map((file) => relative(dist, file).split(sep).join('/'))
  .sort();
const skipped = files.filter((file) => EXCLUDED.some((pattern) => pattern.test(file)));
const packaged = files.filter((file) => !skipped.includes(file));
if (!packaged.includes('index.html')) fail('index.html would not be at the ZIP root.');

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });

try {
  // Explicit sorted file list: no directory entries, no extra attributes, index.html at root.
  execFileSync('zip', ['-q', '-X', '-D', zipPath, '-@'], { cwd: dist, input: `${packaged.join('\n')}\n` });
} catch (error) {
  fail(`Packaging failed. The \`zip\` command must be available on PATH.\n${error instanceof Error ? error.message : error}`);
}

const zipBuffer = readFileSync(zipPath);
const status = git(['status', '--porcelain']);
const manifest = {
  zip: zipName,
  bytes: zipBuffer.length,
  sha256: sha256(zipBuffer),
  commit: git(['rev-parse', 'HEAD']),
  dirtyWorkingTree: status === null ? null : status.length > 0,
  node: process.version,
  createdAt: new Date().toISOString(),
  files: packaged.map((file) => {
    const buffer = readFileSync(resolve(dist, file));
    return { path: file, bytes: buffer.length, sha256: sha256(buffer) };
  }),
  skipped,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

for (const file of skipped) console.warn(`Skipped ${file}`);
console.log(`Wrote ${relative(root, zipPath)} (${packaged.length} files, ${(zipBuffer.length / 1024).toFixed(1)} KiB)`);
console.log(`SHA-256 ${manifest.sha256}`);
console.log(`Manifest ${relative(root, manifestPath)} (commit ${manifest.commit ?? 'unknown'}${manifest.dirtyWorkingTree ? ', dirty tree' : ''})`);
