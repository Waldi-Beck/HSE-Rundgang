# Feature Specification: HSE-Rundgang App (SOP QPS_HSE_00064)

**Feature Branch**: `001-hse-rundgang`

**Created**: 2026-10-06

**Status**: Ready for planning

**Input**: User description: "SOP QPS_HSE_00064 'HSE Wöchentlicher Rundgang' als mobile Web-App: Der Prüfer geht mit Smartphone/Tablet durch den Betrieb, hakt Checklistenpunkte ab, erfasst Mängel mit Foto (Kamera), schliesst den Rundgang mit Unterschrift ab, exportiert den Bericht als PDF und verfolgt offene Mängel über mehrere Rundgänge."

**Quelle**: `docs/sop/QPS_HSE_00064_HSE_Rundgang_V1.0.docx` (Version 1.0, gültig ab 05.10.2026, Formular "Erstversion vom 29.09.2026"). Kapitelverweise "SOP 1" bis "SOP 5" beziehen sich auf dieses Dokument.

**Revision 2026-10-08**: Das korrigierte Formular ersetzt die Rubriken A bis G / M1 bis M12 durch die Matrix **2.1 Wöchentlich (W1 bis W16 je Bereich)** und **2.2 Monatlich (M1 bis M9)**, die Bewertung lautet OK / Mangel / n.a., jeder Mangel trägt Punkt **und** Bereich. Das Feld "Bereich" in Kapitel 1 entfällt. Geänderte Anforderungen sind mit *(rev. 2)* markiert, neue mit FR-017 bis FR-019, FR-026, FR-035, FR-055.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wochenrundgang durchführen und Checkliste abhaken (Priority: P1)

Die HSE-verantwortliche Person startet am Smartphone einen neuen Rundgang. Datum, Kalenderwoche und Uhrzeit sind vorbelegt, die App schlägt Wochen- oder Monatsrundgang vor. Sie geht Raum für Raum vor: Bereich wählen (z. B. QLabs), dann die 16 Punkte mit OK, Mangel oder n.a. bewerten; beim Monatsrundgang zusätzlich 2.2. Die Daten bleiben gespeichert, auch wenn die App geschlossen wird oder kein Netz vorhanden ist.

**Why this priority**: Ohne Erfassung der Checkliste gibt es keinen Rundgang. Allein dieser Teil ersetzt bereits das Ausfüllen der Word-Vorlage.

**Independent Test**: Neuen Rundgang anlegen, alle 96 Felder (16 Punkte × 6 Bereiche) bewerten, App neu laden: alle Eingaben sind noch vorhanden, Zähler stimmen.

**Acceptance Scenarios**:

1. **Given** heute ist Dienstag, 06.10.2026, und im Oktober existiert noch kein Rundgang, **When** ein neuer Rundgang angelegt wird, **Then** sind Datum 06.10.2026, KW 41 und die aktuelle Uhrzeit vorbelegt und "Monatsrundgang" ist vorgeschlagen.
2. **Given** im Oktober existiert bereits ein Rundgang, **When** ein weiterer angelegt wird, **Then** ist "Wochenrundgang" vorgeschlagen.
3. **Given** ein Wochenrundgang, **When** die Checkliste geöffnet wird, **Then** werden die 6 Bereiche mit Fortschritt (z. B. "QLabs 12/16") angezeigt; beim Monatsrundgang zusätzlich der Schritt "2.2 Monatlich".
4. **Given** ein Punkt ist bewertet, **When** die App neu geladen wird (auch offline), **Then** ist die Bewertung unverändert vorhanden.
5. **Given** jeder Punkt, **When** er angezeigt wird, **Then** ist seine Grundlage aus "Grundlagen je Kontrollpunkt" (SOP 5) klein und gedämpft sichtbar.

---

### User Story 2 - Mangel mit Foto erfassen (Priority: P1)

Bei einem Feld mit "Mangel" erfasst die Person direkt einen Mangel: Beschreibung der Gefahr, Massnahme, Verantwortliche/r, Priorität und Frist. Mit der Kamera des Geräts werden ein oder mehrere Fotos aufgenommen. Die Frist wird aus der Priorität vorgeschlagen.

**Why this priority**: Die Mängel mit Foto sind der eigentliche Nutzen des Rundgangs (SOP 2: "Mangel = in Kapitel 4 erfassen (Punkt + Bereich)").

