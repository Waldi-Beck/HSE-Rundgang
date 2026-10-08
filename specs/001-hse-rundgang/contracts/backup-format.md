# Contracts: Backup and Excel Export

## JSON backup

Filename: `hse-rundgang-backup_YYYY-MM-DD.json`.

```json
{
  "format": "qps-hse-rundgang-backup",
  "formatVersion": 4,
  "exportedAt": "2026-10-08T14:03:00.000Z",
  "sop": { "docId": "QPS_HSE_00064", "version": "1.0" },
  "walks": [],
  "defects": [],
  "photos": [],
  "inspections": [],
  "settings": []
}
```

- Import rejects format versions 1-3 with a clear upgrade/re-export message and rejects future versions.
- Import validates walks, monthly ratings, defect statuses and inspection settings.
- Same-ID round upsert preserves local immutable `docNr`; a conflicting different ID is skipped with dependent defect/photo rows and reported.
- All included photos are data URLs. Import result reports per-entity counts and conflicts.

## XLSX register export

Filename: `HSE-Rundgang_Register_YYYY-MM-DD.xlsx`; worksheets are named exactly `Rundgänge`, `Mängel`, `Prüftermine`.

### Rundgänge columns (same order as source workbook A:Q)

`Nr.; Datum; KW; Tage seit letztem; Intervall; Monatspunkte 2.2 geprüft; Beginn; Ende; Dauer; Durchgeführt von; Begleitperson; Mängel erfasst; davon kritisch; davon noch offen; Gesamtbewertung; Ablage (PDF-Datei); Bemerkung`

### Mängel columns (same order as source workbook A:W)

`Mangel-ID; Datum; KW; Nr. im Formular; Bereich; Kontrollpunkt; Beschreibung des Mangels; Festgestellte Gefahr; Priorität; Sofortmassnahme; Massnahme; Verantwortlich; Frist; Status; Erledigt am; Nachkontrolle am; Kontrolliert von; Mangel behoben?; Neuer Termin (bei Nein); Gültige Frist; Tage offen; Überfällig; Bemerkung`

### Prüftermine columns (same order as source workbook A:J)

`Nr.; Prüfung; Bereich; Intervall (Monate); Letzte Prüfung; Nächste Fälligkeit; Status; Verantwortlich; Nachweis / Ablage; Bemerkung`

The export preserves each sheet's listed column ordering. Computed fields are exported with their current calculated values; source rows and formulas remain unchanged.
