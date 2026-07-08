# LiveBrief Swagger / API Guide

The backend exposes interactive Swagger UI automatically through FastAPI.

- Local Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

To export a static OpenAPI document:

```bash
cd backend
python scripts/export_openapi.py
```

The exported file is written to:

```text
backend/docs/openapi.json
```

## Endpoint Summary

### `GET /api/v1/health`

Returns backend status and environment metadata.

Example response:

```json
{
  "status": "ok",
  "service": "LiveBrief API",
  "environment": "development"
}
```

### `GET /api/v1/analysis/demo`

Returns a ready-to-run demo payload for the frontend.

Use this for a stable hackathon demo without depending on live scraping.

### `POST /api/v1/analysis/run`

Analyzes sources and returns structured newsroom data.

Request body:

```json
{
  "topic": "Explosion reported near Central Station",
  "articles": [
    {
      "source_name": "Source A",
      "source_type": "Official brief",
      "received_at": "08:04",
      "text": "Officials say 8 people were injured after an explosion near Central Station at 08:00."
    }
  ]
}
```

Response fields the frontend should render:

- `sources`: normalized source documents
- `claims`: extracted event/claim units with status, risk, evidence, and confidence
- `groups`: related claims grouped for comparison
- `conflicts`: contradiction alerts with severity and recommendations
- `timeline`: claims sorted by event time
- `suggested_brief`: cautious draft generated from approved facts

### `POST /api/v1/analysis/brief`

Generates final copy from journalist-approved claims.

Request body:

```json
{
  "topic": "Explosion reported near Central Station",
  "approved_claims": [],
  "include_unverified_context": true
}
```

The backend intentionally does not decide which claim is true. The frontend should
send only claims that the journalist approved or explicitly marked for inclusion.

## Integration Notes

- Use `claim.id` as the stable frontend key.
- Display `claim.evidence` near every extracted claim so editors can audit the source text.
- Treat `conflicts[].recommendation` as guidance, not as automated truth.
- Do not publish claims with status `to_verify` unless the journalist changes the status.
- CORS defaults allow Vite frontend origins `http://localhost:5174` and `http://127.0.0.1:5174`.
