# LiveBrief Backend

FastAPI backend for the LiveBrief newsroom verification workflow.

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
- `POST /api/v1/analysis/run`
- `POST /api/v1/analysis/brief`

## Frontend Integration Flow

1. Call `GET /api/v1/analysis/demo` to load the sample case.
2. Send edited sources to `POST /api/v1/analysis/run`.
3. Render `claims`, `groups`, `conflicts`, and `timeline`.
4. Let the journalist change each claim status.
5. Send approved claims to `POST /api/v1/analysis/brief`.

The current extractor is deterministic and rule-based for stable demos. Replace
`RuleBasedEventExtractor` with an AI-backed extractor when API keys are ready.
