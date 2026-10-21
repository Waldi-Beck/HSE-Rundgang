# Implementation Plan: Optionale KI-Fotoanalyse bei Mängeln

**Branch**: `002-ki-fotoanalyse` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary

Die bestehende offline-first React/PWA erhält eine standardmässig deaktivierte, explizit eingewilligte Fotoanalyse. Eine dünne Client-Funktion sendet ein einzelnes verkleinertes JPEG samt SOP-Kontext und Zugangscode an einen Cloudflare Worker. Der Worker prüft Origin, Zugangscode, MIME/Grösse und tägliches Nutzungsbudget mittels Durable Object, fordert mit `CLAUDE_MODEL` und serverseitigem `ANTHROPIC_API_KEY` ein Tool-Use JSON bei Anthropic an, validiert und gibt nur den geprüften Vorschlag zurück. Die App zeigt eine unverbindliche, feldweise übernehmbare Karte. Prüfspur wird lokal am Mangel gespeichert und in PDF, Register und XLSX ausgegeben.

## Technical Context

**Language/Version**: TypeScript 7, React 19, Node 22; Cloudflare Worker TypeScript
**Primary Dependencies**: bestehender React/Vite/Tailwind/Dexie-Stack; `zod`; `@anthropic-ai/sdk` ausschliesslich im Worker; `wrangler` Dev-Dependency
**Storage**: App: lokale IndexedDB (Dexie v6); Worker: Cloudflare Durable Object ausschliesslich Tageszähler, kein Foto/Inhalt; Secrets via Cloudflare Worker secrets
**Testing**: Vitest (Client und Worker mit Mock Anthropic), Playwright mobile Chromium (gemockter Worker), typecheck, build
**Target Platform**: statische HTTPS-PWA, optional Cloudflare Workers API; Chrome/Safari Mobilgeräte
**Project Type**: bestehendes Single-Page-Frontend plus isolierter Server-Worker
**Performance Goals**: Analyse lädt mit Status; 1568px JPEG max.; UI blockiert während Netzwerk nicht ausserhalb Ladezustand
**Constraints**: offline-first, keine Schlüssel im Frontend, keine Bildlogs/Storage, Default KI aus, deutscher CH-Text, Touch-Ziele >=44px
**Scale/Scope**: initiale Unternehmensnutzung; Rate-limit über Durable Object konsistent pro UTC-Tag und Zugangscode-Hash

## Constitution Check

- **Offline zuerst**: bestanden – KI separat optional; manuelle Wege unverändert, kein Server-Zwang.
- **SOP-Treue**: bestanden – Kontrollpunkt/Grundlage stammen aus `src/data/checklist.ts`, keine Checklistenänderung.
- **Datenintegrität**: bestanden – KI-Spur wird Mangel-Entwurf zugeordnet; abgeschlossene Rundgänge bleiben unveränderlich.
- **Mobile zuerst / Deutsch CH**: bestanden – native Touch-Bedienung, Karte und Fehlermeldungen mobil.
- **Einfachheit**: begründete Erweiterung um Worker, erforderlich, damit Anthropic-Schlüssel nie im statischen Client liegt.
- **Testbare Logik**: bestanden – Schema-/Clientlogik und Worker-Kontrollen unit-getestet, mobile Hauptstrecke per Playwright.

## Architecture and Security

1. Worker-Route `POST /v1/analyze` nimmt JSON an: Zugangscode in Header, genau ein JPEG als Base64, Kontextfelder. Maximal 5 MiB kodiert. Strict-Origin-CORS und `OPTIONS`; keine offenen Wildcards.
2. Zugangscode via `crypto.subtle` hash, Vergleich über feste Länge/konstante Zeit soweit WebCrypto-API erlaubt; tägliches Limit 30 Analysen pro Zugangscode und UTC-Tag in Durable Object. Kein IP-/Foto-Logging, Rate-Limit-Key nicht zurückgeben.
3. Nur nach aller Validierung wird Anthropic Messages API gerufen. Modell ist zwingend `CLAUDE_MODEL`, Schlüssel zwingend `ANTHROPIC_API_KEY`. Tool-use ist erzwungen, Tool-Schema schliesst Zusatzfelder aus. Provider-Fehler werden auf sichere deutsche Fehlercodes abgebildet; Schlüssel/Provider-Body werden nicht an Client weitergereicht.
4. Frontend prüft zuerst KI-Aktivierung, Einwilligung, HTTPS ausser localhost, Foto/Online-Hinweis. Zod validiert Worker-Antwort. Die Rohantwort wird als eingefrorenes JSON im lokalen Entwurf gesichert, Feldänderungen durch Übernehmen sind davon getrennt.
5. Kein automatischer Inhalt aus KI wird gespeichert/übernommen. Änderungen markiert jedes Feld in `acceptedFields`; menschlicher Prüfer ist am Ende Durchführende/r aus Rundgangdaten.

## Project Structure

```text
specs/002-ki-fotoanalyse/
├── spec.md
├── plan.md
├── data-model.md
├── tasks.md
└── quickstart.md
server/
├── src/index.ts
├── src/analysis.ts
├── src/limiter.ts
├── src/schemas.ts
├── test/*.test.ts
├── scripts/test-real.ts
├── wrangler.toml
├── .dev.vars.example
└── package.json
src/
├── components/DefectSheet.tsx
├── components/SettingsContext.tsx
├── pages/SettingsPage.tsx
├── db.ts
├── data/register.ts
├── export.ts
├── lib/ai-analysis.ts
├── lib/ai-schema.ts
├── lib/ai-image.ts
├── lib/types.ts
├── lib/pdf.ts
└── lib/excel.ts
tests/
├── unit/ai-analysis.test.ts
├── unit/ai-schema.test.ts
├── unit/ai-image.test.ts
├── unit/backup.test.ts
└── e2e/smoke.spec.ts
```

**Structure Decision**: Verwendet bestehende Clientstruktur und getrenntes `server/`-npm-Projekt, damit SDK/Secrets niemals Teil des Vite-Bundles sind. Worker hat eigenes Test-/TypeScript-/Wrangler-Setup.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Zweiter deploybarer Bestandteil (Worker) | Anthropic Secret muss serverseitig bleiben | Browser-zu-Anthropic oder statische Funktion kann Schlüssel nicht schützen |
| Durable Object Tageslimit | Grenzwert muss Worker-Instanzen konsistent überleben | In-Memory-Zähler ist bei Scale-to-zero/mehreren Instanzen wirkungslos |
