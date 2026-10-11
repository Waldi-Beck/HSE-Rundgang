# Feature Specification: HSE Rundgang App und Register

**Feature Branch**: `001-hse-rundgang`  
**Revision**: 2026-10-08, neues Formular und neues Excel-Register  
**Status**: Ready for implementation  
**Quelle**: Formularstand aus `QPS_HSE_00064_HSE_Rundgang_V1.0_Vorlage.dotx` und Register `HSE_Rundgang_Register.xlsx`. Das DOCX im Projekt enthält noch die ältere Formularfassung R1-R16/W1-W16; für den neuen Aufbau ist die bereitgestellte DOTX massgebend. Beide Quelldateien bleiben unverändert.

## Unveränderliche Dokumentenlenkung

- SOP-Dokumenten-ID: `QPS_HSE_00064`.
- Version: `1.0`.
- `SOP_META.validFrom`: `2026-10-05` (anzeigeformatiert `05.10.2026`).
- Dokumententitel: `HSE Rundgang`.
- Die Word-Vorlagenreste `QPS_Temp_000041` und `Gültig ab: XXX` werden nie in App, PDF oder Export ausgegeben.
- `HSE-RG-JJJJ-NNN` ist eine separate, unveränderliche Rundgangnummer.

## User Stories

### US1: Rundgang durchführen (P1)
Die prüfende Person erfasst am Mobilgerät einen Rundgang mit Datum, Beginn/Ende, Personen und vorgeschlagenen Monatspunkten. Sie prüft R1-R15 in einer gemeinsamen Matrix mit den drei Spalten QPS, QLabs und xTec; beim gesetzten Kästchen „2.2 geprüft“ bewertet sie zusätzlich M1-M9. Offene Mängel des letzten Rundgangs werden automatisch angezeigt.

**Unabhängiger Test**: Rundgang anlegen, in der Matrix alle 15 Punkte für QPS, QLabs und xTec bewerten, Monatspunkte aktivieren und bewerten, neu laden; Daten, Dauer und Fortschritt bleiben korrekt.

### US2: Mängel erfassen und nachkontrollieren (P1)
Bei „Mangel“ öffnet sich die Mängelerfassung mit Punkt und Bereich vorbelegt. Die Person dokumentiert Beschreibung, Gefahr, Sofortmassnahme, Massnahme, Priorität, Frist und Fotos. Später werden Status und Nachkontrolle im Register nachgeführt.

**Unabhängiger Test**: QLabs/R4 als Mangel bewerten, Foto erfassen, speichern, danach im Register Status und Nachkontrolle aktualisieren; Mangel-ID, gültige Frist und Tage offen stimmen.

### US3: Abschliessen und PDF ablegen (P1)
Die prüfende Person wählt eine Gesamtbewertung, zeichnet die Unterschrift und schliesst erst nach vollständiger Checkliste und erfassten Mängeln ab. Der Rundgang wird danach schreibgeschützt und als PDF im Formularlayout exportiert.

### US4: Rundgänge, Mängel und Prüftermine verwalten (P1)
Die App bietet Übersicht sowie Registeransichten für Rundgänge und Mängel. Periodische Geräte- und Wartungsprüfungen bleiben im separaten Excel-Register und werden nicht in der App geführt.

### US5: Daten austauschen (P2)
Alle App-Daten samt Fotos werden als versioniertes JSON gesichert und eingelesen. Registerdaten werden als XLSX mit den Excel-Blättern und deren Spaltenfolge exportiert.

## Akzeptanzszenarien

