# LiveBrief Poster

## Main Title

LiveBrief

## Tagline

AI-assisted breaking-news verification where journalists approve every fact.

## Hero Statement

Breaking news does not fail because newsrooms lack information. It fails when
conflicting details move too quickly to compare. LiveBrief turns scattered
reports into story decks, article cards, visible conflicts, and approved-fact
briefs.

## Problem

During a developing story, sources often disagree on:

- casualty numbers
- timestamps
- locations
- causes
- responsibility
- verification status

Generic AI summaries can hide these conflicts inside fluent prose. LiveBrief
does the opposite: it surfaces uncertainty before publication.

## Solution

LiveBrief gives editors a verification desk:

- Paste a public article URL.
- Review the cleaned article body before analysis.
- Route the article into the right story deck using a local open-source
  embedding model.
- Review one article card at a time.
- Approve, discard, or hold for review.
- Compose a brief only from approved article cards.

## Technical Pipeline

```text
URL
  -> secure crawler
  -> cleaned article text
  -> local embedding route to story deck
  -> structured claim extraction
  -> conflict detection
  -> journalist article-card verdict
  -> approved-fact brief
```

## What Makes It Different

### Not a summarizer

LiveBrief does not turn uncertain reports into confident copy.

### Source-grounded

Every extracted claim remains attached to the article and evidence that produced
it.

### Human-controlled

AI extracts and clusters. Journalists decide what can be published.

### Local story routing

Similar articles are grouped with a local open-source sentence-transformers
model, not an external embedding API.

## Why Journalists Should Use It

### Faster sorting

New articles automatically enter the matching story deck or start a new one.

### Clearer comparison

Conflicting numbers, causes, and timelines stay visible.

### Safer publication

Held-for-review and discarded articles are excluded from final copy.

### Better accountability

Editors can trace each published detail back to source text.

## Safety Rules

1. AI extracts claims. It does not decide truth.
2. Article cards need explicit journalist verdicts.
3. Held-for-review articles are not used in the brief.
4. The final brief is built only from approved claims.
5. The story title is never treated as evidence.

## Visual Direction

Use the existing LiveBrief design language:

- warm paper background
- ink-black typography
- wire-red alerts
- green approval
- amber hold-for-review
- editorial serif headlines
- compact newsroom data labels
- card and story-pile metaphors

## Closing Line

LiveBrief helps newsrooms move faster without turning verification over to AI.
