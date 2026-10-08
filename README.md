# HSE-Rundgang App (QPS_HSE_00064)

Mobile Web-App und Register für den **HSE Rundgang** der QPS Engineering AG, Stein (CH).
Sie bildet SOP **QPS_HSE_00064**, Version 1.0, gültig ab 05.10.2026, nach der aktuellen DOTX-Form und dem Excel-Register ab.
Das vorhandene DOCX im Ordner `docs/sop` enthält eine ältere Formularfassung. Word- und Excel-Quelldateien bleiben unverändert.

Der Rundgang wird direkt am Smartphone oder Tablet erfasst:

- **Kapitel 1 Rundgangdaten**: Datum, ISO-KW, Beginn/Ende mit berechneter Dauer, Durchgeführt von, Begleitperson, Monatspunkte 2.2 und offene Mängel des letzten Rundgangs.
- **Kapitel 2 Checkliste**: R1-R15 in fünf Räumen (75 Felder); optional M1-M9, wenn 2.2 geprüft wird. Grundlagen stehen unter jedem Punkt; „Rest OK“ beschleunigt die Prüfung.
- **Kapitel 3 Mängel und Massnahmen**: Mangel-ID JJJJ-MM-TT-Mnn, Punkt/Bereich, Beschreibung, Gefahr, Sofortmassnahme, Massnahme, Priorität, Frist und Kamerafotos.
- **Kapitel 4 Abschluss**: vier Gesamtbewertungen sowie Unterschrift der durchführenden Person und optionale Kenntnisnahme. Formulardaten sind nach Abschluss schreibgeschützt.
- **Register als Excel-Ersatz**: Übersicht, Rundgänge und Mängel mit vier Statuswerten. Einstellungen übernehmen Richtfristen 0/2/7/30 Tage und Höchstintervall 14 Tage aus dem Excel-Blatt „Listen“.
- **Exporte**: PDF nach aktueller DOTX-Vorlage, XLSX mit Rundgänge und Mängel sowie JSON-Backup Formatversion 4.
- Periodische Geräte- und Wartungsprüfungen („Prüftermine“) werden bewusst nicht in der App geführt; dafür bleibt das separate Excel-Blatt zuständig.
- **Offline-fähig** (PWA, auf dem Startbildschirm installierbar). Daten liegen lokal im Browser (IndexedDB);
  Sicherung und Übertragung auf ein anderes Gerät per JSON-Datei unter "Sicherung".

| Checkliste | Mangel mit Foto | Abschluss |
|---|---|---|
| ![Checkliste](docs/screenshots/01-checkliste.png) | ![Mangel](docs/screenshots/02-mangel-mit-foto.png) | ![Abschluss](docs/screenshots/03-abschluss.png) |

> Wichtig: Ohne Server liegen die Daten nur auf dem jeweiligen Gerät. Regelmässig unter "Sicherung" eine JSON-Datei
> auf das Firmenlaufwerk speichern. Der PDF-Bericht bleibt die prüffähige Ablage.

## Lokal starten

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev          # http://localhost:5173 (im WLAN: npm run dev -- --host, dann am Handy die angezeigte IP öffnen)
```

Weitere Befehle:

```bash
npm run typecheck    # TypeScript prüfen
npm test             # Unit-Tests: R/M-Checkliste, Registerformeln, Fristen, Prüftermine, Nummern, PDF, XLSX, Backup
npm run build        # Produktions-Build nach dist/
npm run preview      # Build lokal ansehen
npm run test:e2e     # Playwright-Smoke-Test (mobiler Viewport), erzeugt docs/screenshots/
```

Hinweis Kamera: Auf dem Handy funktioniert die Kamera-Aufnahme nur über **HTTPS** (oder localhost).
Für Tests im WLAN deshalb das deployte HTTPS-Ziel verwenden.

## Deployment (statisches Hosting)

Der Build in `dist/` ist eine reine statische Website und läuft auf jedem Webserver (GitHub Pages, IIS, nginx, Intranet-Share mit HTTPS).
Es wird ein Hash-Routing verwendet (`#/...`), es sind also keine Server-Rewrites nötig.

### GitHub Pages

1. Repository auf GitHub anlegen und `main` pushen.
2. In GitHub unter **Settings > Pages > Build and deployment** als Quelle **GitHub Actions** wählen.
3. Der Workflow `.github/workflows/pages.yml` prüft (Typecheck, Tests), baut mit `BASE_PATH=/<repo-name>/` und veröffentlicht.
   Die App ist dann unter `https://<benutzer-oder-org>.github.io/<repo-name>/` erreichbar.

