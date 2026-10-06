# Feature Specification: HSE-Rundgang App (SOP QPS_HSE_00064)

**Feature Branch**: `001-hse-rundgang`

**Created**: 2026-10-06

**Status**: Ready for planning

**Input**: User description: "SOP QPS_HSE_00064 'HSE Wöchentlicher Rundgang' als mobile Web-App: Der Prüfer geht mit Smartphone/Tablet durch den Betrieb, hakt Checklistenpunkte ab, erfasst Mängel mit Foto (Kamera), schliesst den Rundgang mit Unterschrift ab, exportiert den Bericht als PDF und verfolgt offene Mängel über mehrere Rundgänge."

**Quelle**: `docs/sop/QPS_HSE_00064_HSE_Rundgang_V1.0.docx` (Version 1.0, gültig ab 05.10.2026). Kapitelverweise "SOP 1" bis "SOP 5" beziehen sich auf dieses Dokument.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wochenrundgang durchführen und Checkliste abhaken (Priority: P1)

Die HSE-verantwortliche Person startet am Smartphone einen neuen Rundgang. Datum, Kalenderwoche und Uhrzeit sind vorbelegt, die App schlägt Wochen- oder Monatsrundgang vor. Sie geht die Rubriken der Reihe nach durch und bewertet jeden Punkt mit OK, Nicht OK oder N/A. Die Daten bleiben gespeichert, auch wenn die App geschlossen wird oder kein Netz vorhanden ist.

**Why this priority**: Ohne Erfassung der Checkliste gibt es keinen Rundgang. Allein dieser Teil ersetzt bereits das Ausfüllen der Word-Vorlage.

**Independent Test**: Neuen Rundgang anlegen, alle Punkte der Rubriken A, C, F bewerten, App neu laden: alle Eingaben sind noch vorhanden, Zähler stimmen.

**Acceptance Scenarios**:

1. **Given** heute ist Dienstag, 06.10.2026, und im Oktober existiert noch kein Rundgang, **When** ein neuer Rundgang angelegt wird, **Then** sind Datum 06.10.2026, KW 41 und die aktuelle Uhrzeit vorbelegt und "Monatsrundgang" ist vorgeschlagen.
2. **Given** im Oktober existiert bereits ein Rundgang, **When** ein weiterer angelegt wird, **Then** ist "Wochenrundgang" vorgeschlagen.
3. **Given** ein Wochenrundgang, **When** die Checkliste geöffnet wird, **Then** werden nur die Rubriken A, C, F und G angezeigt; bei Monatsrundgang A bis G und M.
4. **Given** ein Punkt ist bewertet, **When** die App neu geladen wird (auch offline), **Then** ist die Bewertung unverändert vorhanden.
5. **Given** jede Rubrik, **When** sie angezeigt wird, **Then** sind Rhythmus (wöchentlich/monatlich) und die rechtlichen Grundlagen (z. B. "VUV, ArGV 3, NIV, VKF") sichtbar.

---

### User Story 2 - Mangel mit Foto erfassen (Priority: P1)

Bei einem Punkt mit "Nicht OK" erfasst die Person direkt einen Mangel: Beschreibung der Gefahr, Massnahme, Verantwortliche/r, Priorität und Frist. Mit der Kamera des Geräts werden ein oder mehrere Fotos aufgenommen. Die Frist wird aus der Priorität vorgeschlagen.

**Why this priority**: Die Mängel mit Foto sind der eigentliche Nutzen des Rundgangs (SOP 2 verweist "Nicht OK" zwingend auf SOP 4).

**Independent Test**: Punkt A1 auf "Nicht OK" setzen, Mangel mit Prio H und einem Foto speichern; Mangel erscheint mit Nr. 1, Pkt. A1, Foto-Vorschau und Frist = Datum + 2 Tage.

**Acceptance Scenarios**:

