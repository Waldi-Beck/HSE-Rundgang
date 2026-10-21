# Quickstart: KI-Fotoanalyse

## Lokaler Worker

1. Node.js 22+ installieren.
2. Im `server` Ordner `npm install` und `npx wrangler login` ausführen.
3. `server/.dev.vars.example` nach `server/.dev.vars` kopieren und lokal `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `ACCESS_CODE` sowie erlaubte Origins eintragen. Schlüssel niemals committen oder in App-Einstellungen eintragen.
4. `npx wrangler dev` im Verzeichnis `server` starten; Worker läuft lokal üblicherweise auf `http://localhost:8787`.
5. Frontend mit `npm run dev` starten. In Einstellungen KI aktivieren, `http://localhost:8787` als URL und denselben Zugangscode eintragen, Datenschutzhinweis bestätigen.
6. Foto im Mängelentwurf laden und „Mit KI auswerten“ wählen. Vorschläge bleiben unverändert, bis Felder ausdrücklich übernommen werden.
7. Der echte API-Test ist ausschliesslich manuell: aus Repository-Root `npx tsx server/scripts/test-real.ts --image tests/fixtures/mangel-fluchtweg.jpg`; der Schlüssel kommt aus `server/.dev.vars`. Er gibt keine Geheimnisse aus. Automatisierte Tests verwenden nur Mocks.

## Cloudflare veröffentlichen

1. Kostenloses Cloudflare-Konto erstellen und `npx wrangler login`.
2. In `server/wrangler.toml` die echte Worker-Route/Name und zulässige Origins kontrollieren; lokale Preview-Origin und `https://waldi-beck.github.io` sind gezielt einzutragen. Keine Wildcards verwenden.
3. Secrets setzen: aus dem `server` Ordner `npx wrangler secret put ANTHROPIC_API_KEY`, `npx wrangler secret put ACCESS_CODE`; Modellname als `CLAUDE_MODEL` Konfiguration setzen.
4. `npx wrangler deploy`.
5. HTTPS-Worker-URL in App-Einstellungen eintragen und den gleichen Zugangscode (separat sicher an Team geben). Browser-Devtools prüfen: keine Anthropic-Direktanfrage, nur Worker-Request.
6. Limits, CORS und Datenschutz prüfen. Durable Object speichert nur anonymisierten Tageszähler; keine Bild-/Textdaten.

## Sicherheit und Datenschutz

- Anthropic API key: https://docs.anthropic.com/en/api/getting-started
- Anthropic Consumer/Commercial Privacy: https://www.anthropic.com/legal/commercial-terms
- Worker darf Fotos nicht loggen, speichern oder zurückgeben.
- Keine Fotos mit erkennbaren Personen oder vertraulichen Unterlagen senden.
- Die Vorschläge sind keine verbindliche Gefährdungsbeurteilung; eine qualifizierte Person prüft und entscheidet.
