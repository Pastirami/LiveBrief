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
  "environment": "development",
  "analysis_mode": "ai",
  "ai_configured": true
}
```

### `GET /api/v1/analysis/demo`

Returns a ready-to-run demo payload for the frontend.

Use this for a stable hackathon demo without depending on live scraping.

### `POST /api/v1/analysis/preview`

Crawls one public article URL and returns cleaned article text for editor
confirmation before running AI extraction.

Request body:

```json
{
  "url": "https://example.com/public-article"
}
```

Response fields:

- `final_url`: final URL after redirects
- `source_name`: site name or hostname
- `title`: article title or first-line fallback
- `text`: cleaned article body, capped by `MAX_ARTICLE_CHARS`
- `excerpt`: short preview shown in the URL dialog
- `word_count`: cleaned body word count

### `POST /api/v1/analysis/route`

Routes one crawled article preview into an existing story deck or recommends a
new deck. Current routing uses OpenAI structured output when configured and a
deterministic keyword-overlap fallback when AI is unavailable. This endpoint is
the intended integration point for a future embeddings-based matcher.

Request body:

```json
{
  "article": {
    "url": "https://example.com/public-article",
    "final_url": "https://example.com/public-article",
    "source_name": "Example News",
    "title": "Storm damage keeps harbour closed",
    "text": "Cleaned article body...",
    "excerpt": "Short cleaned excerpt...",
    "word_count": 420
  },
  "decks": [
    {
      "case_id": "deck-1",
      "topic": "Harbour closure after storm damage",
      "source_count": 2,
      "source_names": ["Port desk", "City wire"],
      "excerpts": ["Officials closed the harbour after storm damage."]
    }
  ]
}
```

Response fields:

- `target_case_id`: existing deck to append to, or `null` for a new deck
- `topic`: target deck topic or recommended new topic
- `confidence`: routing confidence from 0 to 100
- `reason`: short explanation for the route

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

The backend intentionally does not decide which claim is true. AI-extracted claims
start as `to_verify`. The frontend must send the journalist's updated statuses;
the brief endpoint includes only `confirmed` or `add_to_brief` claims.

## Integration Notes

- Use `claim.id` as the stable frontend key.
- Display `claim.evidence` near every extracted claim so editors can audit the source text.
- Treat `conflicts[].recommendation` as guidance, not as automated truth.
- Do not publish claims with status `to_verify` unless the journalist changes the status.
- Public article URLs must use HTTP(S). Local and private network destinations are blocked.
- Up to 10 articles can be analyzed per request by default.
- CORS defaults allow Vite frontend origins `http://localhost:5174` and `http://127.0.0.1:5174`.
