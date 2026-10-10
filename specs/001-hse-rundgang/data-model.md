# Data Model: HSE Rundgang App und Excel-Register

## IndexedDB / Dexie

Database `hse-rundgang`; neue Schema-Version nach bestehender Version 3. Tabellen: `walks`, `defects`, `photos`, `counters`, `inspections`, `settings`. Bei Migration inkompatible Alt-Testdaten dürfen entfernt werden, aber das Upgrade muss atomar und fehlerfest bleiben. Jahreszähler der Rundgangnummer werden nie durch das Löschen eines Walks reduziert.

## Walk (`walks`, key `id`)

| Feld | Typ | Regel |
|---|---|---|
| `id` | UUID | stabiler interner Primärschlüssel |
| `docNr` | string | unveränderlich `HSE-RG-JJJJ-NNN`, eindeutiger Index |
| `date` | `YYYY-MM-DD` | Rundgangsdatum |
| `isoYear`, `week` | number | berechnet, Anzeige der ISO-KW |
| `startTime`, `endTime` | `HH:MM` / leer | Beginn und Ende |
| `durationMinutes` | number/null | abgeleitet, Differenz Ende-Beginn modulo 24h |
| `inspector`, `companion` | string | durchgeführt von, Begleitperson |
| `monthlyChecked` | boolean | Kästchen 2.2 geprüft; erster Monatstermin vorgeschlagen |
| `openDefectSnapshot` | string[]/null | beim Abschluss fixierte offene Punkte des vorigen Rundgangs |
| `ratings` | `Record<string, Rating>` | `R4@qlabs`, `R2@qps`, `M2@Engineering`; Werte `ok`, `mangel`, `na` |
| `result` | ResultKey/null | vier Gesamtbewertungen |
| `note` | string | Bemerkung fürs Rundgangregister |
| `signature` | Signature | Durchführende/r, zum Abschluss Pflicht |
| `acknowledgement` | Signature | optionale Kenntnisnahme |
| `status` | `draft`/`closed` | abgeschlossene Formulardaten schreibgeschützt |
| `sopVersion` | string | unverändert `1.0` als Anlage-Snapshot |
| `createdAt`, `updatedAt`, `closedAt` | ISO timestamps | Zeitstempel |

Indizes: `date`, `status`, eindeutiger `docNr`.

## Counter (`counters`, key `year`)

`year: number`, `lastNumber: number`. Transaktionales Reservieren bei Rundgangsanlage; Löschungen beeinflussen den Wert nicht.

## Defect (`defects`, key `id`)

| Feld | Typ | Regel |
|---|---|---|
| `id` | UUID | stabiler interner Schlüssel |
| `walkId` | UUID | Rundgang-FK, indexiert |
| `nr` | number | Formularnummer, ab 1 je Rundgang |
| `mangelId` | string | abgeleitet `YYYY-MM-DD-Mnn`, Rundgangdatum + Formularnummer |
| `itemId` | `R1`..`R15` oder `M1`..`M9` | Kontrollpunkt |
| `area` | string | Formularbereich oder zusätzliche Registerbereiche |
| `description`, `hazard` | string | Beschreibung und festgestellte Gefahr |
| `immediateAction`, `action` | string | Sofortmassnahme und Massnahme |
| `responsible` | string | Verantwortlich |
| `priority` | `critical/high/medium/low` | Registertext Kritisch/Hoch/Mittel/Niedrig |
| `due` | ISO date/leer | optionale Formularfrist |
| `status` | `open/inProgress/done/recheck` | UI-Werte Offen/In Bearbeitung/Erledigt/Nachkontrolle erforderlich |
| `doneAt`, `recheckAt`, `controlledBy` | date/string/null | Nachkontrolle |
| `fixed` | boolean/null | Mangel behoben? |
| `newDue` | date/leer | neuer Termin bei nicht behobenem Mangel |
| `note` | string | Bemerkung |
| `createdAt`, `updatedAt` | ISO timestamps | Zeitstempel |

Gültige Frist: `newDue || due || addDays(walk.date, settings.priorityDays[priority])`. Tage offen = max(0, Ende/Heute minus Rundgangsdatum). Überfällig, wenn Status nicht Erledigt und Heute > gültige Frist.

## Photo (`photos`, key `id`)

`id`, `defectId` (indexed FK), JPEG `blob`, `width`, `height`, `createdAt`.

## Inspection (`inspections`, key `id`)

`id`, `description`, `area`, `intervalMonths`, `lastInspection`, derived `nextDue`, `responsible`, `evidence`, `note`, timestamps. Initialdaten sind die 15 Vorschlagszeilen aus Excel `Prüftermine!B7:J21`. Status wird abgeleitet in dieser Priorität: Datum fehlt, Intervall fehlt, überfällig, bald fällig (<=30 Tage), ok.

## Settings (`settings`, key `id = 'app'`)

`areas`: Registerbereiche aus `Listen!A2:A12`, initial sieben gefüllte Werte. `priorityDays`: Kritisch 0, Hoch 2, Mittel 7, Niedrig 30. `maxIntervalDays`: 14. Gelb markierte Excel-Einstellungen sind änderbar.

## Abgeleitete Registerwerte

- Walk register: Nummernfolge, ISO-KW, Tage seit vorigem Walk, Intervall eingehalten/überschritten, Monatspunkte ja/nein, berechnete Dauer, Defektzahlen, Kritischzahlen, offene Zahlen, PDF-Dateiname.
- Dashboard: dieselben Rundgangswerte plus Mängel gesamt/offen/überfällig/kritisch-hoch/Nachkontrolle/erledigt, Gruppierung nach Bereich/Priorität, Prüfterminstatus.
- Monatswarnung: chronologisch erster Rundgang im Kalendermonat und `monthlyChecked === false`.
- Defect form key: Punkt x Bereich, z. B. `R4@qlabs`; Monatsfelder `M2@engineering`.

## Export

JSON-Backupversion wird auf 4 erhöht und enthält Tabellen plus Foto-Blobs als Data URL, einschliesslich historischer Inspection-Daten zur Backup-Kompatibilität. Der App-XLSX enthält nur Rundgänge und Mängel; periodische Prüftermine bleiben im separaten Excel.
