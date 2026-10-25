# Feature Specification: Optionale KI-Fotoanalyse bei Mängeln

**Feature Branch**: `002-ki-fotoanalyse`
**Created**: 2026-10-21
**Status**: Draft
**Input**: Nutzerauftrag zur sicheren, optionalen Claude-Bildanalyse in der bestehenden HSE-Rundgang-App.

## User Scenarios & Testing

### User Story 1 – Sicheres, unverbindliches KI-Vorschlagen (Priority: P1)

Als prüfende Person möchte ich ein Mängelfoto optional durch Claude analysieren lassen, damit ich eine sachliche Mangelbeschreibung, mögliche Gefahren und STOP-Massnahmen als Ergänzung für meine eigene Beurteilung erhalte.

**Why this priority**: Sichere Vorschläge im Mängel-Formular sind der Kernnutzen; sie dürfen weder manuelle Erfassung blockieren noch Entscheidungen automatisch speichern.

**Independent Test**: Mit einem gemockten Worker eine Fotoanalyse durchführen, Vorschlagskarte anzeigen und feststellen, dass kein Mangel-Feld vor einer ausdrücklichen Übernahme verändert wird.

**Acceptance Scenarios**:

1. **Given** KI ist deaktiviert, **When** ein Foto angefügt wird, **Then** bleiben Foto- und manuelle Mängelerfassung wie bisher nutzbar und es erscheint keine Analyseaktion.
2. **Given** KI ist aktiviert, Einwilligung erteilt und Worker erreichbar, **When** ein Foto zur Analyse ausgewählt wird, **Then** werden Bild, Abteilungs-/Kontrollpunktkontext, Grundlagen, Prioritätsdefinitionen und optionaler Entwurfstext übertragen und die Antwort wird vor Anzeige strikt validiert.
3. **Given** ein gültiger Vorschlag wird angezeigt, **When** die prüfende Person einzelne Felder oder „Alles übernehmen“ bestätigt, **Then** werden nur die explizit ausgewählten Felder – einschliesslich einer konkreten sichtbaren Mangelbeschreibung – in den editierbaren Entwurf übernommen.
4. **Given** niedrige Sicherheit oder „kein Mangel erkannt“, **When** der Vorschlag angezeigt wird, **Then** wird ein deutlicher Hinweis ausgegeben; manuelle Eingabe bleibt möglich.

### User Story 2 – Datenschutz und sicherer Worker (Priority: P1)

Als App-Verantwortliche/r möchte ich, dass Anthropic-Zugangsdaten ausschliesslich im Worker liegen und nur legitimierte, begrenzte Anfragen verarbeitet werden.

**Independent Test**: Worker-Tests mocken den Anthropic-Aufruf und prüfen Authentisierung, CORS, Bild-/Tageslimit und dass Fehlerantworten niemals den Schlüssel enthalten.

**Acceptance Scenarios**:

1. **Given** eine Anfrage ohne gültigen Zugangscode, **When** der Worker sie erhält, **Then** antwortet er 401 und ruft Anthropic nicht auf.
2. **Given** eine Anfrage mit übergrossem Bild oder erreichtem Tageslimit, **When** sie den Worker erreicht, **Then** antwortet er verständlich mit 413 bzw. 429 ohne Anthropic-Aufruf.
3. **Given** eine gültige Anfrage, **When** der Worker Anthropic aufruft, **Then** stammen API-Schlüssel und Modellname ausschliesslich aus Worker-Secrets/Variablen und weder Bilder noch Schlüssel werden geloggt oder dauerhaft gespeichert.
4. **Given** unbekannter Origin, **When** die Anfrage erfolgt, **Then** werden CORS-Zugriff und Preflight nicht freigegeben.

### User Story 3 – Nachvollziehbare Übernahme und Berichte (Priority: P2)

Als prüfende Person möchte ich später erkennen können, dass KI verwendet wurde und was vorgeschlagen bzw. übernommen wurde.

**Independent Test**: KI-Vorschlag teilweise übernehmen, Mangel speichern, Backup-Rundlauf ausführen und PDF/XLSX/HTML-Register auf korrekte KI-Vermerke prüfen.

**Acceptance Scenarios**:

1. **Given** KI wurde zur Analyse verwendet, **When** der Mangel gespeichert wird, **Then** bleiben Zeitstempel, Modell, unveränderter Vorschlag und Übernahmeliste auf diesem Mangel nachvollziehbar.
2. **Given** ein KI-unterstützter Mangel, **When** PDF und Registerexport erstellt werden, **Then** ist „Mit KI-Unterstützung erstellt, durch [Name] geprüft“ bzw. die Spalte „KI-Unterstützung“ sichtbar.
3. **Given** bestehende Mängel oder ältere lokale Datensätze, **When** sie geöffnet oder exportiert werden, **Then** bleiben sie gültig und zeigen keinen KI-Vermerk.

