# Worker API Contract

## `POST /v1/analyze`

### Request

Headers: `Content-Type: application/json`, `X-Access-Code: <organisation secret>`, and an approved browser `Origin`.

Body (strict Zod contract, unknown fields rejected):

```json
{
  "imageJpegBase64": "<single JPEG, max 5 MiB decoded>",
  "context": {
    "area": "QLabs",
    "itemId": "R1",
    "itemText": "Fluchtwege frei, mind. 1,2 m breit",
    "basis": "ArGV 4 Art. 8 (Fluchtwege)",
    "userText": "Optionaler bereits eingetippter Text",
    "checklistItems": [{ "id": "R1", "text": "Fluchtwege frei, mind. 1,2 m breit", "basis": "ArGV 4 Art. 8 (Fluchtwege)" }],
    "priorities": { "K": { "name": "Kritisch", "days": 0 }, "H": { "name": "Hoch", "days": 2 }, "M": { "name": "Mittel", "days": 7 }, "N": { "name": "Niedrig", "days": 30 } }
  }
}
```

### Success response

`200 application/json; Cache-Control: no-store`

```json
{ "proposal": { "mangelErkannt": true, "mangelBeschreibung": "Kabel liegt quer über dem Gehweg.", "gefahren": [], "vorgeschlagenePrio": "H", "begruendungPrio": "…", "sofortmassnahme": "…", "massnahmen": [], "passendeGrundlage": "…", "passenderKontrollpunkt": "R1", "sicherheit": "mittel", "hinweis": "…" }, "model": "provider-returned-model-id" }
```

### Error codes

- `403 ORIGIN_NOT_ALLOWED`
- `401 UNAUTHORIZED`
- `400 INVALID_REQUEST | INVALID_IMAGE`
- `413 IMAGE_TOO_LARGE`
- `429 RATE_LIMITED`
- `503 SERVER_NOT_CONFIGURED | RATE_LIMIT_UNAVAILABLE`
- `502 ANALYSIS_INVALID | PROVIDER_UNAVAILABLE`

All error responses contain a short code only, no provider body, credentials, image, prompt, or usage key. Access code is never included in a response. `OPTIONS` accepts only configured exact origins and only the required headers/methods.
