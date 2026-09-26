/**
 * Release gate for the itch.io HTML5 upload. Owner: A7.
 * Verifies release/glint-world-sprint-itch.zip (built by `npm run package:itch`) and the tracked
 * source tree. Findings name the file and the rule, never the matched value.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const zipPath = resolve(root, 'release', 'glint-world-sprint-itch.zip');
const manifestPath = resolve(root, 'release', 'glint-world-sprint-itch.manifest.json');

const KiB = 1024;
const MiB = 1024 * KiB;
/** Budgets. The graybox measured ~996 KiB raw / ~276 KiB gzip JS and a ~0.27 MiB ZIP. */
const BUDGET = {
  jsGzipBytes: 400 * KiB,
  jsRawBytes: 1_500 * KiB,
  cssGzipBytes: 40 * KiB,
  zipBytes: 25 * MiB,
  singleFileBytes: 10 * MiB,
  entries: 500,
};

const CREDENTIAL_PATTERNS = [
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['OpenAI-style key', /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{40,}/],
  ['GitLab token', /\bglpat-[A-Za-z0-9_-]{20,}/],
  ['AWS access key id', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Stripe secret key', /\b[rs]k_live_[A-Za-z0-9]{20,}/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['credential in URL', /\bhttps?:\/\/[^\s/:@"'`]+:[^\s/@"'`]+@[^\s"'`]+/],
];

/** Paths that must never ship in the ZIP or be tracked in git. */
const FORBIDDEN_PATH = [
  ['env file', /(^|\/)\.env(\.(?!example$)[^/]*)?$/],
  ['key/cert file', /\.(pem|p12|pfx|key)$/i],
  ['secrets/private dir', /(^|\/)(secrets|private|raw-exports)\//],
];
const ZIP_ONLY_FORBIDDEN = [
  ['source map', /\.map$/],
  ['dotfile', /(^|\/)\.[^/]+$/],
  ['source file', /\.(tsx?|jsx|mjs\.map|md)$/],
  ['node_modules', /(^|\/)node_modules\//],
];
const TEXT_EXTENSIONS = /\.(html|js|mjs|css|json|txt|svg|webmanifest|xml)$/i;

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);
const fmt = (bytes) => (bytes >= MiB ? `${(bytes / MiB).toFixed(2)} MiB` : `${(bytes / KiB).toFixed(1)} KiB`);

function run(command, args, options = {}) {
  return execFileSync(command, args, { cwd: root, maxBuffer: 256 * MiB, ...options });
}

function scanText(label, text) {
  for (const [name, pattern] of CREDENTIAL_PATTERNS) {
    if (pattern.test(text)) fail(`${label}: contains a credential-shaped string (${name}) (value not printed; review and rotate if real)`);
  }
}

if (!existsSync(zipPath)) {
  console.error('Release ZIP missing. Run `npm run build && npm run package:itch` first.');
  process.exit(1);
}

// --- Archive structure -------------------------------------------------------------------------
const listing = run('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const files = listing.filter((entry) => !entry.endsWith('/'));
const fileSet = new Set(files);
const read = (entry) => run('unzip', ['-p', zipPath, entry]);

if (!fileSet.has('index.html')) fail('index.html is not at the ZIP root');
const nestedIndex = files.filter((entry) => entry !== 'index.html' && entry.endsWith('/index.html'));
if (nestedIndex.length > 0) fail(`extra index.html below the root (itch may pick the wrong one): ${nestedIndex.join(', ')}`);
for (const entry of listing) {
  if (entry.startsWith('/') || entry.split('/').includes('..') || entry.includes('\\')) fail(`unsafe ZIP path: ${entry}`);
  if (entry.length > 240) fail(`ZIP path longer than itch's 240-character limit: ${entry}`);
}
if (files.length > BUDGET.entries) fail(`ZIP has ${files.length} files, above the ${BUDGET.entries}-file budget`);
for (const entry of files) {
  for (const [name, pattern] of [...FORBIDDEN_PATH, ...ZIP_ONLY_FORBIDDEN]) {
    if (pattern.test(entry)) fail(`ZIP contains a forbidden file (${name}): ${entry}`);
  }
}

// --- Contents: sizes, source maps, paths, credentials -----------------------------------------
let jsRaw = 0;
let jsGzip = 0;
let cssGzip = 0;
const contents = new Map();
for (const entry of files) {
  const buffer = read(entry);
  if (buffer.length > BUDGET.singleFileBytes) fail(`${entry} is ${fmt(buffer.length)}, above the ${fmt(BUDGET.singleFileBytes)} per-file budget`);
  if (entry.endsWith('.js')) {
    jsRaw += buffer.length;
    jsGzip += gzipSync(buffer, { level: 9 }).length;
  }
  if (entry.endsWith('.css')) cssGzip += gzipSync(buffer, { level: 9 }).length;
  if (!TEXT_EXTENSIONS.test(entry)) continue;
  const text = buffer.toString('utf8');
  contents.set(entry, text);
  if (/[#@]\s*sourceMappingURL=/.test(text)) fail(`${entry} references a source map`);
  scanText(`ZIP ${entry}`, text);
}
if (jsGzip > BUDGET.jsGzipBytes) fail(`JS is ${fmt(jsGzip)} gzip, above the ${fmt(BUDGET.jsGzipBytes)} budget`);
if (jsRaw > BUDGET.jsRawBytes) fail(`JS is ${fmt(jsRaw)} raw, above the ${fmt(BUDGET.jsRawBytes)} budget`);
if (cssGzip > BUDGET.cssGzipBytes) fail(`CSS is ${fmt(cssGzip)} gzip, above the ${fmt(BUDGET.cssGzipBytes)} budget`);

/** Every local reference must be relative and resolve to a file inside the ZIP. */
function checkReference(fromEntry, reference) {
  const ref = reference.trim();
  if (ref === '' || /^(data:|blob:|#|mailto:|javascript:)/i.test(ref)) return;
  if (/^(https?:)?\/\//i.test(ref)) {
    notes.push(`${fromEntry} loads an external resource: ${ref}`);
    return;
  }
  if (ref.startsWith('/')) {
    fail(`${fromEntry} uses an absolute path "${ref}"; itch serves from a subdirectory, Vite base must be "./"`);
    return;
  }
  const target = posix.normalize(posix.join(posix.dirname(fromEntry), ref.split(/[?#]/)[0]));
  if (target.startsWith('..')) fail(`${fromEntry} references "${ref}" outside the ZIP`);
  else if (!fileSet.has(target)) fail(`${fromEntry} references "${ref}", which is not in the ZIP`);
}

const html = contents.get('index.html') ?? '';
for (const match of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) checkReference('index.html', match[1]);
if (!/<script[^>]+type=["']module["'][^>]+src=/i.test(html)) fail('index.html has no module script entry');
for (const [entry, text] of contents) {
  if (entry.endsWith('.css')) {
    for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) checkReference(entry, match[1]);
  }
  if (entry.endsWith('.js') && /["'`]\/assets\//.test(text)) fail(`${entry} contains an absolute "/assets/" URL`);
}

// --- Manifest ----------------------------------------------------------------------------------
const zipBuffer = readFileSync(zipPath);
const zipSha = createHash('sha256').update(zipBuffer).digest('hex');
const zipBytes = statSync(zipPath).size;
if (zipBytes > BUDGET.zipBytes) fail(`ZIP is ${fmt(zipBytes)}, above the ${fmt(BUDGET.zipBytes)} budget`);
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.sha256 !== zipSha) fail('manifest SHA-256 does not match the ZIP; re-run `npm run package:itch`');
  const listed = new Set((manifest.files ?? []).map((file) => file.path));
  if (listed.size !== fileSet.size || [...fileSet].some((entry) => !listed.has(entry))) fail('manifest file list does not match the ZIP');
} else {
  notes.push('no manifest found; `npm run package:itch` writes one');
}

// --- Tracked source tree -----------------------------------------------------------------------
let tracked = [];
try {
  tracked = run('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
} catch {
  notes.push('git unavailable; tracked-source scan skipped');
}
for (const file of tracked) {
  for (const [name, pattern] of FORBIDDEN_PATH) {
    if (pattern.test(file)) fail(`git tracks a forbidden file (${name}): ${file}`);
  }
  if (file === 'package-lock.json' || !existsSync(resolve(root, file))) continue;
  const buffer = readFileSync(resolve(root, file));
  if (buffer.length > 2 * MiB || buffer.includes(0)) continue;
  scanText(`source ${file}`, buffer.toString('utf8'));
}

// --- Report ------------------------------------------------------------------------------------
console.log(`ZIP        ${fmt(zipBytes)} (${files.length} files) budget ${fmt(BUDGET.zipBytes)}`);
console.log(`SHA-256    ${zipSha}`);
console.log(`JS         ${fmt(jsRaw)} raw, ${fmt(jsGzip)} gzip -9 (budget ${fmt(BUDGET.jsRawBytes)} / ${fmt(BUDGET.jsGzipBytes)})`);
console.log(`CSS        ${fmt(cssGzip)} gzip -9 (budget ${fmt(BUDGET.cssGzipBytes)})`);
console.log(`Scanned    ${contents.size} text files in the ZIP, ${tracked.length} tracked source files`);
for (const note of notes) console.log(`note: ${note}`);

if (failures.length > 0) {
  console.error(`\nRelease check failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Release check passed.');
