# Implementation Plan: HSE-Rundgang App (SOP QPS_HSE_00064)

**Branch**: `001-hse-rundgang` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-hse-rundgang/spec.md`

## Summary

Mobile-first, offline-fähige Single-Page-App, die die SOP QPS_HSE_00064 abbildet: Rundgang anlegen
(KW, Wochen/Monats-Vorschlag), Checkliste Raum für Raum (Punkt × Bereich) bewerten, Mängel mit Kamera-Fotos erfassen,
mit Bildschirm-Unterschrift abschliessen, PDF-Bericht `HSE-Rundgang_JJJJ-KWxx.pdf` erzeugen,
offene Mängel über Rundgänge verfolgen. Rein statisches Frontend mit Datenhaltung in IndexedDB;
Auslieferung über GitHub Pages oder einen beliebigen Webserver, verlinkt aus Odoo.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22 (Build)

**Primary Dependencies**: React 19, Vite 7, Tailwind CSS 4, React Router (HashRouter), Dexie 4 (IndexedDB), jsPDF + jspdf-autotable (PDF), vite-plugin-pwa (Service Worker/Manifest), @phosphor-icons/react, @fontsource-variable/geist

**Storage**: IndexedDB im Browser (Tabellen `walks`, `defects`, `photos`); Fotos als JPEG-Blob

**Testing**: Vitest (Fachlogik), Playwright (Smoke-Test, Chromium, mobile Viewport)

**Target Platform**: Aktuelle Mobile-Browser (Safari iOS 16+, Chrome Android), Desktop-Browser

**Project Type**: Web-Frontend (statische PWA)

**Performance Goals**: Erste Anzeige < 2 s im Firmen-WLAN; Bewertung eines Punkts ohne spürbare Verzögerung (< 100 ms)

**Constraints**: Offline-fähig, kein Backend, Foto max. 1600 px / ca. 600 KB, Touch-Ziele >= 44 px, UI Deutsch (CH)

**Scale/Scope**: 1 bis 3 Anwender, ca. 50 Rundgänge/Jahr, einige hundert Fotos/Jahr; 4 Hauptansichten

## Constitution Check

| Prinzip | Umsetzung im Plan | Status |
|---|---|---|
| I SOP-Treue | Checkliste in `src/data/checklist.ts` mit `SOP_META.version`; FR-Verweise auf SOP-Kapitel; Rundgang speichert `sopVersion` | OK |
| II Offline zuerst | PWA mit Precache, IndexedDB, PDF clientseitig | OK |
| III Datenintegrität | Abschluss-Validierung als reine Funktion; abgeschlossene Rundgänge schreibgeschützt; Mangel-Status separat änderbar | OK |
| IV Mobile zuerst / Deutsch CH | Mobile Layout, 44 px Ziele, `capture="environment"`, Taste-Skill-Regeln (Dials 3/2/5) | OK |
| V Einfachheit | Ein Vite-Projekt, keine Server-Komponente, kein State-Management-Framework (Dexie `useLiveQuery`) | OK |
| VI Testbare Logik | `src/lib/*.ts` rein funktional, Vitest; Playwright-Smoke | OK |

Re-Check nach Phase 1: keine Verletzungen, keine Complexity-Tracking-Einträge.

## Project Structure

### Documentation (this feature)

```text
specs/001-hse-rundgang/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── backup-format.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── data/checklist.ts        # SOP-Definition (einzige Quelle), SOP_META
├── lib/                     # reine Fachlogik (getestet)
│   ├── dates.ts             # ISO-KW, Datumsformat, Dateiname
│   ├── walk.ts              # Felder je Art und Bereich, Zähler, Ergebnis, Validierung, Prio->Frist
│   ├── image.ts             # Foto verkleinern (Canvas)
│   ├── pdf.ts               # PDF-Bericht (jsPDF)
│   ├── backup.ts            # JSON Export/Import, CSV-Register
│   └── types.ts
├── db.ts                    # Dexie-Schema + Repository-Funktionen
├── components/              # UI-Bausteine (Header, SegmentedRating, PhotoInput, SignaturePad, ...)
├── pages/                   # Dashboard, WalkPage (Tabs), DefectRegister, Backup
├── App.tsx, main.tsx, index.css
tests/
├── unit/                    # Vitest
└── e2e/                     # Playwright smoke
public/                      # Icons, Test-Fixture nicht hier (tests/fixtures)
.github/workflows/pages.yml  # Deployment GitHub Pages
```

**Structure Decision**: Einzelnes Frontend-Projekt (Option 1 angepasst), Fachlogik getrennt von UI unter `src/lib`.

## Complexity Tracking

Keine Verletzungen.