`BASE_PATH` steuert Vites `base`. Ohne Angabe wird `./` verwendet; das funktioniert unter jedem Unterpfad.
Für eine eigene Domain im Stammverzeichnis: `BASE_PATH=/ npm run build`.

> Datenschutz: Bei GitHub Pages ist nur der App-Code öffentlich (oder in einem privaten Repo mit Enterprise-Pages nur intern).
> Rundgangsdaten und Fotos verlassen das Gerät nie.

## In Odoo verlinken

Die App wird nicht in Odoo eingebettet, sondern als Link geöffnet (Daten bleiben im Browser des Geräts).

- **Menüpunkt im Backend** (Odoo 16/17): Einstellungen > Technisch > Benutzeroberfläche > Menüpunkte > Neu.
  Name "HSE-Rundgang", übergeordnetes Menü z. B. "Lager" oder ein eigenes Menü,
  Aktion: neue Aktion vom Typ **"URL-Aktion" (ir.actions.act_url)** mit der App-URL und Ziel **"Neues Fenster"**.
- **Website / Intranet-Seite**: im Website-Editor eine Schaltfläche oder einen Link mit der App-URL einfügen.
- **Am Handy**: App-URL einmal öffnen und "Zum Home-Bildschirm" wählen. Danach startet sie wie eine App, auch offline.

Ein `iframe` ist nicht empfohlen: Kamera-Zugriff und Downloads sind in eingebetteten Frames je nach Browser eingeschränkt.

## SOP- und Registerdaten

Die Formularinhalte stehen in **`src/data/checklist.ts`** (fünf Formbereiche, Punkte R/M, Grundlagen, Formulartexte und Kopfdaten `SOP_META`). Workbook-Listen, Richtfristen, Status-/Ergebnisbeschriftungen und Prüfterminvorschläge stehen separat in **`src/data/register.ts`**.
Bei einer neuen SOP-Version:

1. `SOP_META.version` und `validFrom` anpassen, Punkte ändern (bestehende IDs nicht umnummerieren).
2. `npm test` ausführen (der Test prüft 15 × 5 + 9 Punkte sowie die Grundlagen je Kontrollpunkt).
3. Spezifikation unter `specs/001-hse-rundgang/` nachführen.

Jeder Rundgang speichert die SOP-Version, mit der er erstellt wurde. Änderungen der App: siehe `CHANGELOG.md`.

## Projektaufbau

```text
src/data/checklist.ts   DOTX-Formular und Checkliste
src/data/register.ts    Excel-Registerlisten, Voreinstellungen und Vorschläge
src/lib/                Fachlogik ohne UI: dates, walk, image, pdf, backup
src/db.ts               IndexedDB (Dexie)
src/components/, pages/ Oberfläche (React, Tailwind)
tests/unit, tests/e2e   Vitest, Playwright
specs/001-hse-rundgang  Spec Kit: spec, plan, data-model, tasks
.specify/               Spec Kit (Verfassung unter .specify/memory/constitution.md)
.claude/skills/         Spec-Kit-Skills und Taste-Skill (Gestaltungsregeln) für Claude Code
```

Technik: Vite, React, TypeScript, Tailwind CSS, Dexie (IndexedDB), jsPDF, vite-plugin-pwa, Phosphor Icons, Schrift Geist.

## Spec Kit und Taste-Skill

Die Anforderungen wurden mit [GitHub Spec Kit](https://github.com/github/spec-kit) erarbeitet
(`/speckit-specify`, `/speckit-plan`, `/speckit-tasks` usw. stehen in Claude Code als Skills bereit).
Die Gestaltung folgt dem [Taste-Skill](https://github.com/Leonxlnx/taste-skill) (MIT) mit den Einstellungen
VARIANCE 3 / MOTION 2 / DENSITY 5 für eine ruhige, gut lesbare Arbeits-App.

## Grenzen (v1)

- Keine Benutzerverwaltung, keine Synchronisation zwischen Geräten (nur Export/Import).
- Die Bildschirm-Unterschrift ist keine qualifizierte elektronische Signatur (ZertES).
- Prüftermine Quartal/Jahr bleiben im bisherigen Excel-Register.

Verantwortlich: HSE, Waldemar Becker.
