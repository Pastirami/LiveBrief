# LiveBrief

LiveBrief is an AI-assisted verification backend for breaking-news teams. It
collects multiple reports, extracts source-grounded claims, groups related facts,
flags contradictions, and creates publication copy only from claims approved by
a journalist.

The system is designed to accelerate verification without asking AI to decide
what is true.

## Why LiveBrief

During breaking news, facts arrive quickly and often conflict:

- casualty figures differ between reports;
- timestamps and locations change as stories develop;
- secondary sources repeat claims without primary confirmation;
- an early draft can accidentally present uncertain information as fact.

LiveBrief converts every report into an auditable claim matrix. Each claim keeps
its source and evidence attached, while conflicts remain visible until an editor
reviews them.

## Core Features

- Public article URL ingestion and pasted-text support
- Article-body extraction with Trafilatura and BeautifulSoup fallback
- OpenAI Responses API extraction using strict structured output
- Source-grounded claims with evidence, confidence, risk, time, and location
- Automatic claim grouping and contradiction alerts
- Chronological event timeline
- Journalist-controlled `confirmed`, `to_verify`, and `ignored` states
- Final brief generation from approved claim text only
- SSRF protection, download limits, request validation, and safe error responses
- Interactive Swagger and ReDoc documentation

## Editorial Safety

LiveBrief follows three rules:

1. AI extracts claims but does not determine truth.
2. Every AI-extracted claim starts as `to_verify`.
3. Final copy includes only claims explicitly approved by a journalist.

The case title is never treated as evidence, and the final brief generator does
not introduce new names, numbers, causes, or locations.

## Architecture

```mermaid
flowchart LR
    A["Article URLs or pasted text"] --> B["Secure ingestion"]
    B --> C["Article body extraction"]
    C --> D["AI structured claim extraction"]
    D --> E["Claim grouping"]
    E --> F["Conflict detection"]
    F --> G["Journalist review"]
    G --> H["Approved-fact brief"]
```

```text
backend/
  app/
    api/v1/endpoints/   FastAPI routes
    core/               Environment configuration
    data/               Stable demonstration case
    schemas/            Pydantic API contracts
    services/           Ingestion, AI, grouping, conflicts, briefs
    utils/              Text and ID helpers
    main.py             Application factory
  docs/                 OpenAPI export and API guide
  scripts/              Utility and API-key checks
  tests/                Pipeline, safety, and endpoint tests
```

## Quick Start

### 1. Create the environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure the backend

```bash
cp .env.example .env
```

Add your server-side OpenAI API key:

```env
OPENAI_API_KEY=your_key_here
DEFAULT_MODEL=gpt-4.1-mini
EXTRACTOR_MODE=ai
```

Never place the API key in frontend code or commit `backend/.env`.

### 3. Run the API

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>
- Health: <http://127.0.0.1:8000/api/v1/health>

## API Workflow

### Analyze reports

```bash
curl -X POST http://127.0.0.1:8000/api/v1/analysis/run \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Breaking event under review",
    "articles": [
      {
        "source_name": "Official statement",
        "source_type": "Primary source",
        "text": "Officials confirmed that an incident occurred at 08:15."
      },
      {
        "source_name": "Local newsroom",
        "source_type": "News report",
        "url": "https://example.com/public-article"
      }
    ]
  }'
```

The response contains normalized sources, claims, claim groups, conflicts, a
timeline, and a cautious suggested brief.

### Generate an approved brief

After the journalist updates claim statuses, send the claims to:

```text
POST /api/v1/analysis/brief
```

Only claims marked `confirmed` or `add_to_brief` are included.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Service and AI readiness |
| `GET` | `/api/v1/analysis/demo` | Stable demonstration payload |
| `POST` | `/api/v1/analysis/preview` | Crawl and clean one public article URL |
| `POST` | `/api/v1/analysis/run` | Ingest and compare reports |
| `POST` | `/api/v1/analysis/brief` | Build an approved-fact brief |

## Tests

```bash
cd backend
.venv/bin/pytest -q tests
```

The suite covers the full deterministic pipeline, API contracts, unsafe URL
rejection, health metadata, conflict detection, and prevention of topic-based
hallucinations in final copy.

To verify the configured OpenAI key separately:

```bash
.venv/bin/python scripts/test_openai_key.py
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | none | Server-side OpenAI credential |
| `DEFAULT_MODEL` | `gpt-4.1-mini` | Extraction model |
| `EXTRACTOR_MODE` | `ai` | `ai` or offline `rule` mode |
| `CORS_ORIGINS` | local Vite origins | Allowed frontend origins |
| `MAX_ARTICLES` | `10` | Maximum reports per analysis |
| `MAX_ARTICLE_CHARS` | `50000` | Text retained per report |
| `MAX_DOWNLOAD_BYTES` | `5000000` | Maximum article download |
| `ARTICLE_TIMEOUT_SECONDS` | `20` | Publisher request timeout |
| `REQUEST_TIMEOUT_SECONDS` | `45` | OpenAI request timeout |

## Current Scope

This repository contains the LiveBrief FastAPI backend and its API
documentation. A web client can integrate directly through the documented
`/api/v1` endpoints.

For backend-specific implementation details, see
[`backend/README.md`](backend/README.md).