1. **Given** ein Punkt wird auf "Nicht OK" gesetzt, **When** noch kein Mangel verknüpft ist, **Then** öffnet sich das Mängel-Formular mit vorbelegtem Pkt. (z. B. "A1").
2. **Given** das Mängel-Formular, **When** Prio K/H/M/N gewählt wird, **Then** wird die Frist auf Rundgangsdatum + 0 Tage / + 2 Tage / + 7 Tage / + 1 Monat gesetzt (überschreibbar).
3. **Given** ein Mobilgerät, **When** "Foto aufnehmen" gewählt wird, **Then** öffnet sich die Rückkamera; mehrere Fotos sind möglich; jedes Foto wird verkleinert gespeichert und als Vorschau angezeigt; einzelne Fotos lassen sich entfernen.
4. **Given** ein gespeicherter Mangel, **When** die Checkliste angezeigt wird, **Then** zeigt der Punkt die Mangel-Nr. an (SOP 2, Spalte "Mangel-Nr.").
5. **Given** ein Punkt "Nicht OK" ohne verknüpften Mangel, **When** der Rundgang abgeschlossen werden soll, **Then** wird der Abschluss verhindert und der Punkt benannt.

---

### User Story 3 - Rundgang abschliessen, unterschreiben und als PDF exportieren (Priority: P1)

Am Ende sieht die Person die Zusammenfassung (Kontrolliert / OK / Nicht OK / N/A), übernimmt oder ändert das vorgeschlagene Gesamtergebnis, unterschreibt am Bildschirm und schliesst den Rundgang ab. Danach wird der Bericht als PDF mit Fotos erzeugt (Dateiname `HSE-Rundgang_2026-KW41.pdf`).

**Why this priority**: Der PDF-Bericht ist die geforderte Ablage gemäss SOP 5.

**Independent Test**: Rundgang mit einem Mangel abschliessen, PDF herunterladen: enthält Kopf (QPS_HSE_00064, Version 1.0, Gültig ab 05.10.2026), Kapitel 1 bis 4, Unterschrift und Foto.

**Acceptance Scenarios**:

1. **Given** Bewertungen erfasst, **When** die Abschlussseite geöffnet wird, **Then** stimmen die Zähler mit der Checkliste überein (Kontrolliert = OK + Nicht OK + N/A der angezeigten Punkte).
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

1. **Given** offene Mängel aus früheren Rundgängen, **When** ein neuer Rundgang angelegt wird, **Then** werden sie in Kapitel 1 unter "Offene Punkte Vorwoche" aufgelistet (Herkunft KW, Pkt., Mangel, Frist, Prio).
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
- Rundgangsart wird nachträglich von Monat auf Woche geändert, obwohl Punkte aus B/D/E/M bewertet sind: diese Bewertungen bleiben gespeichert, werden aber nicht angezeigt, nicht gezählt und nicht exportiert; die App weist vor dem Wechsel darauf hin.
- Ein Punkt wird von "Nicht OK" auf "OK" geändert, obwohl ein Mangel verknüpft ist: der Mangel bleibt bestehen (kein stilles Löschen); Hinweis an der Person.
- Mangel ohne Checklistenbezug (z. B. aus G "Weitere Beobachtungen"): Pkt. "G1" oder frei wählbar.
- Sehr grosse Fotos (z. B. 12 MP): werden vor dem Speichern auf max. 1600 px längste Kante verkleinert; nicht lesbare Dateien erzeugen eine Fehlermeldung beim Feld.
- Speicher voll / Browser löscht Daten: Hinweis auf regelmässige JSON-Sicherung auf der Startseite (letzte Sicherung anzeigen).
- Zwei Rundgänge in derselben KW: zulässig; Dateiname erhält Suffix `_2`.

## Requirements *(mandatory)*

### Functional Requirements

**Rundgangdaten (SOP 1)**