**Independent Test**: In QLabs W4 auf "Mangel" setzen, Mangel mit Prio H und einem Foto speichern; Mangel erscheint mit Nr. 1, Pkt. W4, Bereich QLabs, Foto-Vorschau und Frist = Datum + 2 Tage.

**Acceptance Scenarios**:

1. **Given** ein Feld wird auf "Mangel" gesetzt, **When** noch kein Mangel zu Punkt und Bereich existiert, **Then** öffnet sich das Mängel-Formular mit vorbelegtem Pkt. und Bereich (z. B. "W4 / QLabs"); bei Monatspunkten wird der Bereich im Formular gewählt (6 Bereiche oder "Alle Bereiche / allgemein").
2. **Given** das Mängel-Formular, **When** Prio K/H/M/N gewählt wird, **Then** wird die Frist auf Rundgangsdatum + 0 Tage / + 2 Tage / + 7 Tage / + 1 Monat gesetzt (überschreibbar).
3. **Given** ein Mobilgerät, **When** "Foto aufnehmen" gewählt wird, **Then** öffnet sich die Rückkamera; mehrere Fotos sind möglich; jedes Foto wird verkleinert gespeichert und als Vorschau angezeigt; einzelne Fotos lassen sich entfernen.
4. **Given** ein gespeicherter Mangel, **When** die Checkliste angezeigt wird, **Then** zeigt das Feld die Mangel-Nr. an.
5. **Given** ein Feld "Mangel" ohne Mangel mit passendem Punkt und Bereich, **When** der Rundgang abgeschlossen werden soll, **Then** wird der Abschluss verhindert und der Punkt benannt.

---

### User Story 3 - Rundgang abschliessen, unterschreiben und als PDF exportieren (Priority: P1)

Am Ende sieht die Person "Anzahl Mängel" und "davon kritisch (K)", übernimmt oder ändert das vorgeschlagene Gesamtergebnis, unterschreibt am Bildschirm und schliesst den Rundgang ab. Danach wird der Bericht als PDF mit Fotos erzeugt (Dateiname `HSE-Rundgang_2026-KW41.pdf`).

**Why this priority**: Der PDF-Bericht ist die geforderte Ablage gemäss SOP 5.

**Independent Test**: Rundgang mit einem Mangel abschliessen, PDF herunterladen: enthält Kopf (QPS_HSE_00064, Version 1.0, Gültig ab 05.10.2026), Kapitel 1 bis 4, Unterschrift und Foto.

**Acceptance Scenarios**:

1. **Given** Mängel erfasst, **When** die Abschlussseite geöffnet wird, **Then** zeigt sie "Anzahl Mängel" (Einträge in Kapitel 4) und "davon kritisch (K)" sowie den Fortschritt (bewertete Felder).
2. **Given** Mängel mit Prio K, **When** das Ergebnis vorgeschlagen wird, **Then** lautet es "Kritischer Mangel" (Regeln siehe FR-022).
3. **Given** unbewertete Punkte, fehlender Name oder fehlende Unterschrift, **When** "Abschliessen" gedrückt wird, **Then** werden die fehlenden Angaben aufgelistet und der Abschluss verhindert.
4. **Given** ein abgeschlossener Rundgang, **When** er geöffnet wird, **Then** sind Kapitel 1 bis 3 schreibgeschützt.
5. **Given** ein Rundgang, **When** "PDF exportieren" gewählt wird, **Then** entsteht eine Datei `HSE-Rundgang_JJJJ-KWxx.pdf` mit allen Kapiteln und Fotos.

---

### User Story 4 - Offene Mängel über Rundgänge verfolgen (Nachkontrolle) (Priority: P2)

Mängel bleiben offen, bis sie als erledigt markiert werden. Beim nächsten Rundgang erscheinen alle offenen Mängel früherer Rundgänge unter "Offene Punkte Vorwoche" und können dort nachkontrolliert werden. Ein Mängelregister zeigt alle Mängel mit Filter und überfälligen Fristen. Dies ersetzt das bisherige Excel-Register für die Nachkontrolle.

**Why this priority**: Wichtig für die Wirksamkeit, aber der Rundgang selbst ist auch ohne möglich.

**Independent Test**: In Rundgang KW41 einen Mangel anlegen und abschliessen; Rundgang KW42 anlegen: Mangel erscheint unter "Offene Punkte Vorwoche"; als erledigt markieren: verschwindet aus der Liste, ist im Register als erledigt mit Datum sichtbar.

**Acceptance Scenarios**:

