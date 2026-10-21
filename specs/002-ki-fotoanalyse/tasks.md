# Tasks: Optionale KI-Fotoanalyse bei Mängeln

**Input**: `spec.md`, `plan.md`, `data-model.md`
**Tests**: ausdrücklich gefordert; keine automatisierten echten API-Aufrufe.

## Phase 1: Spezifikation und sichere Grundlage

- [x] T001 Feature-Spezifikation und Prioritäten in `specs/002-ki-fotoanalyse/spec.md` schreiben.
- [x] T002 Architektur- und Verfassungscheck in `specs/002-ki-fotoanalyse/plan.md` dokumentieren.
- [x] T003 Client-/Worker-Datenmodell und Datenschutzmigration in `specs/002-ki-fotoanalyse/data-model.md` definieren.
- [x] T004 Quickstart, Schnittstellenvertrag und lokale Testanleitung vervollständigen.
- [x] T005 Zod-/Anthropic-/Wrangler-Abhängigkeiten installieren und prüfen; Worker in isoliertem Unterprojekt halten.
- [x] T006 `.gitignore` für `.dev.vars`, `.env*` und Worker-Geheimnisse absichern; Platzhalterdatei anlegen.

## Phase 2: Worker und Protokoll (P1)

- [x] T010 [P] Strict Zod-Protokoll und Tool-Output-Schema in `server/src/schemas.ts` und `src/lib/ai-schema.ts` implementieren.
- [x] T011 Durable Object Tageslimit und Zugriffscode-Prüfung in `server/src/limiter.ts` implementieren.
- [x] T012 Worker CORS, Body-/JPEG-Limits, validierte Anfrage und sichere Fehler in `server/src/index.ts` implementieren.
- [x] T013 Anthropic Messages Tool-Use mit Claude-Modell aus Environment in `server/src/analysis.ts` implementieren; Bild/Text nicht loggen.
- [x] T014 [P] Worker-Tests: Auth, Origin, Limit, MIME/Grösse, Schemafehler, Anthropic-Mock, Schlüssel niemals in Antwort.
- [x] T015 Wrangler-Konfiguration und lokale `.dev.vars.example` sowie manuelles `server/scripts/test-real.ts` erstellen.

## Phase 3: Manuelle App-Einstellungen/Einwilligung (P1)

- [x] T020 Settings-Typ, Default AUS und Dexie Version 6 Migration in `src/lib/types.ts`, `src/data/register.ts`, `src/db.ts`.
- [x] T021 Einstellungen UI mit Schalter, URL, maskiertem Zugangscode, Einwilligungsdialog und gespeichertem Zeitstempel in `src/pages/SettingsPage.tsx`.
- [x] T022 Export/Backup-Policy implementieren: keine Zugangscodes in JSON, KI-Metadaten erhalten.
- [x] T023 Settings-/Migration-/Einwilligungs-Unit-Tests ergänzen.

## Phase 4: Vorschläge im Mängel-Formular (P1)

- [x] T030 Bild auf max. 1568px JPEG für Analyse fitten und unabhängig vom gespeicherten Foto testen in `src/lib/ai-image.ts`.
- [x] T031 Client-Request mit Kontext, verständlichen Fehlercodes und Abort/Timeout in `src/lib/ai-analysis.ts`.
- [x] T032 Analyseknopf nur bei KI aktiviert, Worker-URL, Zustimmung, Foto und Onlinezustand im Mängel-Formular anbieten.
- [x] T033 Vorschlagskarte, niedrige Sicherheit/kein Mangel-Warnung, Feldweise/Alles-Übernehmen ohne Auto-Write implementieren.
- [x] T034 Prüfspur samt unverändertem Vorschlag, Modell/Zeit, acceptedFields und human reviewer in Defektentwurf/Persistenz ergänzen.
- [x] T035 Unit-Tests für Bildfit, Zod gültig/ungültig/unvollständig, Feldübernahme und unveränderlichen Auditvorschlag.
- [x] T036 Playwright-Tests für gemockten Worker: Analyse, alles übernehmen, speichern und Offline/Fehlerfall.

## Phase 5: Exporte und Datenschutznachweis (P2)

- [x] T040 PDF pro Mangel um „Mit KI-Unterstützung erstellt, durch [Name] geprüft“ ergänzen.
- [x] T041 XLSX und HTML-Mängelregister um Spalte „KI-Unterstützung“ ergänzen.
- [x] T042 PDF/XLSX/Backup-Tests für KI-Metadaten und legacy Defekte ohne Marker ergänzen.

## Phase 6: Laien-Dokumentation und Freigabe

- [x] T050 README: KI-Server Einrichtung (Wrangler lokal, Cloudflare Login/Secrets/Deploy, App URL/Code) und Anthropic Privacy links schreiben.
- [x] T051 CHANGELOG ergänzen.
- [x] T052 `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`; Worker Tests separat ausführen.
- [x] T053 `.dev.vars`/`.env`/API keys mittels git status und Secret-Pattern-Scan ausschliessen; Feature lokal committen und **nicht pushen**.

## Abhängigkeiten

- T001-T006 vor Worker/App Umsetzung.
- T010-T015 unabhängige Worker-Basis.
- T020-T023 nötig vor UI/KI-Verknüpfung.
- T030-T036 nach Protokoll + Einstellungen; danach T040-T042.
- T050-T053 zuletzt.
