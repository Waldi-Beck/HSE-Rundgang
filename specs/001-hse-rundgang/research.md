# Research: HSE-Rundgang App

## R1 Datenhaltung ohne Backend
- **Decision**: IndexedDB via Dexie 4, `useLiveQuery` für reaktive Ansichten.
- **Rationale**: Speichert Blobs (Fotos) direkt, grosser Speicher, offline, keine Server-Infrastruktur nötig.
- **Alternatives**: localStorage (5 MB, keine Blobs), SQLite/WASM (schwer), Backend (widerspricht Prinzip V).

## R2 PDF-Export
- **Decision**: jsPDF + jspdf-autotable, Fotos als JPEG eingebettet.
- **Rationale**: Deterministischer Dateiname (`HSE-Rundgang_JJJJ-KWxx.pdf`), funktioniert offline und auf iOS, Tabellen mit Seitenumbruch.
- **Alternatives**: Print-CSS (Dateiname und Layout vom Browser abhängig, auf Mobilgeräten unzuverlässig).

## R3 Fotoaufnahme
- **Decision**: `<input type="file" accept="image/*" capture="environment" multiple>` plus zweites Input ohne `capture` für Galerie; Verkleinern per `createImageBitmap` + Canvas auf 1600 px, JPEG Qualität 0.8.
- **Rationale**: Keine Kamera-Berechtigungslogik nötig, native Kamera-App, funktioniert auf iOS/Android. `createImageBitmap(..., {imageOrientation: 'from-image'})` berücksichtigt EXIF-Drehung.
- **Alternatives**: `getUserMedia` (eigene Kamera-UI, mehr Code, schlechtere Bildqualität).

## R4 Kalenderwoche
- **Decision**: Eigene ISO-8601-Funktion (Donnerstag-Regel), getestet an Jahresgrenzen.
- **Alternatives**: date-fns (zusätzliche Abhängigkeit für eine Funktion).

## R5 Routing und Hosting
- **Decision**: HashRouter, Vite `base` aus Umgebungsvariable `BASE_PATH` (Default `./`).
- **Rationale**: Funktioniert unter jedem Unterpfad (GitHub Pages `/<repo>/`, Intranet) ohne Server-Rewrites.

## R6 Unterschrift
- **Decision**: Eigenes Canvas-Pad mit Pointer Events, gespeichert als PNG-Data-URL.
- **Rationale**: ~60 Zeilen, keine Abhängigkeit.

## R7 Gestaltung (Taste-Skill)
- **Decision**: Design read "regulierte, vertrauensorientierte Arbeits-App für Mobilgeräte, ruhig, gut lesbar im Werkstattlicht". Dials VARIANCE 3, MOTION 2, DENSITY 5.
  Schrift Geist (lokal gebündelt, nicht Inter), Icons Phosphor, neutrale Zinc-Basis mit einem Akzent (Smaragd/Grün für Sicherheit; Rot/Bernstein nur semantisch für Mangel / überfällig), ein Radius-System (Karten 12 px, Steuerelemente 10 px), Labels über Feldern, keine Gedankenstriche in UI-Texten, Leer-/Fehlerzustände, Dark Mode über Tokens, `min-h-[100dvh]`.
- **Note**: Taste-Skill nennt Dashboards/Formular-Apps als "out of scope"; angewendet werden daher nur die allgemeinen Regeln (Typografie, Farbe, Zustände, Formular-Kontrast, AI-Tells).

## R8 PWA
- **Decision**: vite-plugin-pwa (`generateSW`, autoUpdate), Manifest mit Icons.
