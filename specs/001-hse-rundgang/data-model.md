# Data Model: HSE-Rundgang App

IndexedDB-Datenbank `hse-rundgang` (Dexie), Schema-Version 1.

## ChecklistDefinition (statisch, `src/data/checklist.ts`)

| Feld | Typ | Beschreibung |
|---|---|---|
| `SOP_META` | `{ docId: 'QPS_HSE_00064', title, version: '1.0', validFrom: '2026-10-05' }` | Kopfdaten |
| `SECTIONS[]` | `Section` | Rubriken A, B, C, D, E, F, G, M |
| `Section.id` | `'A'..'G' \| 'M'` | |
| `Section.title` | string | z. B. "QLabs - Labor und UV-Laser" |
| `Section.rhythm` | `'weekly' \| 'monthly'` | |
| `Section.legal` | string[] | z. B. `['VUV','ChemV','Suva']` |
| `Section.items[]` | `{ id: 'C2', text, freeText?: boolean }` | G1 ist `freeText` |

## Walk (Tabelle `walks`, Key `id`)

| Feld | Typ | Regel |
|---|---|---|
| `id` | string (UUID) | |
| `date` | `YYYY-MM-DD` | Pflicht |
| `isoYear`, `week` | number | aus `date` berechnet (ISO 8601) |
| `time` | `HH:MM` | |
| `inspector` | string | Pflicht für Abschluss |
| `companion`, `area` | string | optional |
| `type` | `'weekly' \| 'monthly'` | Vorschlag nach FR-003 |
| `openPointsNote` | string | Freitext zu "Offene Punkte Vorwoche" |
| `ratings` | `Record<itemId, 'ok' \| 'nok' \| 'na'>` | fehlender Key = unbewertet |
| `observations` | string | G1 |
| `result` | `'none' \| 'minor' \| 'open' \| 'critical' \| null` | SOP 3 |
| `signature` | `{ name, date, image }` | Durchführende/r, Pflicht für Abschluss |
| `acknowledgement` | `{ name, date, image } \| null` | optional |
| `status` | `'draft' \| 'closed'` | Übergang draft -> closed einmalig |
| `sopVersion` | string | bei Anlage gesetzt |
| `createdAt`, `updatedAt`, `closedAt` | ISO-Zeitstempel | |

Index: `date`, `status`.

## Defect (Tabelle `defects`, Key `id`)

| Feld | Typ | Regel |
|---|---|---|
| `id` | UUID | |
| `walkId` | FK -> Walk | Index |
| `nr` | number | fortlaufend je Rundgang ab 1 |
| `itemId` | string | Pkt., Pflicht, z. B. "A1" |
| `hazard` | string | Mangel/Gefahr, Pflicht |
| `action` | string | Massnahme |
| `responsible` | string | |
| `prio` | `'K' \| 'H' \| 'M' \| 'N'` | Pflicht |
| `due` | `YYYY-MM-DD` | Vorschlag aus Prio (K +0, H +2 T, M +7 T, N +1 Monat) |
| `status` | `'open' \| 'done'` | Index |
| `doneAt` | `YYYY-MM-DD \| null` | |
| `doneNote` | string | |
| `createdAt`, `updatedAt` | ISO | |

Zustände: `open -> done` (Nachkontrolle), `done -> open` (Wiedereröffnen) erlaubt, jeweils mit Zeitstempel.

## Photo (Tabelle `photos`, Key `id`)

| Feld | Typ |
|---|---|
| `id` | UUID |
| `defectId` | FK -> Defect (Index) |
| `blob` | Blob (image/jpeg) |
| `width`, `height` | number |
| `createdAt` | ISO |

## Abgeleitete Werte (reine Funktionen, `src/lib/walk.ts`)

- `visibleSections(type)` -> weekly: A,C,F,G; monthly: A..G,M
- `countRatings(walk)` -> `{ checked, ok, nok, na, total }` (ohne G1)
- `suggestResult(defects)` -> FR-022
- `validateForClose(walk, defects)` -> Liste von Fehlermeldungen (FR-024)
- `dueFromPrio(date, prio)` -> FR-031
- `suggestType(date, otherWalks)` -> FR-003
- `reportFileName(walk, sameWeekIndex)` -> `HSE-Rundgang_2026-KW41`
