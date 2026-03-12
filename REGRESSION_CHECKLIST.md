# Attendance Pro Regression Checklist

Run this checklist before/after safe optimization changes.

## Core Flow
- Open app: no console errors, UI loads.
- Switch sections via nav buttons and `Next/Previous`.
- `Alt + ArrowLeft/ArrowRight` changes section correctly.

## Logistics & Details
- Date selection updates report section (no stale "Waiting for input..." issue).
- `Yesterday/Today/Tomorrow` buttons set date and refresh report.
- Class Type toggle (`Theory/Practical`) shows correct dependent field.

## Roll Call
- Typing roll numbers updates `Count` in real time.
- Deleting roll numbers decreases `Count` immediately.
- `Sort` works and keeps invalid tokens below sorted values.
- `Clear` empties input, clears validation state, and resets count.

## Persistence & Undo/Redo
- Refresh restores all form data including attendance input.
- `Undo` and `Redo` correctly restore previous states.
- `Reset` clears persisted data and restores default state.

## Download/Copy
- Download menu opens/closes with button click.
- `Copy G-Doc Data` copies expected formatted summary.
- `Copy G-Sheet Data` copies numeric rows.
- `Esc` or outside click closes download menu.

## Theme
- Light and dark theme both readable.
- Toast visibility acceptable in both themes.

## PWA & Offline
- App install prompt (or browser install option) appears on supported browsers.
- Launching installed app opens in standalone mode.
- Offline reopen shows cached app shell after one successful online load.
- If a route is unavailable offline, fallback offline message is shown.

## Release Freeze Sanity
- Privacy note is visible and states local browser storage usage.
- Version bump applied in `app.js` and `service-worker.js` for release cache rotation.
