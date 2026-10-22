# Data Model: Optionale KI-Fotoanalyse

## Client IndexedDB

### AiSettings (Teil von `RegisterSettings`)

- `enabled: boolean` – Standard `false`.
- `serverUrl: string` – Worker-Basis-URL, Standard leer.
- `accessCode: string` – organisationsweiter Zugangscode; nur in lokaler IndexedDB, nicht exportiert in Cloud; im UI maskiert. Er wird als Header übertragen.
- `consentAt: string | null` – UTC Zeitpunkt der bestätigten Anthropic-Datenschutzinformation; `null` bis Zustimmung.

### AiAnalysisAudit (optional am `Defect`)

- `used: boolean` – wird nur bei tatsächlicher Fotoanfrage `true`.
- `analyzedAt: string | null` – ISO-UTC Zeitpunkt.
- `reviewedAt: string | null` – ISO-UTC Zeitpunkt der expliziten menschlichen Prüfbestätigung.
- `model: string` – vom Worker zurückgegebene Modellkennung.
- `proposal: AiProposal | null` – unveränderte, Zod-validierte Antwort.
- `acceptedFields: AiAcceptedField[]` – nur aktiv übernommene Felder: `hazard`, `priority`, `immediateAction`, `action`, optional `itemId`/`area`.
- `reviewedBy: string` – der menschlich bestätigende Prüfer, aus `walk.inspector` beim Speichern.

Unveränderte Vorschläge und Übernahmeliste bilden getrennte Werte. Manuelle spätere Bearbeitung ändert das eingefrorene `proposal` nicht.

### AiProposal (strict JSON, auch Worker und App)

- `mangelErkannt: boolean`
- `gefahren: { beschreibung: string; folge: string }[]`
- `vorgeschlagenePrio: 'K' | 'H' | 'M' | 'N' | null`
- `begruendungPrio: string`
- `sofortmassnahme: string`
- `massnahmen: { text: string; stopStufe: 'Substitution' | 'Technisch' | 'Organisatorisch' | 'Persönlich' }[]`
- `passendeGrundlage: string`
- `passenderKontrollpunkt: string | null`
- `sicherheit: 'hoch' | 'mittel' | 'niedrig'`
- `hinweis: string`

## Worker Ephemeral Types

### AnalyzeRequest

- `imageJpegBase64: string` – begrenzte kodierte Bildgröße, JPEG only.
- `context: { area: string; itemId: string; itemText: string; basis: string; userText: string; priorities: Record<'K'|'H'|'M'|'N', { name: string; days: number }> }`.
- `itemId` darf `SONSTIGES` sein; Kontrollpunkttext/Grundlage dann leer.

### DailyUsage (Durable Object storage)

- Schlüssel: SHA-256(`ACCESS_CODE`) + UTC `YYYY-MM-DD`.
- Wert: Zähler und ggf. zurückgesetzter Tag; persistiert keine Fotos, Texte oder IPs.
- Grenzwert: 30 Anfragen/Tag/Zugangscode, atomar inkrementiert; überschritten: HTTP 429.

## Migration and Backup

Dexie Version 6 ergänzt die Settings-Felder mit sicheren Defaults und neue optionale Auditfelder in Mängeln (Schema keine neue Tabelle nötig). Backups bleiben Formatversion 4 lesbar; vorhandene Defekte erhalten `aiAudit: null` beim Lesen/Migration. Export/Import nimmt Prüfspur mit, niemals lokale Worker-Zugangsdaten. `serverUrl`, `enabled`, `consentAt` können im lokalen Backup gespeichert werden; `accessCode` wird beim Export explizit entfernt und nach Import neu eingegeben.
