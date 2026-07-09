# LiveBrief Elevator Speech

## One-Sentence Pitch

LiveBrief is an AI-assisted verification desk that groups breaking-news reports
into story decks, exposes conflicting claims, and generates final copy only from
facts approved by a journalist.

## 30-Second Pitch

LiveBrief helps journalists verify breaking news under deadline pressure. A
reporter adds a public article URL, LiveBrief cleans the article body, routes it
into the right story deck with a local open-source embedding model, and shows it
as one article card. The card includes extracted claims, evidence, confidence,
risk, and conflicts. The journalist approves, discards, or holds the article for
review. The final brief is built only from approved material, so AI helps with
comparison and extraction without taking over editorial judgment.

## 60-Second Pitch

Breaking news creates a comparison problem. One source reports two injuries,
another reports six, social media claims ten, and the official statement says
the figures are not confirmed. A normal AI summarizer can hide that uncertainty
inside polished prose.

LiveBrief makes the uncertainty visible. It crawls public article URLs, cleans
the article body, groups similar articles into story decks using a local
open-source embedding model, and extracts source-grounded claims. Journalists
review each article as a card, with the evidence, confidence, risk level, and
conflicts attached. They can approve, discard, or hold for review.

The final brief only uses claims from approved article cards. That means the
newsroom gets AI speed for sorting and extraction, while the editor keeps
control over what is safe to publish.

## Technical Pitch

LiveBrief is a FastAPI and React newsroom verification workflow. The backend
performs secure URL ingestion, article-body extraction, local sentence-transformer
embedding routing, structured claim extraction, conflict detection, and
deterministic brief composition. The frontend renders the process as an
editorial desk: story piles, article cards, verdict stamps, and a briefs tab.
The design goal is simple: use AI to reduce comparison work, but never let AI
publish an unapproved fact.

## Why This Matters

Journalists should use LiveBrief because it protects the part of reporting that
matters most under pressure: attribution, comparison, and judgment. It makes the
workflow faster, but it keeps accountability human.