1. **Given** offene Mängel aus früheren Rundgängen, **When** ein neuer Rundgang angelegt wird, **Then** werden sie in Kapitel 1 unter "Offene Punkte Vorwoche" aufgelistet (Herkunft KW, Pkt., Bereich, Mangel, Frist, Prio).
2. **Given** ein offener Mangel, **When** er als erledigt markiert wird, **Then** werden Erledigt-Datum und optional ein Vermerk gespeichert, auch wenn der ursprüngliche Rundgang abgeschlossen ist.
3. **Given** ein offener Mangel mit Frist in der Vergangenheit, **When** das Register oder die Übersicht angezeigt wird, **Then** ist er als "überfällig" hervorgehoben.
4. **Given** das Register, **When** es exportiert wird, **Then** entsteht eine CSV-Datei (Excel-kompatibel) mit allen Mängeln.

---

### User Story 5 - Übersicht und Datensicherung (Priority: P3)

Die Startseite zeigt die letzten Rundgänge (Entwurf/abgeschlossen), Kennzahlen zu offenen und überfälligen Mängeln und einen Hinweis, ob in dieser Woche schon ein Rundgang erfolgt ist. Alle Daten inklusive Fotos können als JSON-Datei gesichert und auf einem anderen Gerät wieder eingelesen werden.

**Why this priority**: Komfort und Sicherheit gegen Datenverlust; Kernablauf funktioniert auch ohne.

**Independent Test**: Zwei Rundgänge anlegen, JSON exportieren, Browserdaten löschen, JSON importieren: beide Rundgänge inklusive Fotos sind wieder vorhanden.

**Acceptance Scenarios**:

1. **Given** gespeicherte Rundgänge, **When** die Startseite geöffnet wird, **Then** sind sie nach Datum absteigend mit KW, Art, Status und Anzahl Mängel gelistet.
2. **Given** keine Rundgänge, **When** die Startseite geöffnet wird, **Then** erklärt ein Leerzustand, wie ein Rundgang gestartet wird.
3. **Given** eine Sicherungsdatei, **When** sie importiert wird, **Then** werden Einträge mit gleicher ID ersetzt, andere ergänzt, und die Anzahl importierter Einträge wird gemeldet.

### Edge Cases

- Datum um den Jahreswechsel: KW nach ISO 8601 (z. B. 31.12.2026 = 2026-KW53, 01.01.2027 = 2026-KW53); Dateiname nutzt das ISO-Wochenjahr.
- Rundgangsart wird nachträglich von Monat auf Woche geändert, obwohl Punkte aus 2.2 bewertet sind: diese Bewertungen bleiben gespeichert, werden aber nicht angezeigt, nicht gezählt und nicht exportiert; die App weist vor dem Wechsel darauf hin.
- Ein Feld wird von "Mangel" auf "OK" geändert, obwohl ein Mangel verknüpft ist: der Mangel bleibt bestehen (kein stilles Löschen); Hinweis an der Person.
- Mangel zu einem Monatspunkt, der nicht an einen Raum gebunden ist (z. B. M5 Alarmplan): Bereich "Alle Bereiche / allgemein". Wochenpunkte verlangen einen der 6 Bereiche.
- Datenbank aus der Vorversion (Rubriken A bis G): wird beim Update verworfen (App war nicht produktiv); alte JSON-Sicherungen werden mit Meldung abgewiesen.
- Sehr grosse Fotos (z. B. 12 MP): werden vor dem Speichern auf max. 1600 px längste Kante verkleinert; nicht lesbare Dateien erzeugen eine Fehlermeldung beim Feld.
- Speicher voll / Browser löscht Daten: Hinweis auf regelmässige JSON-Sicherung auf der Startseite (letzte Sicherung anzeigen).
- Zwei Rundgänge in derselben KW: zulässig; Dateiname erhält Suffix `_2`.

## Requirements *(mandatory)*

### Functional Requirements

**Rundgangdaten (SOP 1)**

