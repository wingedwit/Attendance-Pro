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
7. `lib/step-navigator.js` -> `window.AttendanceStepNavigator`
8. `lib/state-manager.js` -> `window.AttendanceStateManager`
9. `lib/date-picker.js` -> `window.AttendanceDatePicker`
10. `lib/report-ui.js` -> `window.AttendanceReportUI`
11. `lib/export-menu.js` -> `window.AttendanceExportMenu`
12. `lib/keyboard-shortcuts.js` -> `window.AttendanceShortcuts`
13. `app.js` -> DOM wiring and application orchestration

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
| `lib/step-navigator.js` | 3-step section switching, indicator aria-current, section focus | Business rules or roll state |
| `lib/state-manager.js` | State container, debounce persistence, undo/redo stacks | Direct DOM manipulation |
| `lib/date-picker.js` | Google Calendar-inspired mini-calendar popover, month/year switcher, date pill navigation, and Google-inspired time selection popover | Live report generation |
| `lib/report-ui.js` | Live report DOM rendering, differential caching, meters & pills | State persistence |
| `lib/export-menu.js` | Dropdown export menu toggle, click-outside, copy triggers | Formatting algorithms |
| `lib/keyboard-shortcuts.js` | Global hotkeys (Alt+Arrows, Ctrl+Alt+D/S, Ctrl+Backspace, Ctrl+Z/Y) | Direct DOM rendering |
| `app.js` | State orchestration, event binding, feature coordination | Reusable low-level utilities |

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
- Section wizard navigation: `lib/step-navigator.js`
- State store and undo/redo stacks: `lib/state-manager.js`
- Date/time pickers and quick pills: `lib/date-picker.js`
- Live report rendering and caching: `lib/report-ui.js`
- Export dropdown menu: `lib/export-menu.js`
- Keyboard shortcuts: `lib/keyboard-shortcuts.js`
- UI event coordination: `app.js`
- Visual styling: `styles.css`
