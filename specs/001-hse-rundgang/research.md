# Research Decisions: Current HSE Rundgang Form and Register

## R1 Source of truth
- **Decision**: Use the supplied current DOTX and XLSX register content. The checked-in DOCX is an older form copy; do not alter either Word file or the register workbook.
- **Rationale**: The DOTX contains the current HSE Rundgang title, R1-R15 and five rooms. The workbook contains the full new register logic, list values, priority guidance and inspection seeds.

## R2 Local persistence and schema migration
- **Decision**: Continue with Dexie/IndexedDB and add a schema version after the existing v3.
- **Rationale**: Offline usage and local photo blobs remain required. Previous form-shaped test data is non-production and may be cleared, while annual walk counters must survive to prevent number reuse.

## R3 Register calculations
- **Decision**: Implement formula semantics as pure TypeScript functions. Deadline precedence is new recheck date, entered deadline, then walk date plus editable priority days. Inspection due date is last date plus interval months. Warning boundary is 30 days. Round interval uses the editable default 14 days.
- **Rationale**: Calculations can be shared by app overview, tables and XLSX export and tested without rendering React.

## R4 Excel export
- **Decision**: Use ExcelJS for a client-side workbook with sheets Rundgänge, Mängel and Prüftermine, matching the source column order; export calculated values for immediate spreadsheet use.
- **Rationale**: The requested output is a real .xlsx replacement with multiple sheets, unlike the previous CSV export.

## R5 PDF layout
- **Decision**: Use jsPDF and autoTable, compact A4 layout modeled on the current two-page template. Draw rating glyphs as vector lines; embed original QPS logo on every page; include continuation pages only for overflow/photos.
- **Rationale**: Works offline and offers deterministic page headers/footers and mobile downloads.

## R6 Camera photos
- **Decision**: Retain browser file inputs with `capture="environment"`, gallery selection and resize to 1600px JPEG.
- **Rationale**: Uses native camera/gallery UI without permission flows and remains compatible with mobile browsers.

## R7 UI direction
- **Decision**: Preserve the current light, green, high-contrast work-app tokens. Mobile-first, 44px+ touch targets, low animation intensity, visible focus/empty/loading/error states.
- **Rationale**: The Taste-Skill explicitly excludes dashboards and multistep forms; apply its generally relevant accessibility and calm visual principles without adopting marketing-page patterns.

## R8 Browser tests
- **Decision**: Keep Playwright Chromium project, with the existing local Microsoft Edge fallback when managed Chromium is absent; do not run browser installation.
- **Rationale**: Edge is Chromium-compatible and already present in the environment.