- **FR-001** *(rev. 2)*: Nutzer MÜSSEN einen neuen Rundgang anlegen können mit den Feldern Datum, Kalenderwoche, Durchgeführt von, Uhrzeit, Begleitperson, Rundgangsart ("Wochenrundgang (2.1)" / "Monatsrundgang (2.1 + 2.2)") und Offene Punkte Vorwoche. Ein Feld "Bereich" gibt es nicht mehr. *(SOP 1)*
- **FR-002**: Das System MUSS Datum und Uhrzeit mit dem aktuellen Zeitpunkt vorbelegen und die Kalenderwoche nach ISO 8601 aus dem Datum berechnen. *(SOP 1)*
- **FR-003**: Das System MUSS "Monatsrundgang" vorschlagen, wenn im Kalendermonat des Datums noch kein anderer Rundgang existiert, sonst "Wochenrundgang". Die Person kann den Vorschlag ändern. *(SOP 1, SOP 2 "Rhythmus")*
- **FR-004**: Das System MUSS den Namen der durchführenden Person vom letzten Rundgang vorschlagen.
- **FR-005** *(rev. 2)*: Das System MUSS offene Mängel früherer Rundgänge im Feld "Offene Punkte Vorwoche" mit Punkt und Bereich auflisten und eine Freitext-Ergänzung erlauben. *(SOP 1, SOP 4 Nachkontrolle)*

**Checkliste (SOP 2)**

- **FR-010** *(rev. 2)*: Das System MUSS die Checkliste aus einer einzigen versionierten Definition laden: 6 Bereiche (Gänge / Treppen, Engineering, QLabs, QMeasure, xTec Lager, xTec Werkstatt), W1 bis W16 (2.1) und M1 bis M9 (2.2), jeweils im Wortlaut des Formulars. *(SOP 2.1, 2.2)*
- **FR-011** *(rev. 2)*: Beim Wochenrundgang MUSS jeder Punkt W1 bis W16 je Bereich bewertet werden (96 Felder); beim Monatsrundgang zusätzlich M1 bis M9 (105 Felder). *(SOP 1 Rundgangsart, SOP 2)*
- **FR-012** *(rev. 2)*: Nutzer MÜSSEN jedes Feld mit genau einer Bewertung OK, Mangel oder n.a. versehen und die Bewertung zurücksetzen können. *(SOP 2 "Bewertung")*
- **FR-013** *(rev. 2)*: Das System MUSS bei "Mangel" das Mängel-Formular mit Punkt und (bei Wochenpunkten) Bereich vorbelegt öffnen und die verknüpften Mangel-Nr. am Feld anzeigen. *(SOP 2 "Mangel = in Kapitel 4 erfassen (Punkt + Bereich)")*
- **FR-014** *(rev. 2)*: Das System MUSS den Fortschritt je Bereich (z. B. "QLabs 12/16") und gesamt anzeigen.
- **FR-015** *(entfällt)*: Freitext G "Weitere Beobachtungen" ist im Formular nicht mehr vorhanden.
- **FR-017**: Die Checkliste MUSS Raum für Raum bedienbar sein: Bereich wählen, dann die 16 Punkte bewerten; 2.2 Monatlich ist ein eigener Schritt. Je Bereich gibt es "Restliche Punkte auf OK setzen". *(SOP 5 Ablauf "Raum für Raum prüfen")*
- **FR-018**: Zu jedem Punkt MUSS die Grundlage aus "Grundlagen je Kontrollpunkt" angezeigt werden; jeder Punkt ist genau einer Zeile zugeordnet. *(SOP 5 Grundlagen)*
- **FR-019**: Das System MUSS den Monatsteil 2.2 beim ersten Rundgang im Monat vorschlagen (siehe FR-003). *(SOP 2.2)*
- **FR-016**: Bewertungsknöpfe MÜSSEN mindestens 44 px hohe Touch-Ziele haben und ohne Hover bedienbar sein.

**Ergebnis und Abschluss (SOP 3)**

- **FR-020** *(rev. 2)*: Das System MUSS "Anzahl Mängel" (Einträge in Kapitel 4) und "davon kritisch (K)" (Prio K) anzeigen; der Fortschritt (bewertete Felder) wird zusätzlich angezeigt. *(SOP 3)*
- **FR-021**: Nutzer MÜSSEN ein Gesamtergebnis wählen: Ohne Beanstandung, Geringfügige Mängel, Offene Massnahmen, Kritischer Mangel. *(SOP 3)*
- **FR-022**: Das System MUSS ein Gesamtergebnis vorschlagen: keine Mängel = Ohne Beanstandung; mindestens ein Mangel Prio K = Kritischer Mangel; sonst mindestens ein offener Mangel Prio H = Offene Massnahmen; sonst Geringfügige Mängel.
- **FR-023**: Nutzer MÜSSEN als Durchführende/r mit Name, Datum und Unterschrift (Zeichnen auf dem Bildschirm) unterschreiben; eine Kenntnisnahme (Name, Datum, Unterschrift) ist optional. *(SOP 3)*
- **FR-024** *(rev. 2)*: Das System MUSS den Abschluss verhindern, solange Felder des Rundgangs unbewertet sind, ein Feld "Mangel" keinen Mangel mit gleichem Punkt und Bereich hat (Monatspunkt: gleicher Punkt), Pflichtfelder eines Mangels fehlen oder Name/Unterschrift der durchführenden Person fehlen, und die Gründe auflisten.
- **FR-026**: Rundgänge und Sicherungen im alten Aufbau (Rubriken A bis G) MÜSSEN beim Update verworfen bzw. beim Import mit verständlicher Meldung abgewiesen werden, ohne Absturz.
- **FR-025**: Abgeschlossene Rundgänge MÜSSEN für Kapitel 1 bis 3 und die Mangelinhalte schreibgeschützt sein; der Abschlusszeitpunkt wird gespeichert.

