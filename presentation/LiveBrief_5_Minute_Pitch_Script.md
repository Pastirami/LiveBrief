# LiveBrief 5-Minute Pitch Script

## Slide 1 - LiveBrief: verify before you publish

Good afternoon. This is LiveBrief, a verification desk for breaking-news teams.
When a story is developing, the hardest problem is not getting more information.
The hard part is knowing which details are safe to publish while sources are
changing, contradicting each other, or repeating unverified claims.

LiveBrief turns that pressure into a clear editorial workflow. It crawls public
article URLs, cleans the article body, groups similar reports into story decks,
extracts source-grounded claims, highlights conflicts, and generates a brief
only from article cards that a journalist has approved.

## Slide 2 - The newsroom problem

Imagine a breaking incident. One report says two people were injured. A local
outlet says at least six. Social posts claim ten, but some clips may be old.
An official statement confirms an explosion but does not confirm the cause.

A generic AI summarizer can make this look neat. That is dangerous. Fluent prose
can hide disagreement, flatten attribution, and make uncertainty sound settled.
Journalists do not need an AI that guesses the truth. They need a system that
makes the uncertainty visible fast enough to act on it.

That is the core idea behind LiveBrief: comparison first, publication second.

## Slide 3 - How LiveBrief works

The workflow starts with a single URL. The dialog only asks for the article URL.
Before anything is added to the board, LiveBrief crawls the page and shows the
cleaned article text for confirmation. Cleaned text means the article body after
navigation, ads, and boilerplate have been removed.

After confirmation, the backend routes the article into a story deck. This is
not done with an external embedding API. We use a local open-source
sentence-transformers model inside the backend. The model embeds the new article
and each existing deck summary, compares them with cosine similarity, and either
adds the article to the closest matching deck or creates a new deck.

On the board, each deck is a story. Each card is one full article. That keeps the
mental model simple: one source, one decision.

## Slide 4 - The editorial interaction

Inside a deck, the journalist reviews article cards one by one. Each card shows
the source, the cleaned article text, the claims extracted from that article,
the average extraction confidence, and the highest risk level.

Confidence is not a truth score. It means how confident the backend is that it
extracted the claim from the article text correctly. Risk flags claims that need
more careful handling, such as casualty numbers, causes, responsibility,
location or time uncertainty, and unverified or conflicting details.

The journalist can approve, discard, or hold for review. Held articles come back
when the deck is reopened, and they are excluded from the brief until the editor
makes a final decision.

## Slide 5 - AI extracts. Journalists decide.

LiveBrief has a deliberately strict safety model.

First, AI extracts claims but does not decide what is true. Second, every
extracted claim remains attached to source evidence. Third, the story title is
never treated as evidence. Fourth, final copy is generated only from claims
inside approved article cards.

This matters because the product is not trying to replace editorial judgment. It
is trying to reduce the cost of reaching that judgment. The system keeps the
evidence close, keeps conflicts visible, and prevents unapproved material from
slipping into publishable copy.

## Slide 6 - Why journalists should use it

Journalists should use LiveBrief for three practical reasons.

First, speed. Similar reports are automatically grouped into the right story
deck, so the desk does not waste time manually sorting sources.

Second, accountability. Every claim is traceable to the exact article that
produced it. If a number changes, or if a source contradicts another source, the
editor can see that before writing the brief.

Third, safer AI. LiveBrief does not hand the final story to a black-box
summarizer. It turns AI into an assistant for extraction, clustering, and
comparison, while the human keeps control of publication.

## Slide 7 - Technical foundation and close

Under the hood, LiveBrief uses a FastAPI backend, secure URL ingestion with SSRF
protection, article-body extraction, structured claim extraction, local
open-source embedding routing, conflict detection, and deterministic brief
composition from approved claims.

The frontend is designed like an editorial desk: paper, ink, source cards,
stamps, and story piles. The interface is intentionally physical because the
action is editorial judgment, not passive reading.

LiveBrief is built for the moment when a newsroom has too many reports, too
little time, and no room for a confident mistake. It helps journalists move
faster without giving up verification. It does not replace the reporter or the
editor. It gives them a sharper desk.