- **FR-001**: Nutzer MÜSSEN einen neuen Rundgang anlegen können mit den Feldern Datum, Kalenderwoche, Durchgeführt von, Uhrzeit, Begleitperson, Bereich, Rundgangsart und Offene Punkte Vorwoche. *(SOP 1)*
- **FR-002**: Das System MUSS Datum und Uhrzeit mit dem aktuellen Zeitpunkt vorbelegen und die Kalenderwoche nach ISO 8601 aus dem Datum berechnen. *(SOP 1)*
- **FR-003**: Das System MUSS "Monatsrundgang" vorschlagen, wenn im Kalendermonat des Datums noch kein anderer Rundgang existiert, sonst "Wochenrundgang". Die Person kann den Vorschlag ändern. *(SOP 1, SOP 2 "Rhythmus")*
- **FR-004**: Das System MUSS den Namen der durchführenden Person vom letzten Rundgang vorschlagen.
- **FR-005**: Das System MUSS offene Mängel früherer Rundgänge im Feld "Offene Punkte Vorwoche" auflisten und eine Freitext-Ergänzung erlauben. *(SOP 1, SOP 4 Nachkontrolle)*

**Checkliste (SOP 2)**

- **FR-010**: Das System MUSS die Checkliste aus einer einzigen versionierten Definition laden: A1 bis A16, B1 bis B3, C1 bis C5, D1 bis D2, E1 bis E3, F1 bis F6, G1 (Freitext), M1 bis M12, jeweils mit Titel, Rhythmus und Rechtsgrundlagen gemäss SOP. *(SOP 2)*
- **FR-011**: Das System MUSS bei Wochenrundgang die Rubriken A, C, F, G und bei Monatsrundgang zusätzlich B, D, E und M anzeigen. *(SOP 1, SOP 2)*
- **FR-012**: Nutzer MÜSSEN jeden Punkt mit genau einer Bewertung OK, Nicht OK oder N/A versehen und die Bewertung zurücksetzen können. *(SOP 2 "Bewertung")*
- **FR-013**: Das System MUSS bei "Nicht OK" die Erfassung eines Mangels anbieten und die verknüpften Mangel-Nr. am Punkt anzeigen. *(SOP 2 "Mangel-Nr.")*
- **FR-014**: Das System MUSS den Fortschritt je Rubrik und gesamt anzeigen (bewertet / gesamt).
- **FR-015**: Nutzer MÜSSEN unter G "Weitere Beobachtungen" Freitext erfassen können. *(SOP 2, Rubrik G)*
- **FR-016**: Bewertungsknöpfe MÜSSEN mindestens 44 px hohe Touch-Ziele haben und ohne Hover bedienbar sein.

**Ergebnis und Abschluss (SOP 3)**

- **FR-020**: Das System MUSS die Zähler Kontrolliert, OK, Nicht OK und N/A über alle angezeigten Punkte (ohne G1) berechnen. *(SOP 3)*
- **FR-021**: Nutzer MÜSSEN ein Gesamtergebnis wählen: Ohne Beanstandung, Geringfügige Mängel, Offene Massnahmen, Kritischer Mangel. *(SOP 3)*
- **FR-022**: Das System MUSS ein Gesamtergebnis vorschlagen: keine Mängel = Ohne Beanstandung; mindestens ein Mangel Prio K = Kritischer Mangel; sonst mindestens ein offener Mangel Prio H = Offene Massnahmen; sonst Geringfügige Mängel.
- **FR-023**: Nutzer MÜSSEN als Durchführende/r mit Name, Datum und Unterschrift (Zeichnen auf dem Bildschirm) unterschreiben; eine Kenntnisnahme (Name, Datum, Unterschrift) ist optional. *(SOP 3)*
- **FR-024**: Das System MUSS den Abschluss verhindern, solange angezeigte Punkte unbewertet sind, ein "Nicht OK" keinen Mangel hat, Pflichtfelder eines Mangels fehlen oder Name/Unterschrift der durchführenden Person fehlen, und die Gründe auflisten.
- **FR-025**: Abgeschlossene Rundgänge MÜSSEN für Kapitel 1 bis 3 und die Mangelinhalte schreibgeschützt sein; der Abschlusszeitpunkt wird gespeichert.

**Mängel und Massnahmen (SOP 4)**