1. Beim ersten Rundgang im Monat ist „2.2 geprüft“ vorgeschlagen/aktiviert; die Person kann es ändern. Ein weiterer Rundgang im selben Monat wird mit Monatsprüfung als optional markiert.
2. 2.1 verlangt genau 45 Bewertungen: 15 Punkte mal drei Bereiche. M1-M9 werden nur verlangt, wenn „2.2 geprüft“ aktiviert ist.
3. Die Kalenderwoche folgt ISO 8601. Dauer wird aus Beginn und Ende berechnet, einschließlich eines möglichen Mitternachtsübergangs.
4. Jede Kontrollpunktzeile zeigt die wörtliche Grundlage aus dem Excel-Blatt „Grundlagen“.
5. Bei einem „Mangel“ in QLabs/R4 wird ein Defekt mit R4 und QLabs vorausgefüllt. Er erhält eine Mangel-ID aus Rundgangsdatum und Formularnummer.
6. Ein Mangel hat die Excel-Statuswerte „Offen“, „In Bearbeitung“, „Erledigt“ oder „Nachkontrolle erforderlich“. Bei nicht behobenem Mangel kann ein neuer Termin gesetzt werden.
7. Gültige Frist ist neuer Termin, sonst Frist, sonst Rundgangsdatum plus Richtfrist der Priorität (0/2/7/30 Tage). Überfälligkeit ist rot markiert.
8. Der erste Rundgang eines Monats ohne 2.2 wird im Rundgangregister orange markiert. Intervall über dem eingestellten Höchstwert wird als überschritten angezeigt.
9. Die XLSX-Datei enthält die Blätter „Rundgänge“ und „Mängel“ in der Spaltenfolge des Registers.
11. PDF-Kopf auf jeder Seite enthält Logo, unveränderte SOP-ID/Titel/Version/Gültig-ab-Angabe und separat die Rundgangnummer; Fusszeile „Seite x von y“.

## Funktionale Anforderungen

### Formular und Checkliste (Formular Kapitel 1 und 2, DOTX)
- **FR-001**: Rundgang anlegen mit Datum, Uhrzeit Beginn/Ende, berechneter Dauer, Durchgeführt von, Begleitperson, Monatspunkte-Kästchen, automatisch übernommenen offenen Punkten des letzten Rundgangs und Bemerkung. Kalenderwoche ist berechnet und nicht editierbar. *(Formular Kapitel 1; Excel-Blatt Rundgänge)*
- **FR-002**: Beim ersten Rundgang im Kalendermonat wird „2.2 geprüft“ standardmässig vorgeschlagen; für weitere Rundgänge bleibt die Auswahl änderbar. Ein erster Monatsrundgang ohne Prüfung muss sichtbar warnen. *(Formular Kapitel 1/2.2; Excel-Blätter Rundgänge und Übersicht)*
- **FR-003**: Die Checkliste zeigt R1-R15 als Tabellenmatrix mit genau drei Spalten (QPS, QLabs, xTec), insgesamt 45 getrennten Bewertungszellen. *(Referenz Kapitel 2.1)*
- **FR-004**: Jedes R-Feld erhält genau eine Bewertung OK, Mangel oder n.a.; die Bewertung lässt sich zurücksetzen. Die mobile UI bietet horizontal scrollbar dieselbe Matrix und je Bereich „Rest OK“. *(Referenz Kapitel 2, Bewertungslegende)*
- **FR-005**: M1-M9 sind nur verpflichtend, wenn „2.2 geprüft“ aktiviert ist. Jedes Monatspunktfeld enthält OK/Mangel/n.a. sowie einen der Registerbereiche. *(Formular Kapitel 2.2)*
- **FR-006**: Unter jedem R- und M-Punkt wird die zugehörige Grundlage wortgetreu aus dem Blatt „Grundlagen“ angezeigt. Jeder Punkt hat genau eine Zuordnung. *(Excel-Blatt Grundlagen)*
- **FR-007**: Beim Setzen auf Mangel wird die Mängelerfassung mit Punkt und Bereich vorbelegt; Monatspunkte verlangen eine Bereichsauswahl. *(Formular Kapitel 2 und Kapitel 3)*

