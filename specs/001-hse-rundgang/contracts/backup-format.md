# Contract: JSON-Sicherung und CSV-Register

## JSON-Sicherung (`hse-rundgang-backup_YYYY-MM-DD.json`)

```json
{
  "format": "qps-hse-rundgang-backup",
  "formatVersion": 1,
  "exportedAt": "2026-10-06T14:03:00.000Z",
  "sop": { "docId": "QPS_HSE_00064", "version": "1.0" },
  "walks":   [ /* Walk, siehe data-model.md */ ],
  "defects": [ /* Defect */ ],
  "photos":  [ { "id": "…", "defectId": "…", "width": 1600, "height": 1200, "createdAt": "…", "dataUrl": "data:image/jpeg;base64,…" } ]
}
```

Import-Regeln:
- `format` muss `qps-hse-rundgang-backup` sein, `formatVersion` <= 1, sonst Abbruch mit Meldung.
- Einträge werden per `id` eingefügt oder ersetzt (upsert); nichts wird gelöscht.
- Ergebnis: Anzahl importierter Rundgänge, Mängel, Fotos.

## CSV-Mängelregister (`HSE-Maengelregister_YYYY-MM-DD.csv`)

UTF-8 mit BOM, Trennzeichen `;`, Zeilenende CRLF. Spalten:

`Rundgang;Datum;Nr;Pkt;Mangel/Gefahr;Massnahme;Verantwortlich;Prio;Frist;Status;Erledigt am;Vermerk`

`Rundgang` = `2026-KW41`, `Status` = `offen` | `erledigt`.
