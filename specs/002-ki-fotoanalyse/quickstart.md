# Quickstart: KI-Fotoanalyse

## Lokaler Worker

1. Node.js 22+ installieren.
2. Im `server` Ordner `npm install` und `npx wrangler login` ausführen.
3. `server/.dev.vars.example` nach `server/.dev.vars` kopieren und lokal `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `ACCESS_CODE` sowie erlaubte Origins eintragen. Schlüssel niemals committen oder in App-Einstellungen eintragen.
4. `npx wrangler dev` im Verzeichnis `server` starten; Worker läuft lokal üblicherweise auf `http://localhost:8787`. `ALLOWED_ORIGINS` sind erlaubt: `http://localhost:5173`, `http://localhost:4173`, `http://localhost:5176`, online: `https://waldi-beck.github.io`.
5. Frontend mit `npm run dev` starten. In Einstellungen KI aktivieren, `http://localhost:8787` als URL und denselben Zugangscode eintragen, Datenschutzhinweis bestätigen.
6. Foto im Mängelentwurf laden und „Mit KI auswerten“ wählen. Vorschläge bleiben unverändert, bis Felder ausdrücklich übernommen werden.
7. Die End-to-End-Tests verwenden ausschliesslich einen gemockten Worker und lösen keine API-Kosten aus. `server/scripts/test-real.ts` ist ein separater, optionaler, **manueller** echter Anthropic-Aufruf und kann API-Kosten verursachen; den Befehl im `server`-Ordner starten:

	```bash
	npm run test:real -- ../tests/fixtures/mangel-fluchtweg.jpg
	```

	Der Schlüssel kommt aus `server/.dev.vars`; das Skript zeigt keine Geheimnisse an.

## Cloudflare veröffentlichen

1. Kostenloses Cloudflare-Konto erstellen und `npx wrangler login`.
2. In `server/wrangler.toml` die Modellkennung `CLAUDE_MODEL` und die erlaubten Origins kontrollieren; lokale Preview-Origin und `https://waldi-beck.github.io` gezielt eintragen. Keine Wildcards verwenden.
3. Secrets setzen: aus dem `server`-Ordner `npx wrangler secret put ANTHROPIC_API_KEY` und `npx wrangler secret put ACCESS_CODE`; Wrangler fragt die Secret-Werte interaktiv ab.
4. `npx wrangler deploy`.
5. HTTPS-Worker-URL in App-Einstellungen eintragen und den gleichen Zugangscode (separat sicher an Team geben). Browser-Devtools prüfen: keine Anthropic-Direktanfrage, nur Worker-Request.
6. Limits, CORS und Datenschutz prüfen. Durable Object speichert nur anonymisierten Tageszähler; keine Bild-/Textdaten.

## Sicherheit und Datenschutz

- Anthropic API key: https://docs.anthropic.com/en/api/getting-started
- Anthropic Consumer/Commercial Privacy: https://www.anthropic.com/legal/commercial-terms
- Worker darf Fotos nicht loggen, speichern oder zurückgeben.
- Keine Fotos mit erkennbaren Personen oder vertraulichen Unterlagen senden.
- Die Vorschläge sind keine verbindliche Gefährdungsbeurteilung; eine qualifizierte Person prüft und entscheidet.
