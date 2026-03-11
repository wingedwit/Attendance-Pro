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

## Autosuggest (Text Inputs)
- Faculty/SR/Topic/Theory Type/Batch suggestions appear from history.
- `Tab` or `ArrowRight` accepts suggestion.
- `Backspace/Delete` allows normal deletion without sticky suggestion.

## Theme
- Light and dark theme both readable.
- Toast visibility acceptable in both themes.
