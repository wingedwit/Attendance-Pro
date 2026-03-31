# Attendance Pro - App Stats

Snapshot date: 2026-03-31
Project path: `/home/docvaibhav/App Development/Attendance-Pro`

## Repo
- Branch: `main`
- Working tree: clean
- Total commits: `41`
- Latest commit: `bdee5d2` (`Fix analytics`)

## Code Size
- Total listed lines: `2558`
- `app.js`: `960` lines (`48K`)
- `styles.css`: `704` lines (`24K`)
- `index.html`: `282` lines (`20K`)
- `service-worker.js`: `132` lines (`8K`)
- `pwa-register.js`: `18` lines (`4K`)
- `lib/attendance-logic.js`: `197` lines
- `lib/date-utils.js`: `117` lines
- `lib/storage-utils.js`: `64` lines

## Structure
- Files (max depth 3): `39`
- Directories (max depth 3): `139`
- `assets` files: `6`
- `lib` modules: `3`

## PWA / Cache
- Service worker version: `1.0.4`
- Runtime cache max entries: `40`
- App shell precache entries: `15`

## Analytics
- GA4 Measurement ID: `G-MLZ8LLL2RQ`
- Active custom event: `copy_gdoc_data`

## Keyboard Shortcuts
- `Alt + Right Arrow` -> Next section
- `Alt + Left Arrow` -> Previous section
- `Ctrl + Alt + D` -> Copy G-Doc data
- `Ctrl + Alt + S` -> Copy G-Sheet data
- `Ctrl + Backspace` -> Reset form

## Refresh Commands
Run these from the project root:

```bash
git rev-parse --abbrev-ref HEAD
git status --short
git rev-list --count HEAD
git log --oneline --decorate -n 10
wc -l app.js index.html styles.css service-worker.js pwa-register.js lib/*.js manifest.webmanifest REGRESSION_CHECKLIST.md VENDOR_VERSIONS.md
du -h app.js index.html styles.css service-worker.js pwa-register.js manifest.webmanifest | sort -h
find . -maxdepth 3 -type f | sed 's#^./##' | wc -l
find . -maxdepth 3 -type d | sed 's#^./##' | wc -l
find assets -type f | wc -l
find lib -type f | wc -l
grep -nE "APP_VERSION|RUNTIME_CACHE_MAX_ENTRIES" service-worker.js
grep -nE "G-MLZ8LLL2RQ|copy_gdoc_data" index.html app.js
```
