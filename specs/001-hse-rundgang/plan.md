# Implementation Plan: HSE Rundgang und Register

**Branch**: `001-hse-rundgang` | **Revision**: 2026-10-08 | **Specification**: [spec.md](./spec.md)

## Design Read

Reading this as: mobile-first, regulated workplace-inspection product for staff in a workshop, with a calm, accessible and reliable interface, preserving the established QPS green/neutral language. Design values: variance 3, motion 2, density 5. Apply Taste-Skill general rules only; it explicitly excludes dashboards and multistep forms.

## Summary

Replace the older checklist with the supplied reference matrix (R1-R15 in QPS, QLabs, xTec plus optional M1-M9). Keep data offline in IndexedDB, retain annual immutable round numbers, add defect follow-up and export XLSX/JSON/PDF client-side. Periodic Prüftermine remain in the separate workbook, not in app views or XLSX export.

## Technical Context

- React 19, Vite 8, TypeScript 7, Tailwind 4, React Router 8.
- Dexie 4/IndexedDB with a new schema version after v3.
- jsPDF + jspdf-autotable for PDF.
- ExcelJS for workbook generation; lazy-load for export only.
- Vitest plus Playwright using the already installed Chromium/Edge executable; do not run browser installation.
- Offline-first PWA; photos JPEG Blob <= 1600 px long edge.

## Source Decisions

1. Current 2.1 checklist layout and area source is the supplied reference image: one matrix with QPS, QLabs and xTec. Existing office sources are read-only.
2. Excel formula semantics and seed rows are captured from `HSE_Rundgang_Register.xlsx` sheets Übersicht, Rundgänge, Mängel, Prüftermine, Grundlagen, Listen. The source files remain read-only.
3. SOP_META document ID, version, and valid-from remain fixed; title becomes exactly `HSE Rundgang`.
4. Preserve current annual walk counter and docNr identity. New database upgrade may reset incompatible old rating data only when no safe mapping exists; it must not reset counters or crash.

## Architecture

- `src/data/checklist.ts`: single versioned data definition for three weekly matrix areas, R1-R15, M1-M9, legal bases and literal form copy.
- `src/data/register.ts`: Excel seed lists, priority days, initial inspection proposals and result/status values.
- `src/lib/walk.ts`, `dates.ts`, `register.ts`: pure rating, duration, interval, deadline, ID and dashboard calculations.
- `src/db.ts`: versioned schema, migrations, seed data, repository transactions.
- Existing WalkPage becomes the form flow: Rundgangdaten, checklist matrix, defects, close.
- RegisterPage has Rundgänge and Mängel; DashboardPage summarizes walks and defects; SettingsPage edits applicable list values. Inspection table data stays available for compatible local backups, but is not shown.
- `src/lib/pdf.ts`: two-page-first PDF with continuation for many defects/photos, matching the new template and exact current SOP metadata.
- `src/lib/excel.ts`: XLSX builder with the 3 register sheets and workbook column order.
- `src/lib/backup.ts`: JSON backup version 4, collision-safe import including inspections/settings.

## Delivery Stages

1. Rewrite specification/data model/plan/tasks before feature code.
2. Replace checklist and types, pure calculations, and Dexie migration/seeding. Run typecheck/unit tests.
3. Rebuild walk flow, defects follow-up, overview/register/settings pages. Run typecheck/unit tests.
4. Build PDF/XLSX/JSON exports and output-generation tests. Run unit tests/build.
5. Add full Playwright path for 45 weekly cells in the three matrix columns; run with installed browser, no install command.
6. Generate example PDF/XLSX, render every PDF page for visual inspection, update README/CHANGELOG/screenshots, run all requested checks, attempt local commit without push.

## Risks and Mitigations

- Old DOCX conflicts with the new form: explicitly treat DOTX as current and never alter either source.
- Excel dates are serial values: use ExcelJS date values and formula results consistently; test boundary conditions.
- Multiple Rundgänge on one date can yield repeated formula-style Mangel IDs; keep UUID as internal key and display the specified Mangel-ID format.
- Rechecks can change a due date: centralize the precedence rule and test it.
- Local browser storage may be cleared: keep JSON backup complete and collision-safe.