### Mängel und Nachkontrolle (Formular Kapitel 3; Excel-Blatt Mängel)
- **FR-010**: Ein Mangel enthält Formularnummer, Punkt, Bereich, Beschreibung, festgestellte Gefahr, Sofortmassnahme, Massnahme, Verantwortlich, Frist, Priorität und ein oder mehrere Fotos. *(Formular Kapitel 3)*
- **FR-011**: Mangel-ID wird als `JJJJ-MM-TT-Mnn` aus Rundgangsdatum und Formularnummer dargestellt. Die interne Datenbank-ID bleibt stabil und separat. *(Excel-Blatt Mängel, Formel Spalte A)*
- **FR-012**: Prioritätsrichtfristen kommen aus Einstellungen: Kritisch 0, Hoch 2, Mittel 7, Niedrig 30 Tage. Gültige Frist folgt Vorrang neuer Termin, dann eingetragener Frist, sonst Datum plus Richtfrist. *(Excel-Blätter Listen und Mängel, Spalten I/M/S/T)*
- **FR-013**: Nachkontrolle speichert Status, Erledigt am, Nachkontrolle am, Kontrolliert von, Mangel behoben? und optional neuen Termin. Bei „Nein“ ist der neue Termin verpflichtend für die Fristberechnung. *(Excel-Blatt Mängel, Spalten N-S)*
- **FR-014**: Tage offen, gültige Frist und Überfälligkeitsstatus werden automatisch berechnet. Überfällige Mängel werden rot hervorgehoben. *(Excel-Blatt Mängel, Spalten T-V)*
- **FR-015**: Abgeschlossene Rundgänge sperren Formulardaten und Mangelbeschreibung; Registerfelder für Status/Nachkontrolle bleiben bearbeitbar. *(Formular Kapitel 4; Excel-Blatt Mängel)*

### Abschluss (Formular Kapitel 4)
- **FR-020**: Gesamtbewertung bietet exakt die vier Formularoptionen: ohne Beanstandung, mit geringfügigen Mängeln, mit offenen Massnahmen, kritische Mängel mit Sofortmassnahmen. Vorschlag folgt vorhandenen Prioritäten/Status. *(Formular Kapitel 4; Excel-Blätter Listen und Rundgänge)*
- **FR-021**: Abschluss erfordert sämtliche R-Punkte sowie, falls aktiviert, M-Punkte; alle Mängel müssen Pflichtfelder haben und jede Mangelbewertung muss einen passenden Datensatz besitzen. Durchführende/r muss unterschreiben; Kenntnisnahme bleibt optional. *(Formular Kapitel 4)*

### Register, Übersicht und Einstellungen (Excel)
- **FR-030**: Rundgangregister zeigt in Reihenfolge: Nr., Datum, KW, Tage seit letztem, Intervall, Monatspunkte 2.2 geprüft, Beginn, Ende, Dauer, Durchgeführt von, Begleitperson, Mängel erfasst, davon kritisch, davon noch offen, Gesamtbewertung, Ablage (PDF-Datei), Bemerkung. Berechnungen entsprechen Excel-Formeln. *(Excel-Blatt Rundgänge, Spalten A-Q)*
- **FR-031**: Mängelregister zeigt in Reihenfolge Mangel-ID, Datum, KW, Nr. im Formular, Bereich, Kontrollpunkt, Beschreibung, Gefahr, Priorität, Sofortmassnahme, Massnahme, Verantwortlich, Frist, Status, Erledigt am, Nachkontrolle am, Kontrolliert von, behoben?, neuer Termin, gültige Frist, Tage offen, überfällig, Bemerkung. *(Excel-Blatt Mängel, Spalten A-W)*
- **FR-032**: Übersicht zeigt Kennzahlen für Rundgänge, letzte/nächste Fälligkeit, Intervall, Monatspunkte und Mängelstatus/Priorität/Bereich. Fällige/überfällige Rundgänge werden deutlich markiert. *(Excel-Blatt Übersicht)*
- **FR-033**: Einstellungen enthalten bearbeitbare Bereiche, Prioritätsrichtfristen 0/2/7/30 und Höchstintervall 14 Tage als Startwerte. *(Excel-Blatt Listen, gelbe Eingabefelder)*