- **FR-030**: Nutzer MÜSSEN Mängel erfassen mit Nr. (automatisch fortlaufend je Rundgang), Pkt. (Checklistenbezug), Mangel/Gefahr, Massnahme, Verantwortlich, Frist, Prio (K, H, M, N) und Fotos. Pflicht: Pkt., Mangel/Gefahr, Prio. *(SOP 4)*
- **FR-031**: Das System MUSS die Frist aus der Prio vorschlagen: K = Rundgangsdatum (sofort), H = + 2 Tage (48 Std.), M = + 7 Tage, N = + 1 Monat. Die Frist ist überschreibbar. *(SOP 4 "Prio")*
- **FR-032**: Nutzer MÜSSEN pro Mangel Fotos mit der Gerätekamera aufnehmen oder aus der Galerie wählen können (mehrere pro Mangel). *(SOP 4 "Foto")*
- **FR-033**: Das System MUSS Fotos vor dem Speichern auf höchstens 1600 px längste Kante verkleinern und als JPEG komprimiert lokal speichern; Vorschau und Löschen einzelner Fotos MÜSSEN möglich sein.
- **FR-034**: Nutzer MÜSSEN Mängel bearbeiten und (nur im Entwurf) löschen können.

**Nachkontrolle (SOP 4, SOP 5)**

- **FR-040**: Jeder Mangel MUSS einen Status "offen" oder "erledigt" haben; beim Erledigen werden Datum und optional Vermerk gespeichert. Dies ist auch bei abgeschlossenen Rundgängen möglich.
- **FR-041**: Das System MUSS ein Mängelregister über alle Rundgänge bieten, filterbar nach offen / erledigt / alle, mit Hervorhebung überfälliger Fristen.
- **FR-042**: Das System MUSS das Mängelregister als CSV (Semikolon, UTF-8 mit BOM, Excel-kompatibel) exportieren.

**Dokumentenlenkung und Export (SOP 5)**

- **FR-050**: Das System MUSS einen PDF-Bericht erzeugen mit Kopf (Dokumenten ID QPS_HSE_00064, Titel, Version 1.0, Gültig ab 05.10.2026), Kapitel 1 Rundgangdaten, Kapitel 2 Checkliste mit Bewertungen und Mangel-Nr., Kapitel 3 Zähler, Ergebnis und Unterschriften, Kapitel 4 Mängel mit Fotos. *(SOP 5 "Ablauf" Schritt 3)*
- **FR-051**: Der Dateiname MUSS `HSE-Rundgang_JJJJ-KWxx.pdf` lauten (KW zweistellig). *(SOP 5)*
- **FR-052**: Das System MUSS alle Daten inklusive Fotos als JSON-Datei exportieren und wieder importieren können.
- **FR-053**: Jede Seite MUSS im Kopf Dokumenten ID, Version und Gültigkeitsdatum der SOP anzeigen.
- **FR-054**: Jeder Rundgang MUSS die SOP-Version speichern, mit der er erstellt wurde.

**Betrieb**

- **FR-060**: Die App MUSS nach dem ersten Aufruf offline nutzbar und auf dem Startbildschirm installierbar sein.
- **FR-061**: Alle Eingaben MÜSSEN ohne expliziten Speichern-Knopf automatisch lokal gespeichert werden.
- **FR-062**: Die Oberfläche MUSS Deutsch (Schweizer Schreibweise) sein.

### Key Entities

- **Rundgang**: Ein Durchgang gemäss SOP. Rundgangdaten (SOP 1), Bewertungen je Checklistenpunkt, Beobachtungen (G1), Ergebnis, Unterschriften, Status Entwurf/Abgeschlossen, SOP-Version, Zeitstempel.
- **Bewertung**: Zuordnung Checklistenpunkt zu OK / Nicht OK / N/A innerhalb eines Rundgangs.
- **Mangel**: Gehört zu einem Rundgang; Nr., Pkt., Mangel/Gefahr, Massnahme, Verantwortlich, Frist, Prio, Status, Erledigt-Datum, Vermerk.
- **Foto**: Gehört zu einem Mangel; verkleinertes Bild, Abmessungen, Aufnahmezeitpunkt.
- **Checklisten-Definition**: Statische, versionierte Beschreibung der Rubriken und Punkte aus der SOP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Wochenrundgang ohne Mängel (27 bewertbare Punkte plus G1) lässt sich am Smartphone in unter 10 Minuten reiner Bedienzeit erfassen und abschliessen.
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