### User Story 4 – Bewusste Aktivierung und Offline-Betrieb (Priority: P1)

Als Unternehmen möchte ich KI standardmässig deaktiviert lassen und vor der ersten Aktivierung über die externe Bildverarbeitung informieren.

**Independent Test**: Mit frischer Datenbank KI-Einstellungen öffnen; Einwilligung ablehnen und danach die bestehende manuelle/offline Mängelerfassung testen.

**Acceptance Scenarios**:

1. **Given** neue App-Einstellungen, **When** sie geladen werden, **Then** ist KI standardmässig aus.
2. **Given** KI wird erstmals eingeschaltet, **When** die Datenschutzhinweise nicht bestätigt werden, **Then** bleibt KI aus.
3. **Given** Worker nicht konfiguriert, Gerät offline oder Analysefehler, **When** ein Mangel erfasst wird, **Then** kann er weiterhin manuell bearbeitet und gespeichert werden.

### Edge Cases

- Browser offline, Worker nicht erreichbar, Timeout, ungültiger Zugangscode, Limit erreicht oder Anthropic-Fehler.
- Foto fehlt, falscher MIME-Typ, leere/zu grosse Bilddatei, nicht unterstütztes/defektes Bild.
- Anthropic antwortet mit fehlendem Tool-Aufruf, unerwartetem JSON, ungültigem Enum, zu langen Feldern oder unbekanntem Kontrollpunkt.
- Nutzende brechen native Eingabe/Analyse ab, schliessen Mängelblatt während eines Requests oder entfernen das analysierte Foto.
- Vorschlag teilweise übernommen, später manuell verändert oder wiederholt analysiert; Originalvorschlag bleibt unverändert.
- Bereits abgeschlossener Rundgang bleibt für neue KI-Analyse schreibgeschützt.
- Mehrere Geräte nutzen den Worker; Tageslimit muss über einen Cloudflare Durable Object/Rate-Limit-Binding oder einen explizit dokumentierten, dauerhaft konsistenten Mechanismus gelten, nicht nur über flüchtigen Worker-Speicher.

## Requirements

### Functional Requirements

- **FR-001**: KI MUSS optional und standardmässig deaktiviert sein; die bestehende App MUSS ohne Worker, API-Schlüssel, Netzwerk und Anthropic-Konto vollständig manuell und offline funktionieren.
- **FR-002**: Der Browser DARF keinen Anthropic-API-Schlüssel enthalten, empfangen, speichern oder protokollieren. Ausschliesslich der Worker verwendet `ANTHROPIC_API_KEY` und `CLAUDE_MODEL`.
- **FR-003**: Worker MUSS einen geheimen Zugangscode aus `ACCESS_CODE` konstantzeitnah vergleichen, CORS auf konfigurierte App-Origin(s) beschränken, Bildtyp/-grösse prüfen, Tageslimit pro Installation/Zugangscode erzwingen und keine Foto-/Schlüsselinhalte speichern oder loggen.
- **FR-004**: Die App MUSS Bilder vor Versand als JPEG auf höchstens 1568 px lange Kante verkleinern und pro Anfrage genau ein Foto senden.
- **FR-005**: Anfrage MUSS Foto, Abteilung, Kontrollpunkt (falls vorhanden), optionale Nutzereingabe, geltende Kontrollpunkt-Grundlage und Definitionen K/H/M/N enthalten.
- **FR-006**: Systemprompt MUSS Deutsch in Schweizer Schreibweise nutzen, nur visuell belegbare Beobachtungen erlauben, Unsicherheit/kein erkennbarer Mangel klar melden, Massnahmen nach STOP ordnen und Personen weder identifizieren noch beschreiben.
- **FR-007**: Worker MUSS Anthropic Messages API mit Tool-Use und geschlossenem Antwortschema verwenden; Browser MUSS Antwort mit Zod validieren.
- **FR-008**: Fotoanalyse-Ergebnis MUSS ausschliesslich Vorschläge darstellen. Kein Feld darf ohne ausdrückliche Einzel- oder „Alles übernehmen“-Aktion geändert werden.
- **FR-008a**: Ein mit KI unterstützter Mangel MUSS vor dem Speichern ausdrücklich als fachlich geprüft bestätigt werden; Review-Zeitpunkt und Name werden getrennt vom Analyse-Zeitpunkt gespeichert.
- **FR-009**: Vorschlagskarte MUSS die konkrete, vom Foto belegte Mangelbeschreibung getrennt von Gefahren/Folgen sowie Priorität samt Begründung, Sofortmassnahme, STOP-Massnahmen, passende Grundlage/Kontrollpunkt, Sicherheitsgrad und Hinweis darstellen.
- **FR-010**: Fehlermeldungen für Offline, Worker nicht erreichbar, falscher Code, Rate-Limit, ungültige/zu grosse Datei und ungültige KI-Antwort MÜSSEN auf Deutsch verständlich sein; manuelles Erfassen bleibt möglich.
- **FR-011**: Bei erster KI-Aktivierung MUSS eine nicht überspringbare Einwilligung zu Fotoübermittlung an Anthropic in die USA, Nicht-Speicherung/Nicht-Training gemäss Anthropic-Bedingungen, Vermeidung erkennbarer Personen/vertraulicher Unterlagen angezeigt werden; Datum/Zustimmung wird gespeichert.
- **FR-012**: KI-Nutzung MUSS pro Mangel persistiert werden: genutzt, Zeitpunkt, Modell, unveränderter validierter Vorschlag, übernommene Feldnamen und menschlicher Prüfende/r.
- **FR-013**: PDF MUSS pro KI-unterstütztem Mangel den Vermerk „Mit KI-Unterstützung erstellt, durch [Name] geprüft“ ausgeben; HTML-Register und XLSX erhalten „KI-Unterstützung“.
- **FR-014**: Datenbankmigration und Backup-Import/Export MÜSSEN alte Mängel und vorhandene Backups kompatibel behandeln; bestehende Felder/Funktionen dürfen nicht verloren gehen.
- **FR-015**: README MUSS Laienanleitung für `wrangler dev`, Cloudflare-Konto/Login, Secrets, Deployment, App-URL/Zugangscode sowie Anthropic-Datenschutzbedingungen enthalten. `server/.dev.vars.example` enthält ausschliesslich Platzhalter; `.dev.vars` und `.env` sind ignoriert.
- **FR-016**: `server/scripts/test-real.ts` MUSS ausschliesslich manuell laufen, echten Schlüssel nur aus lokaler `.dev.vars` lesen und kein Geheimnis ausgeben.

