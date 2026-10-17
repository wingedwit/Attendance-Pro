# Vendor Versions

Pinned local vendor assets used by Attendance Pro:

- Tailwind CSS CLI: `v4.2.1`
- Date Picker: Native zero-dependency Google Calendar-inspired popover (`lib/date-picker.js`)

## Rebuild Notes

1. Update `tailwind.input.css` sources if structure changes.
2. Rebuild `assets/css/tailwind.min.css` with the same major version.
3. If vendor versions change, bump:
   - `APP_VERSION` in `app.js`
   - `APP_VERSION` / `CACHE_VERSION` in `service-worker.js`
