# LiveBrief — Handoff

Project location: `~/Library/Mobile Documents/com~apple~CloudDocs/development/LiveBrief`
(moved here from `~/LiveBief` on 2026-07-09)

## Running it

```bash
# backend (recreate the venv once — it still points at the old path after the move)
cd backend
rm -rf .venv && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
EXTRACTOR_MODE=rule .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
# set OPENAI_API_KEY in backend/.env and drop EXTRACTOR_MODE for AI extraction

# frontend
cd frontend
npm install   # only if node_modules was pruned by iCloud
npm run dev   # http://localhost:5174 (matches backend CORS default)
```

## What is built (frontend/)

- Editorial newsroom UI ("The Verification Desk"), React + Vite, no UI deps.
  Design system documented in `frontend/DESIGN.md`.
- Flow: Landing → (File reports) → Analyzing → Desk → per-story Dispatches.
- **Case board**: one floating pile per news story; deal-in animation on first
  entry, pick-up lift + neighbour fade on select, deck grows from the pile's
  position; finished piles get a green RULED stamp and settle back.
- **Swipe deck**: drag / buttons / arrow keys (→ approve, ← discard, ↓ hold,
  z undo, esc board), rubber-stamp overlays, conflict strips with the card's
  own value underlined, confidence meters.
- **Demo data** (`src/mock.js`): 3 unrelated stories — Port Kessa airstrike,
  Veltria inflation, Northern Corridor blackout — 5 sources each with full
  article text, 21 claims, per-story conflicts.
- **Original report viewer**: "Read the original" on cards and source rails
  opens a modal with the full article text (`SourceModal`).
- **Publisher marks** (`SourceMark` in `src/bits.jsx`): favicon of the
  article's domain when a URL exists, typographic monogram fallback.
- **Custom URL filing**: "File your own reports" opens an empty case board.
  `UrlStoryDialog` accepts only a public URL, calls `/analysis/preview` to crawl
  and clean the article, shows the extracted title/source/excerpt for
  confirmation, then sends the cleaned text to `/analysis/run` and deals the
  resulting pile onto the board.
- **Per-story briefs** (`BriefView`): one dispatch sheet per story, composed
  only from that story's approved claims; approved claims are sent with
  `status: "confirmed"` because the backend generator filters on it.
- Mobile: rails collapse into bottom sheet tabs, content-height cards.

## TODO (next session)

1. **AI-mode test**: put `OPENAI_API_KEY` in `backend/.env`, remove
   `EXTRACTOR_MODE=rule`, verify URL-only stories end-to-end (crawl → OpenAI
   extraction → board).
2. **Auto topic clustering** (nice-to-have): backend currently takes one topic
   per `/run`. For "paste URLs, cluster automatically", add a backend endpoint
   that assigns articles to topics (LLM call) before running the pipeline.
3. **DESIGN.md refresh**: add SourceMark, SourceModal, URL preview dialog,
   multi-dispatch stack, story piles (it still describes claim-group piles in
   places).
4. Mobile QA for the URL modal + multi-dispatch screens; consider clamping very
   long evidence text on cards.

## Known quirks

- Rule-based extractor is tuned to the sample case; arbitrary text can yield
  odd fields (e.g. location "Central Station") and few claims — AI mode fixes.
- The Vite dev server and uvicorn keep running after the folder move, but the
  backend venv must be recreated before its next restart (absolute paths).
- Wire ticker speed was tuned to 220s after feedback; adjust in
  `styles.css` `.wire-belt` if the item count changes a lot.
