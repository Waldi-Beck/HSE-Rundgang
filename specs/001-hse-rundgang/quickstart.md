# Quickstart: HSE-Rundgang App

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm test             # Vitest (Fachlogik)
npm run build        # dist/
npm run test:e2e     # Playwright Smoke (baut und startet preview)
```

## Validierungsszenario (entspricht den Akzeptanzkriterien US1 bis US3)

1. Startseite: "Neuer Rundgang". Datum/KW/Uhrzeit vorbelegt, Art vorgeschlagen.
2. Name "Durchgeführt von" eintragen, "Weiter zur Checkliste".
3. A1 "Nicht OK" antippen: Mängel-Formular öffnet sich mit Pkt. A1.
4. Mangel beschreiben, Prio H: Frist = Datum + 2 Tage. Foto aufnehmen. Speichern.
5. Restliche Punkte bewerten ("Rubrik: alle OK" beschleunigt).
6. Tab "Abschluss": Zähler prüfen, Ergebnis-Vorschlag "Offene Massnahmen", unterschreiben, abschliessen.
7. "PDF" exportieren: Datei `HSE-Rundgang_2026-KW41.pdf`.
8. Neuer Rundgang: Mangel aus Schritt 4 unter "Offene Punkte Vorwoche".
