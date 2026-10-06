---
description: "Task list for HSE-Rundgang App"
---

# Tasks: HSE-Rundgang App (SOP QPS_HSE_00064)

**Input**: Design documents from `/specs/001-hse-rundgang/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Requested (Vitest for logic, Playwright smoke for the main flow).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Initialize Vite + React + TypeScript project in repo root (`package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`)
- [x] T002 [P] Add Tailwind CSS 4, Geist font, Phosphor icons; design tokens and dark mode in `src/index.css`
- [x] T003 [P] Configure vite-plugin-pwa (manifest, icons in `public/`) and `BASE_PATH` handling in `vite.config.ts`
- [x] T004 [P] Configure Vitest (`vitest` in `vite.config.ts`) and Playwright (`playwright.config.ts`)

## Phase 2: Foundational

- [x] T005 Write SOP checklist definition with `SOP_META` in `src/data/checklist.ts` (all items A1 to M12, rhythm, legal refs)
- [x] T006 [P] Domain types in `src/lib/types.ts`
- [x] T007 [P] Date utilities (ISO week, formatting, add days/months, file name) in `src/lib/dates.ts`
- [x] T008 Walk logic (visibleSections, countRatings, suggestType, dueFromPrio, suggestResult, validateForClose) in `src/lib/walk.ts`
- [x] T009 Dexie schema and repository functions in `src/db.ts`
- [x] T010 App shell: router, brand header with SOP meta, bottom navigation in `src/App.tsx`, `src/components/Header.tsx`
- [x] T011 [P] Unit tests for dates and walk logic in `tests/unit/*.test.ts`

## Phase 3: User Story 1 - Rundgang und Checkliste (P1) MVP

- [x] T012 [US1] New-walk creation with defaults (date, KW, time, type suggestion, last inspector) in `src/db.ts` `createWalk`
- [x] T013 [US1] Walk page with tabs Daten / Checkliste / Mängel / Abschluss in `src/pages/WalkPage.tsx`
- [x] T014 [US1] Rundgangdaten form (SOP 1) with autosave in `src/pages/walk/DataTab.tsx`
- [x] T015 [US1] Checklist tab: sections by type, legal refs, progress, OK/Nicht OK/N/A segmented control, "alle OK" per section, G1 free text in `src/pages/walk/ChecklistTab.tsx`, `src/components/RatingControl.tsx`

## Phase 4: User Story 2 - Mangel mit Foto (P1)

- [x] T016 [US2] Image resize to 1600 px JPEG in `src/lib/image.ts`
- [x] T017 [US2] Photo input (camera + gallery) with previews and delete in `src/components/PhotoInput.tsx`
- [x] T018 [US2] Defect form sheet (Pkt., Mangel, Massnahme, Verantwortlich, Prio -> Frist, Fotos) in `src/components/DefectSheet.tsx`
- [x] T019 [US2] Defects tab listing defects of the walk; "Nicht OK" opens defect sheet in `src/pages/walk/DefectsTab.tsx`

## Phase 5: User Story 3 - Abschluss und PDF (P1)

- [x] T020 [US3] Signature pad in `src/components/SignaturePad.tsx`
- [x] T021 [US3] Close tab: counts, result suggestion, signatures, validation list, close action in `src/pages/walk/CloseTab.tsx`
- [x] T022 [US3] PDF report incl. photos and file name convention in `src/lib/pdf.ts`
- [x] T023 [US3] Read-only mode for closed walks across tabs

## Phase 6: User Story 4 - Nachkontrolle (P2)

- [x] T024 [US4] Open points from previous walks in Daten tab, mark done with note
- [x] T025 [US4] Defect register page with filter, overdue highlight, CSV export in `src/pages/RegisterPage.tsx`, `src/lib/backup.ts`

## Phase 7: User Story 5 - Übersicht und Sicherung (P3)

- [x] T026 [US5] Dashboard with walk list, KPIs, empty state, "this week" hint in `src/pages/DashboardPage.tsx`
- [x] T027 [US5] JSON export/import incl. photos in `src/lib/backup.ts`, `src/pages/BackupPage.tsx`

## Phase 8: Polish

- [x] T028 Playwright smoke test (create walk, Nicht OK, defect with image, close, PDF export, screenshots) in `tests/e2e/smoke.spec.ts`
- [x] T029 [P] README (DE), GitHub Pages workflow `.github/workflows/pages.yml`, `.vscode/`, `.gitignore`
- [x] T030 Taste-skill pre-flight review (no em/en dashes in UI strings, contrast, radius lock, empty/error states)

## Dependencies

Setup -> Foundational -> US1 -> US2 -> US3 -> (US4, US5 parallel) -> Polish.
US2 depends on US1 (rating "Nicht OK"); US3 depends on US2 (validation of defects).

## Parallel Example

T006, T007 and T011 can be written in parallel; T016 and T020 are independent components.

## Implementation Strategy

MVP = Phases 1 to 5 (US1 to US3): replaces the Word template including PDF. US4 replaces the Excel follow-up, US5 adds convenience and backup.