**Mängel und Massnahmen (SOP 4)**

- **FR-030** *(rev. 2)*: Nutzer MÜSSEN Mängel erfassen mit Nr. (automatisch fortlaufend je Rundgang), Pkt., Bereich, Mangel/Gefahr, Massnahme, Verantwortlich, Frist, Prio (K, H, M, N) und Fotos. Pflicht: Pkt., Bereich, Mangel/Gefahr, Prio. *(SOP 4 "Nr. / Pkt. / Bereich")*
- **FR-035**: Der Bereich eines Mangels MUSS bei Wochenpunkten einer der 6 Bereiche sein, bei Monatspunkten einer der 6 Bereiche oder "Alle Bereiche / allgemein". *(SOP 2.2 Spalte "Bereich", SOP 4)*
- **FR-031**: Das System MUSS die Frist aus der Prio vorschlagen: K = Rundgangsdatum (sofort), H = + 2 Tage (48 Std.), M = + 7 Tage, N = + 1 Monat. Die Frist ist überschreibbar. *(SOP 4 "Prio")*
- **FR-032**: Nutzer MÜSSEN pro Mangel Fotos mit der Gerätekamera aufnehmen oder aus der Galerie wählen können (mehrere pro Mangel). *(SOP 4 "Foto")*
- **FR-033**: Das System MUSS Fotos vor dem Speichern auf höchstens 1600 px längste Kante verkleinern und als JPEG komprimiert lokal speichern; Vorschau und Löschen einzelner Fotos MÜSSEN möglich sein.
- **FR-034**: Nutzer MÜSSEN Mängel bearbeiten und (nur im Entwurf) löschen können.

**Nachkontrolle (SOP 4, SOP 5)**

- **FR-040**: Jeder Mangel MUSS einen Status "offen" oder "erledigt" haben; beim Erledigen werden Datum und optional Vermerk gespeichert. Dies ist auch bei abgeschlossenen Rundgängen möglich.
- **FR-041**: Das System MUSS ein Mängelregister über alle Rundgänge bieten, filterbar nach offen / erledigt / alle, mit Hervorhebung überfälliger Fristen.
- **FR-042** *(rev. 2)*: Das System MUSS das Mängelregister mit Spalte "Bereich" als CSV (Semikolon, UTF-8 mit BOM, Excel-kompatibel) exportieren.

**Dokumentenlenkung und Export (SOP 5)**

- **FR-050** *(rev. 2)*: Das System MUSS einen PDF-Bericht im Aufbau des Formulars erzeugen: Kopf (Dokumenten ID QPS_HSE_00064, Titel, Version 1.0, Gültig ab 05.10.2026; unverändert), Titel "HSE Wöchentlicher Rundgang" mit "Formular", Kapitel 1 Rundgangdaten, Kapitel 2 mit Bewertungslegende, Matrix 2.1 (✓ / ✗ / – als Vektorgrafik, "…" = unbewertet, Mangel-Nr. im Feld) und Tabelle 2.2 (OK / Mangel / n.a., Bereich), Kapitel 3 Anzahl Mängel / davon kritisch (K), Ergebnis, Unterschriften, Kapitel 4 Mängel mit Nr. / Pkt. / Bereich und Fotos, Kapitel 5 Ablauf, Nicht im Rundgang, Grundlagen je Kontrollpunkt, Hinweis, Genehmigung, Änderungsverzeichnis (wörtlich). *(SOP 1 bis 5)*
- **FR-051**: Der Dateiname MUSS `HSE-Rundgang_JJJJ-KWxx.pdf` lauten (KW zweistellig). *(SOP 5)*
- **FR-052** *(rev. 2)*: Das System MUSS alle Daten inklusive Fotos als JSON-Datei exportieren und wieder importieren können (Formatversion 2).
- **FR-055**: Platzhalter der Word-Vorlage im Kopf ("Dokumenten ID: QPS_Temp_000041", "Gültig ab: XXX") DÜRFEN NICHT in App oder PDF übernommen werden.
- **FR-053**: Jede Seite MUSS im Kopf Dokumenten ID, Version und Gültigkeitsdatum der SOP anzeigen.
- **FR-054**: Jeder Rundgang MUSS die SOP-Version speichern, mit der er erstellt wurde.

