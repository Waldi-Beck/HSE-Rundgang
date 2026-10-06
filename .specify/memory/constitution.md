<!--
Sync Impact Report
- Version change: template -> 1.0.0 (initial ratification)
- Principles added: I SOP-Treue, II Offline zuerst, III Datenintegrität (GMP), IV Mobile zuerst, V Einfachheit, VI Testbare Logik
- Sections added: Technische Rahmenbedingungen, Entwicklungsablauf, Governance
- Templates: plan-template.md (Constitution Check wird pro Plan ausgefüllt) OK; spec-template.md OK; tasks-template.md OK
- Follow-up TODOs: keine
-->

# HSE-Rundgang App Constitution

Projektverfassung für die Web-App zur SOP **QPS_HSE_00064 "HSE Wöchentlicher Rundgang"** der QPS Engineering AG, Stein (CH).

## Core Principles

### I. SOP-Treue (NON-NEGOTIABLE)
Die App bildet die gültige Fassung der SOP QPS_HSE_00064 ab, nicht mehr und nicht weniger.
- Jeder Checklistenpunkt, jede Rubrik und jede Bewertungsstufe stammt aus der SOP und ist in genau
  einer versionierten Datendatei (`src/data/checklist.ts`) definiert.
- Jede funktionale Anforderung (FR) verweist auf das SOP-Kapitel, aus dem sie stammt.
- Ändert sich die SOP (neue Version), wird zuerst die Datendatei angepasst und ihre Version erhöht;
  abgeschlossene Rundgänge behalten die SOP-Version, mit der sie erstellt wurden.

### II. Offline zuerst
Der Rundgang findet in Werkstatt, Lager und Labor statt, wo das Netz unzuverlässig ist.
- Die App MUSS nach dem ersten Laden vollständig offline funktionieren (PWA, lokale Datenhaltung).
- Es gibt keinen Server-Zwang; Datensicherung erfolgt über Export/Import.

### III. Datenintegrität (GMP-orientiert)
- Abgeschlossene (unterschriebene) Rundgänge sind schreibgeschützt. Nur der Status von Mängeln
  (Nachkontrolle) darf danach noch geändert werden, mit Datum und Vermerk.
- "Nicht OK" ohne verknüpften Mangel ist ein ungültiger Zustand und verhindert den Abschluss.
- Zeitstempel (erstellt, geändert, abgeschlossen) werden automatisch gesetzt.
- Der PDF-Bericht ist die prüffähige Ablage und folgt der Namenskonvention `HSE-Rundgang_JJJJ-KWxx`.

### IV. Mobile zuerst, Deutsch (CH)
- Primäres Gerät ist ein Smartphone/Tablet in einer Hand: Touch-Ziele mindestens 44 px,
  keine Hover-abhängigen Funktionen, Kamera-Aufnahme direkt aus dem Mängel-Formular.
- Die gesamte Oberfläche ist Deutsch in Schweizer Schreibweise ("ss" statt "ß").
- Gestaltung folgt dem Taste-Skill (`.claude/skills/taste-skill`) mit Einstellung
  VARIANCE 3 / MOTION 2 / DENSITY 5 (regulierte, vertrauensorientierte Anwendung).

### V. Einfachheit
- Ein statisches Frontend-Projekt, kein Backend, keine Benutzerverwaltung in v1.
- Zusätzliche Abhängigkeiten nur, wenn sie eindeutig Aufwand sparen (YAGNI).

### VI. Testbare Logik
- Fachlogik (Kalenderwoche, Prio-zu-Frist, Zählungen, Ergebnisableitung, Validierung) liegt in
  reinen Funktionen ohne UI-Abhängigkeit und ist mit Unit-Tests abgedeckt.
- Der Hauptablauf (Rundgang anlegen, Mangel mit Foto, Export) ist durch einen Browser-Smoke-Test abgesichert.

## Technische Rahmenbedingungen

- Statisch hostbar (z. B. GitHub Pages, interner Webserver), verlinkbar aus Odoo.
- Fotos werden clientseitig auf max. ca. 1600 px verkleinert und als JPEG gespeichert.
- Keine personenbezogenen Daten ausser Namen der Durchführenden/Verantwortlichen.

## Entwicklungsablauf

- Spec Kit: constitution -> spec -> plan -> tasks -> implement. Artefakte unter `specs/`.
- Quality Gates vor jedem Commit auf `main`: `npm run typecheck`, `npm test`, `npm run build`.

## Governance

Diese Verfassung hat Vorrang vor anderen Konventionen im Projekt. Änderungen werden im
Sync Impact Report oben dokumentiert und versioniert (SemVer). Verantwortlich: HSE (Waldemar Becker).

**Version**: 1.0.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-06
