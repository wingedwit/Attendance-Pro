# Attendance Pro Architecture

Attendance Pro is a static web app. It intentionally uses ordered `defer` scripts and
small APIs attached to `window`, so it works without a bundler or development server.

## Script Loading Order

`index.html` loads scripts in dependency order:

1. `lib/date-utils.js` -> `window.AttendanceDateUtils`
2. `lib/storage-utils.js` -> `window.AttendanceStorageUtils`
3. `lib/attendance-logic.js` -> `window.AttendanceLogic`
4. `lib/app-config.js` -> `window.AttendanceConfig`
5. `lib/ui-utils.js` -> `window.AttendanceUIUtils`
6. `lib/export-utils.js` -> `window.AttendanceExportUtils`
7. `app.js` -> DOM wiring and application orchestration

Do not reorder these scripts unless `app.js` dependencies are updated at the same time.

## Module Responsibilities

| Module | Owns | Must not own |
| --- | --- | --- |
| `lib/date-utils.js` | Date parsing, display formatting, duration calculations | DOM updates or state |
| `lib/storage-utils.js` | Safe local-storage access and stored-state loading | App rendering |
| `lib/attendance-logic.js` | Roll validation, ranges, attendance calculations | Toasts or direct DOM updates |
| `lib/app-config.js` | Storage contract, defaults, undo limit | DOM updates or persistence |
| `lib/ui-utils.js` | Toasts, clipboard fallback, copy-success feedback | Report or attendance rules |
| `lib/export-utils.js` | Pure G-Doc and G-Sheet output formatting | Validation UI or clipboard access |
| `app.js` | State orchestration, event binding, rendering, feature coordination | Reusable low-level utilities |

## State Shape

The persisted state uses the `attendanceProData` key and includes:

- `date`, `startTime`, `endTime`
- `classType`, `theoryType`, `batch`
- `minRoll`, `maxRoll`
- `facultyName`, `srName`, `lectureTopic`
- `attendance`, `attendanceInputMode`

Changes to this shape must preserve loading of existing stored data and update the
storage version/migration behavior when required.

## Critical Invariants

- Roll validation and report calculations stay in `attendance-logic.js`.
- Sorting removes duplicate rolls but does not silently accept invalid entries.
- G-Doc and G-Sheet export output must remain stable unless explicitly changed.
- Undo/redo, refresh persistence, and present/absent mode must remain behaviorally identical.
- Utility modules expose a small named API through one `window.Attendance*` object.

## Where To Make Changes

- Roll parsing, duplicate behavior, or stats: `lib/attendance-logic.js`
- Clipboard, toast, or success animation: `lib/ui-utils.js`
- G-Doc or G-Sheet output formatting: `lib/export-utils.js`
- Initial state, storage key/version, or undo limit: `lib/app-config.js`
- Date or duration formatting: `lib/date-utils.js`
- UI event behavior or live report rendering: `app.js`
- Visual styling: `styles.css`

## Safe Extraction Process

1. Extract one complete responsibility from `app.js`.
2. Expose a small API from a new `lib/*.js` module.
3. Load the module before `app.js`.
4. Replace the old implementation in `app.js`.
5. Run `REGRESSION_CHECKLIST.md` before extracting the next responsibility.
