# Changelog

## Unveröffentlicht: Neues Formular und Register als Excel-Ersatz

- Aktuelles Formular aus der bereitgestellten DOTX: R1-R15 in fünf Räumen, optionale Monatspunkte M1-M9, Beginn/Ende/Dauer, Monatsprüfungskennzeichen und automatische Übernahme offener Mängel.
- Mängelerfassung mit Mangel-ID, Beschreibung/Gefahr, Sofortmassnahme, Massnahme, Verantwortlich, Priorität/Richtfrist, Foto sowie Register-Nachkontrolle.
- Neues Übersichtsblatt und Registeransichten für Rundgänge und Mängel mit konfigurierbaren Listenwerten.
- XLSX-Export mit Rundgang- und Mängelspalten; JSON-Backup auf Formatversion 4 erweitert.
- PDF-Layout an die neue Formularvorlage angepasst. Dokumenten-ID QPS_HSE_00064, Version 1.0 und Gültig ab 05.10.2026 bleiben unverändert.
- Prüftermine aus App-Register und XLSX-Export entfernt; periodische Geräteprüfungen bleiben im separaten Excel-Register.

## 2026-10-08: Formular-Revision QPS_HSE_00064 (Matrix je Bereich)

Grundlage: korrigiertes Formular `docs/sop/QPS_HSE_00064_HSE_Rundgang_V1.0.docx` ("Erstversion vom 29.09.2026").
Kopfdaten unverändert: QPS_HSE_00064, Version 1.0, gültig ab 05.10.2026.

- Checkliste neu: **2.1 Wöchentlich** W1 bis W16, je Bereich bewertet (Gänge / Treppen, Engineering, QLabs, QMeasure,
  xTec Lager, xTec Werkstatt, 96 Felder); **2.2 Monatlich** M1 bis M9 mit Bereich. Rubriken A bis G, alte M1 bis M12 und G1 entfallen.
- Bewertung **OK / Mangel / n.a.** (vorher OK / Nicht OK / N/A).
- Checkliste Raum für Raum: Bereichs-Kacheln mit Fortschritt, "Rest OK" je Bereich, 2.2 als eigener Schritt, Grundlage je Punkt.
- Mängel mit Pflichtfeld **Bereich** (Kapitel 4 "Nr. / Pkt. / Bereich"); Register, CSV und "Offene Punkte Vorwoche" zeigen Punkt + Bereich.
- Kapitel 1 ohne Feld "Bereich"; Kapitel 3 mit "Anzahl Mängel" und "davon kritisch (K)".
- PDF-Bericht im Aufbau des neuen Formulars (Matrix mit ✓ / ✗ / –, Kapitel 5 mit Grundlagen je Kontrollpunkt).
- Dies war eine Zwischenrevision. Sie wurde durch den aktuellen DOTX-/Excel-Neuaufbau im Abschnitt „Unveröffentlicht“ ersetzt.

## 2026-10-06: Erstversion

HSE-Rundgang App nach SOP QPS_HSE_00064 V1.0 (Rubriken A bis G, M1 bis M12), PDF-Bericht im QPS-Vorlagenlayout.