### Key Entities

- **KI-Einstellungen**: Aktivierung, Worker-URL, Zugangscode, optionale Einwilligung mit Datum.
- **Fotoanalyse-Vorschlag**: validierte Struktur inklusive Gefahren, Prio, STOP-Massnahmen, Kontrollpunkt, Sicherheit und Hinweis.
- **KI-Prüfspur**: verwendetes Modell, Zeit, unveränderter Vorschlag, übernommene Felder, Prüfende/r.
- **Analyseanfrage**: flüchtiger Bild-/Kontextinhalt; wird nicht persistent auf dem Server gespeichert.

## Success Criteria

- **SC-001**: 100 % der KI-Vorschläge bleiben unverändert in der UI, bis ein Mensch mindestens ein Feld explizit übernimmt.
- **SC-002**: Kein Test, Build-Artefakt, Worker-Antwort oder Browser-Bundle enthält `ANTHROPIC_API_KEY` oder echte Zugangsdaten.
- **SC-003**: Manuelles Erfassen/Speichern bleibt bei deaktivierter KI und ohne Netz vollständig verfügbar.
- **SC-004**: Sämtliche Tests für unauthorisierte/zu grosse/limitierte Workeranfragen weisen null Anthropic-Aufrufe nach.
- **SC-005**: Unit-, Worker-, E2E-, Typecheck- und Produktionsbuild laufen mit gemocktem Provider erfolgreich; automatisiert gibt es null echte API-Aufrufe.
- **SC-006**: PDF-/Registerausgabe erlaubt die Unterscheidung KI-unterstützter und nicht KI-unterstützter Mängel und zeigt Prüfvermerk.

## Assumptions

- Die App bleibt statisch gehostet (GitHub Pages) und erreicht einen separat bereitgestellten Cloudflare Worker über HTTPS.
- `@anthropic-ai/sdk` wird im Worker verwendet, `zod` im Frontend/Worker; der Worker darf Bilder nur im Arbeitsspeicher puffern.
- Der tägliche Grenzwert wird mit Cloudflare Durable Objects umgesetzt; keine lokalen Maps als vermeintlich globale Begrenzung.
- Der Zugangscode ist ein organisationsweiter geheimer Wert und wird Nutzenden ausserhalb des öffentlichen Repositories sicher mitgeteilt.
- Browser-`navigator.onLine` dient nur als hilfreicher Frühhinweis; tatsächliche Request-Fehler bleiben massgeblich.
- Nutzende prüfen alle KI-Vorschläge fachlich und sind für den finalen Eintrag verantwortlich.
