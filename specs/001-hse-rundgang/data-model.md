# Data Model: HSE-Rundgang App

IndexedDB-Datenbank `hse-rundgang` (Dexie), Schema-Version 2.

Version 2 (Formular-Revision 2026-10-08): Index `area` auf `defects`; das Upgrade von Version 1 leert alle Tabellen,
weil Testdaten im alten Aufbau (Rubriken A bis G) nicht auf die neue Checkliste abbildbar sind (App war nicht produktiv).

## ChecklistDefinition (statisch, `src/data/checklist.ts`)

| Feld | Typ | Beschreibung |
|---|---|---|
| `SOP_META` | `{ docId: 'QPS_HSE_00064', title, version: '1.0', validFrom: '2026-10-05' }` | Kopfdaten |
| `AREAS[]` | `{ id: AreaId, label }` | `gaenge` Gänge / Treppen, `engineering`, `qlabs`, `qmeasure`, `xtec-lager`, `xtec-werkstatt` |
| `GENERAL_AREA` | `{ id: 'alle', label: 'Alle Bereiche / allgemein' }` | nur für Mängel zu Monatspunkten |
| `WEEKLY_ITEMS[]` | `{ id: 'W1'..'W16', text, rhythm: 'weekly' }` | 2.1, je Bereich bewertet |
| `MONTHLY_ITEMS[]` | `{ id: 'M1'..'M9', text, rhythm: 'monthly' }` | 2.2 |
| `LEGAL_BASES[]` | `{ points: 'W1–W3, M3', ids: string[], text }` | "Grundlagen je Kontrollpunkt"; jeder Punkt genau einmal |
| Texte | `RATING_LEGEND`, `RATING_LEGEND_PRINT`, `PRIO_LINE`, `PROCEDURE_TEXT`, `NOT_IN_WALK_TEXT`, `LEGAL_FOOTNOTE`, `APPROVAL`, `CHANGE_LOG` | wörtlich aus dem Formular |

## Walk (Tabelle `walks`, Key `id`)

| Feld | Typ | Regel |
|---|---|---|
| `id` | string (UUID) | |
| `date` | `YYYY-MM-DD` | Pflicht |
| `isoYear`, `week` | number | aus `date` berechnet (ISO 8601) |
| `time` | `HH:MM` | |
| `inspector` | string | Pflicht für Abschluss |
| `companion` | string | optional (Feld `area` entfällt ab Version 2) |
| `type` | `'weekly' \| 'monthly'` | Vorschlag nach FR-003 |
| `openPointsNote` | string | Freitext zu "Offene Punkte Vorwoche" |
| `ratings` | `Record<key, 'ok' \| 'mangel' \| 'na'>` | Key `W4@qlabs` (Wochenpunkt je Bereich) bzw. `M1`; fehlender Key = unbewertet |
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
| `itemId` | string | Pkt., Pflicht, z. B. "W4" oder "M2" |
| `area` | string | Bereich, Pflicht: `AreaId`; bei Monatspunkten auch `'alle'` (Index) |
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

- `cellKey(itemId, area?)`, `parseCellKey(key)` -> `W4@qlabs` / `M1`
- `ratableKeys(type)` -> weekly: 96 Keys; monthly: 96 + 9
- `countRatings(walk, keys?)` -> `{ checked, ok, mangel, na, total }` (gesamt oder je Bereich)
- `defectCounts(defects)` -> `{ total, critical }` (SOP 3 Anzahl Mängel / davon kritisch)
- `defectsForCell(key, defects)`, `mangelWithoutDefect(walk, defects)` -> Zuordnung Feld zu Mangel (Punkt + Bereich)
- `areasForItem(itemId)` -> zulässige Bereiche für einen Mangel
- `suggestResult(defects)` -> FR-022
- `validateForClose(walk, defects)` -> Liste von Fehlermeldungen (FR-024)
- `dueFromPrio(date, prio)` -> FR-031
- `suggestType(date, otherWalks)` -> FR-003
- `reportFileName(walk, sameWeekIndex)` -> `HSE-Rundgang_2026-KW41`
