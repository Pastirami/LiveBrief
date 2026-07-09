# LiveBrief Backend

Production-oriented FastAPI backend for the LiveBrief newsroom verification workflow.

## Structure

```text
backend/
  app/
    api/v1/endpoints/   # FastAPI route handlers
    core/               # settings and app configuration
    data/               # demo/sample payloads
    schemas/            # Pydantic request/response contracts
    services/           # ingestion, extraction, grouping, conflicts, brief generation
    utils/              # shared helpers
    main.py             # FastAPI app factory
  docs/
    swagger.md          # frontend-facing Swagger/API guide
  scripts/
    export_openapi.py   # writes docs/openapi.json
  tests/
    test_pipeline.py
```

## Run Locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

OpenAPI JSON:

```text
http://127.0.0.1:8000/openapi.json
```

## Main Endpoints

- `GET /api/v1/health`
- `GET /api/v1/analysis/demo`
- `POST /api/v1/analysis/preview`
- `POST /api/v1/analysis/route`
- `POST /api/v1/analysis/run`
- `POST /api/v1/analysis/brief`

## What Is Implemented

- Public HTTP(S) article download with redirects, timeouts, size limits, and SSRF protection
- Article-body extraction with Trafilatura and a BeautifulSoup fallback
- Local open-source embedding routing into existing story decks, with a deterministic fallback
- OpenAI Responses API extraction with strict JSON Schema output
- Source-grounded claims, evidence, confidence, risk, grouping, and conflict alerts
- Journalist-controlled claim approval: AI-extracted claims always start as `to_verify`
- Deterministic final copy assembled only from approved claim text
- CORS, request validation, safe API errors, health/readiness metadata, and OpenAPI docs

## Frontend Integration Flow

1. Optionally send one public article URL to `POST /api/v1/analysis/preview`
   to crawl and confirm the cleaned text before analysis.
2. Send that preview plus existing deck summaries to `POST /api/v1/analysis/route`.
3. Send the routed article set to `POST /api/v1/analysis/run`.
4. Render one article card per source, with extracted claims shown inside it.
5. Let the journalist change each article card status.
6. Send claims from approved article cards to `POST /api/v1/analysis/brief`.

Set `EXTRACTOR_MODE=ai` for real OpenAI extraction or `EXTRACTOR_MODE=rule` for
offline deterministic demos and tests. Story-deck routing uses the local
`ROUTER_EMBEDDING_MODEL` sentence-transformers model, not an external embedding
API. Never expose `backend/.env` or the API key to the frontend.

## Verification

```bash
cd backend
.venv/bin/pytest -q tests
.venv/bin/python scripts/test_openai_key.py
```