### Rundgangnummer, Datensicherung und Exporte
- **FR-040**: Jeder Rundgang erhält beim Erstellen eine unveränderliche `HSE-RG-JJJJ-NNN` Nummer. Jahreszähler sind persistent und werden nach Löschung nicht zurückgesetzt. *(SOP-Dokumentenlenkung, separate App-Kennung)*
- **FR-041**: Dexie erhält eine neue Schema-Version mit eindeutigem `docNr`-Index. Upgrade von Altversionen darf die App nicht abstürzen lassen; nicht abbildbare Testdaten dürfen verworfen werden. *(Betriebsanforderung)*
- **FR-042**: JSON-Backup exportiert Rundgänge, Mängel, Nachkontrolle, Einstellungen, Prüftermine und Fotos. Formatversion wird erhöht; ältere Formate werden mit klarer Meldung abgewiesen. *(Datensicherung)*
- **FR-043**: XLSX-Export enthält „Rundgänge“ und „Mängel“ in derselben Spaltenreihenfolge wie die Register; berechnete Werte werden mitexportiert. *(Excel-Blätter Rundgänge und Mängel)*
- **FR-044**: PDF wird im Layout der Referenz ausgegeben, mit 2.1-Matrix QPS/QLabs/QxTec, Textbewertungen OK/Mangel/n.a., Fotos und zusätzlichem Anhang. Dateiname und angezeigte PDF-Rundgang-Nr. sind `HSE-RG_JJJJ_MM_TT.pdf` / `HSE-RG_JJJJ_MM_TT`. Die interne Rundgang-ID bleibt unverändert. *(Formular Kapitel 1-4)*
- **FR-045**: Auf jeder PDF-Seite sind QPS-Logo, `QPS_HSE_00064`, Titel `HSE Rundgang`, Version `1.0`, Gültig ab `05.10.2026`, Rundgangnummer und „Seite x von y“ vorhanden. Vorlagenreste werden ausgeschlossen. *(DOTX Kopf/Fusszeile; SOP_META)*

### Betrieb und Bedienbarkeit
- **FR-050**: App bleibt offline-fähig, speichert lokal automatisch und bietet Lade-, Leer- und Fehlerzustände.
- **FR-051**: Touch-Ziele sind mindestens 44 px hoch, Formularlabels stehen über Feldern, UI ist Deutsch (Schweizer Schreibweise), mobil zuerst.
- **FR-052**: Unit-Tests prüfen R1-R15 × drei Bereiche und M1-M9 sowie Grundlagenzuordnung, Berechnungen, Status, Mangel-ID und Rundgangnummer.

## Erfolgskriterien

- **SC-001**: Vollständige 2.1-Prüfung enthält exakt 45 Bewertungsfelder.
- **SC-002**: Bei aktivierter Monatsprüfung sind genau 54 Felder vollständig erforderlich.
- **SC-003**: Dashboard- und Registerkennzahlen stimmen für Beispieldaten mit den Registerformeln überein.
- **SC-004**: XLSX-Export lässt sich mit den Blättern „Rundgänge“ und „Mängel“ öffnen und enthält die Registerspalten in gleicher Reihenfolge.
- **SC-005**: PDF mit wenigen Mängeln hat zwei Seiten; alle Seiten haben Kopf, Rundgangnummer und Fusszeile.
- **SC-006**: Offline-Rundgang, Fotoaufnahme, Abschluss und PDF-Export funktionieren ohne Backend.

## Annahmen

- Die neue DOTX-Datei und das neue Excel-Register sind die aktuellen Quellen; das vorhandene DOCX ist eine ältere Fassung und bleibt als historisches Original unangetastet.
- Der erste Monatsrundgang schlägt 2.2 vorausgewählt vor, die Person darf es abwählen.
- Intervall und Fristen werden als Kalendertage gerechnet; Monatsfälligkeiten der Prüftermine werden als Kalender-Monate berechnet.
- Testpersonen verwenden ausschliesslich Platzhalternamen wie „Max Muster“.
