# LiveBrief 5-Minute Pitch Script

## Slide 1 — Verify breaking news before you publish

Good afternoon. This is LiveBrief, an AI-assisted verification cockpit for
breaking-news teams. When a story develops, the problem is not getting
information. The problem is deciding which details are safe to publish while
different sources are changing at different speeds. LiveBrief compares those
reports, keeps the evidence attached, and allows only journalist-approved facts
to enter the final brief.

## Slide 2 — Breaking news fails at comparison, not collection

Imagine three reports arriving within minutes. One says eight people were
injured. Another says twelve. A police statement says the figures are not yet
verified. A journalist has to compare wording, timestamps, locations, and source
authority under deadline pressure. A normal summarizer can hide that conflict
inside fluent prose. LiveBrief does the opposite. It makes disagreement more
visible, because uncertainty is not noise. In breaking news, uncertainty is
editorial information.

## Slide 3 — LiveBrief turns reports into an editorial decision flow

The workflow starts with public article URLs or pasted text. The backend safely
extracts the article body, then uses structured AI output to identify individual
claims and their supporting evidence. Related claims are grouped so that
different values become easy to compare. Conflicts are flagged, but the system
does not choose a winner. Finally, the journalist reviews each claim and decides
what can move into the brief.

## Slide 4 — Every claim stays auditable

This is the core interaction. Instead of receiving one opaque AI summary, the
editor sees a claim matrix. Every row answers four questions: what is being
claimed, which source said it, what exact evidence supports it, and how risky it
is to publish. Conflicting casualty counts or event times appear together, with
a clear recommendation to verify before publishing. The editor can confirm,
keep verifying, or ignore each claim. That creates a fast workflow without
removing accountability.

## Slide 5 — AI extracts. Editors decide.

Our safety model is deliberately simple. First, AI is used for extraction, not
truth. Second, every AI-generated claim begins in a to-verify state. Third, the
case title is never treated as evidence. And fourth, the final brief is assembled
only from claims the journalist explicitly approved. During testing, we found
that an AI-written draft could infer a fact from the title, so we removed that
failure mode. The publication step is now deterministic and evidence-bound.

## Slide 6 — We tested the full path, not just the interface

This is not only a visual prototype. The FastAPI backend runs the complete flow.
Eight automated tests cover the pipeline, API contracts, unsafe URL rejection,
conflict detection, and hallucination prevention. We analyzed a real public
Guardian and AFP article URL from the interface. The OpenAI request returned
successfully, and the browser workflow completed with zero console errors. The
result is a working end-to-end MVP with production-minded safeguards.

## Slide 7 — Faster verification without giving up judgment

LiveBrief gives newsrooms the speed of AI without handing editorial judgment to
AI. It turns scattered reports into visible claims, visible conflicts, and a
brief that a human has actually approved. In a breaking-news environment, that
means faster decisions, clearer accountability, and fewer confident mistakes.
LiveBrief does not replace the journalist. It gives the journalist a better
verification desk.
