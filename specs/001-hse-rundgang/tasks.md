---
description: Tasks for the current HSE Rundgang form and Excel register
---

# Tasks: HSE Rundgang App and Register

**Sources**: current DOTX template, `docs/register/HSE_Rundgang_Register.xlsx`, `spec.md`, `plan.md`, `data-model.md`. Source office files are read-only.

## Phase 1: Requirements and source capture

- [x] T001 Read README, CHANGELOG, all feature specs, checklist source and Taste-Skill.
- [x] T002 Read DOCX and DOTX content, all six workbook sheets, formula patterns, validations and initial values; record old DOCX/new DOTX discrepancy.
- [x] T003 Rewrite spec, data model, implementation plan and task map for the new form/register.
- [x] T004 Update requirements checklist, quickstart and backup contract for the new flow and exports.

## Phase 2: Domain, settings and migration

- [x] T010 Define R1-R15, M1-M9, five form areas, exact foundations and literal wording in `src/data/checklist.ts`.
- [x] T011 Define workbook list defaults, status/result labels, priorities, initial 15 inspection rows and editable settings in `src/data/register.ts`.
- [x] T012 Redesign domain types for `monthlyChecked`, begin/end, new defect fields/statuses, inspections, register settings, and stable internal IDs.
- [x] T013 Implement date/time/duration, monthly-first-walk, interval, deadline precedence, overdue/tage-open, ISO-KW and Mangel-ID pure functions.
- [x] T014 Add the next Dexie version, safe migration from v3, unique docNr index, inspections/settings tables, and initial proposal seeding.
- [x] T015 Add repository operations for walks, defects, inspections and settings; preserve annual counters and immutable docNr.
- [x] T016 Unit-test 75+9 checklist completeness, one legal basis per point, date/interval/deadline/status/Mangel-ID/docNr logic and DB migration/seeding. Run tests.

## Phase 3: Form and defect workflow

- [x] T020 Update form header and chapter 1: date, begin/end/duration, people, monthly checkbox suggestion, previous open defects, notes.
- [x] T021 Rebuild room-by-room 2.1 checklist with 5 rooms, 15 points each, basis, large rating buttons and Rest OK.
- [x] T022 Add conditional 2.2 M1-M9 step, five area choices plus register areas, only required while monthlyChecked.
- [x] T023 Rebuild defect editor: Mangel-ID, description, hazard, immediate and long actions, responsibility, priority, due, photo capture and prefill.
- [x] T024 Add defect follow-up editing for the four Excel statuses, completion/recheck fields, fixed flag and new due date.
- [x] T025 Update close validation and result recommendation; make closed form read-only while leaving follow-up fields editable.
- [x] T026 Run typecheck/unit tests; add Playwright form flow for monthly QLabs/R4 defect, photo, Rest OK, signatures and close.

## Phase 4: Overview, registers and settings

- [x] T030 Build workbook-equivalent overview KPIs, urgency banner, area/priority breakdowns, and inspection status counts.
- [x] T031 Build Rundgänge register with all Excel columns and computed days/interval/month-point/warning values.
- [x] T032 Build Mängel register with all Excel columns, filter/search, valid deadline, days open, red overdue styling and editable follow-up.
- [x] T033 Build Prüftermine register with exact 15 Excel proposal seeds, add/edit and computed next date/status.
- [x] T034 Build settings for register areas, four priority deadlines and max interval with the Excel defaults.
- [x] T035 Add unit tests matching workbook calculation semantics and Playwright assertions for second walk, previous defects, dashboard and register.

## Phase 5: Exports and persistence

- [x] T040 Add ExcelJS dependency and implement XLSX export for Rundgänge, Mängel, Prüftermine in source column order with computed values/formulas.
- [x] T041 Rebuild PDF to new DOTX layout: all header/footer fields, vector rating symbols, conditional 2.2, photos/extra-photo pages, conclusion and date+docNr filename.
- [x] T042 Raise JSON backup format version, include all tables/photos/settings and reject older formats with clear message.
- [x] T043 Unit-test XLSX sheet names/order/values, JSON round-trip/collision and PDF header/logo/page content.
- [x] T044 Run typecheck/tests/build and E2E including PDF and XLSX downloads; do not install Playwright browser.

## Phase 6: Deliverables

- [x] T050 Generate `docs/beispiel-bericht_HSE-Rundgang_YYYY-MM-DD_HSE-RG-YYYY-NNN.pdf` and example XLSX under docs.
- [x] T051 Render and inspect each PDF page against the new DOTX; update screenshots and fix layout issues.
- [x] T052 Update README, CHANGELOG, quickstart and Spec Kit checklists; verify source docs unchanged and tests contain no real personal names.
- [x] T053 Run `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`; commit locally without pushing if Git is available.

## Dependencies

T001-T004 -> T010-T016 -> T020-T026 -> T030-T035 -> T040-T044 -> T050-T053.