**Betrieb**

- **FR-060**: Die App MUSS nach dem ersten Aufruf offline nutzbar und auf dem Startbildschirm installierbar sein.
- **FR-061**: Alle Eingaben MÜSSEN ohne expliziten Speichern-Knopf automatisch lokal gespeichert werden.
- **FR-062**: Die Oberfläche MUSS Deutsch (Schweizer Schreibweise) sein.

### Key Entities

- **Rundgang**: Ein Durchgang gemäss SOP. Rundgangdaten (SOP 1), Bewertungen je Feld (Punkt × Bereich bzw. Monatspunkt), Ergebnis, Unterschriften, Status Entwurf/Abgeschlossen, SOP-Version, Zeitstempel.
- **Bewertung**: Zuordnung Feld (`W4@qlabs` bzw. `M1`) zu OK / Mangel / n.a. innerhalb eines Rundgangs.
- **Bereich**: Einer der 6 Räume der Matrix 2.1; für Mängel zu Monatspunkten zusätzlich "Alle Bereiche / allgemein".
- **Mangel**: Gehört zu einem Rundgang; Nr., Pkt., Bereich, Mangel/Gefahr, Massnahme, Verantwortlich, Frist, Prio, Status, Erledigt-Datum, Vermerk.
- **Foto**: Gehört zu einem Mangel; verkleinertes Bild, Abmessungen, Aufnahmezeitpunkt.
- **Checklisten-Definition**: Statische, versionierte Beschreibung der Bereiche, Punkte, Grundlagen und Formulartexte aus der SOP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Wochenrundgang ohne Mängel (96 Felder, mit "Rest OK" je Bereich) lässt sich am Smartphone in unter 10 Minuten reiner Bedienzeit erfassen und abschliessen.
- **SC-002**: Ein Mangel mit einem Foto ist in unter 60 Sekunden erfasst.
- **SC-003**: 100 % der Checklistenpunkte der SOP V1.0 sind in der App vorhanden (Abgleich Punkt für Punkt).
- **SC-004**: Ein Rundgang kann komplett ohne Netzverbindung erfasst, abgeschlossen und als PDF exportiert werden.
- **SC-005**: Ein Foto belegt nach dem Speichern höchstens ca. 600 KB.
- **SC-006**: Nach Export und Import auf einem anderen Gerät sind 100 % der Rundgänge, Mängel und Fotos vorhanden.

## Assumptions

- Eine Person führt den Rundgang auf einem Gerät durch; keine gleichzeitige Bearbeitung, keine Benutzerverwaltung in v1.
- Daten liegen lokal im Browser des Geräts; die Ablage des PDF-Berichts (z. B. Laufwerk/Odoo) erfolgt manuell wie bisher.
- Die Prüftermine Quartal/Jahr (SOP 5) bleiben im bisherigen Excel-Register; die App ersetzt dort nur die Mängel-Nachkontrolle.
- Die Bildschirm-Unterschrift dient der Dokumentation, nicht als qualifizierte elektronische Signatur nach ZertES.
- Regel für den Ergebnis-Vorschlag (FR-022) ist eine fachliche Annahme; die Person kann immer anders wählen.
- "Erster Rundgang im Monat" wird als "kein anderer Rundgang im selben Kalendermonat" interpretiert.
- "Anzahl Mängel" (SOP 3) zählt die Einträge in Kapitel 4 des Rundgangs, nicht die Felder mit "Mangel" (ein Eintrag je Punkt und Bereich).
- Beim Wochenrundgang zeigt das PDF unter 2.2 den Vermerk "Entfällt" statt einer leeren Tabelle; die Spalte "Foto (Feld anklicken)" heisst im PDF "Foto".
- Die Kopfdaten bleiben auf Anweisung des Erstellers unverändert (QPS_HSE_00064, Version 1.0, gültig ab 05.10.2026), obwohl das Änderungsverzeichnis "Erstversion vom 29.09.2026" nennt.
