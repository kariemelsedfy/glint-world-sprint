# Release gate

## `npm run package:itch` (`scripts/package-itch.mjs`)

- Fails if `dist/index.html` is missing or the `zip` CLI is unavailable.
- Packages an explicit, sorted list of files from `dist/` (no directory entries, `-X`), so `index.html` is at the ZIP root with no `dist/` wrapper.
- Skips, and warns about, `.map`, `.env*`, `.DS_Store` and `Thumbs.db` if they ever appear in `dist/`.
- Prints file count, size and SHA-256, and writes `release/glint-world-sprint-itch.manifest.json` with the ZIP digest, per-file sizes and digests, commit, dirty-tree flag, Node version and timestamp. `release/` is git-ignored.

## `npm run check:release` (`scripts/check-release.mjs`)

| Rule | Fails when |
|---|---|
| Entry point | `index.html` is not at the ZIP root, or another `index.html` exists deeper |
| Safe paths | Absolute, `..`, backslash, or > 240-character entry paths (itch limit) |
| Forbidden files | Source maps, dotfiles, `.env*`, `.pem/.p12/.pfx/.key`, `secrets/`, `private/`, `raw-exports/`, `.ts/.tsx/.jsx/.md` sources, `node_modules/` |
| Source maps | Any `sourceMappingURL` comment in shipped text files |
| Relative paths | Any `src`/`href` in `index.html` or `url()` in CSS that starts with `/`, points outside the ZIP, or names a file not in the ZIP; any `"/assets/` literal in JS. External `http(s)` resources are listed as notes |
| Entry script | `index.html` has no module script |
| Budgets | JS > 1 500 KiB raw or > 400 KiB gzip; CSS > 40 KiB gzip; any file > 10 MiB; ZIP > 25 MiB; > 500 files |
| Manifest | Manifest digest or file list does not match the ZIP |
| Credentials (ZIP) | Google API key, `sk-`/`sk-proj-`/`sk-ant-` keys, GitHub classic and fine-grained tokens, GitLab tokens, AWS key ids, Slack tokens, Stripe live keys, private-key blocks, JWTs, credentials embedded in URLs |
| Credentials (source) | The same patterns across every git-tracked text file (except `package-lock.json`); tracked `.env`/key files |

Findings print the file and the rule name, never the matched value.

The patterns are a tripwire, not a full secret scanner: they cannot see secrets in git history, in untracked files, or in formats they do not know. History review before making the repository public is a separate owner/A0 step (checklist item in `ITCH_PUBLICATION_CHECKLIST.md`).

## Negative test (executed 2026-09-26)

A copy of `dist/` was tampered with (added `assets/x.js.map`, a `.env`, a nested `sub/index.html`, a JS file holding a fake AWS-key-shaped string, and `index.html` rewritten to `/assets/…`), zipped over the release path, and checked:

```
Release check failed (9):
- extra index.html below the root (itch may pick the wrong one): sub/index.html
- ZIP contains a env file: .env
- ZIP contains a dotfile: .env
- ZIP contains a source map: assets/x.js.map
- ZIP assets/leak.js: contains a AWS access key id-shaped string (value not printed; review and rotate if real)
- index.html uses an absolute path "/assets/index-Ck9_vXsy.js"; itch serves from a subdirectory, Vite base must be "./"
- index.html uses an absolute path "/assets/index-CTSRAD_L.css"; itch serves from a subdirectory, Vite base must be "./"
- manifest SHA-256 does not match the ZIP; re-run `npm run package:itch`
- manifest file list does not match the ZIP
```

(Message wording was tidied afterwards to "forbidden file (…)" / "credential-shaped string (…)"; the rules are unchanged.) Re-running `package:itch` then `check:release` on the real build passed.

## Results on five-city `main` @ `0235448`

```
Wrote release/glint-world-sprint-itch.zip (16 files, 1166.7 KiB)
ZIP        1.14 MiB (16 files) budget 25.00 MiB
SHA-256    631c3b32fc762961c6142bd42993d9a03006dbc2aa113963026aa1923528f729
JS         1.13 MiB raw, 328.1 KiB gzip -9 (budget 1.46 MiB / 400.0 KiB)
CSS        10.9 KiB gzip -9 (budget 40.0 KiB)
Scanned    3 text files in the ZIP, 263 tracked source files
Release check passed.
```

JS is at 77 % of its raw budget and 82 % of its gzip budget; the font and photos are binary assets and are covered by the per-file and ZIP budgets only.

## Results on integrated `main` @ `656af1d`

```
ZIP        305.3 KiB (3 files) budget 25.00 MiB
SHA-256    94379e96c70faa659e8df62a8235c7c1782d8dbddb591418d924a4897495e4c7
JS         1.04 MiB raw, 295.3 KiB gzip -9 (budget 1.46 MiB / 400.0 KiB)
CSS        8.4 KiB gzip -9 (budget 40.0 KiB)
Scanned    3 text files in the ZIP, 173 tracked source files
Release check passed.
```
