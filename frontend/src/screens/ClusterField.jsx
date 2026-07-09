/**
 * The case board: one floating pile per story deck. Piles drift
 * gently, carry the story's headline and progress, and expand into
 * the swipe deck when picked up.
 */

const SLOTS = [
  [26, 34],
  [70, 26],
  [46, 68],
  [80, 64],
  [18, 74],
  [58, 44],
  [86, 38],
  [34, 16],
];

export default function ClusterField({
  cases,
  pendingCases = [],
  verdicts,
  deckStates = {},
  composingCaseId,
  onOpen,
  onComposeDeck,
  animateIn,
  leavingId,
  absorb, // { caseId, title } — one-shot card tucking in behind its pile
  newCaseId, // freshly created deck: deal it onto the board
}) {
  const absorbIndex = absorb
    ? cases.findIndex((newsCase) => newsCase.case_id === absorb.caseId)
    : -1;
  return (
    <div className="cluster-field">
      <p className="field-hint mono">Case board — pick up a story deck to review article cards</p>
      {cases.map((newsCase, i) => {
        const ruled = newsCase.sources.filter((source) => verdicts[source.id]).length;
        const total = newsCase.sources.length;
        const done = ruled === total;
        const deckState = deckStates[newsCase.case_id];
        const incoming = pendingCases.find((pending) => pending.targetCaseId === newsCase.case_id);
        const hasBrief = Boolean(deckState?.brief);
        const canCompose = done && onComposeDeck;
        const [x, y] = SLOTS[i % SLOTS.length];
        let className = "pile";
        if (done) className += " pile-done";
        if (incoming) className += " pile-route-target";
        if (animateIn || newsCase.case_id === newCaseId) className += " pile-deal";
        if (absorb?.caseId === newsCase.case_id) className += " pile-absorb";
        if (leavingId) {
          className += leavingId === newsCase.case_id ? " pile-picked" : " pile-fading";
        }
        return (
          <div
            key={newsCase.case_id}
            className={className}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              "--float-dur": `${6.5 + (i % 4) * 1.2}s`,
              "--float-delay": animateIn ? undefined : `${-i * 1.9}s`,
              "--deal-delay": `${i * 0.12}s`,
              "--tilt": `${((i % 3) - 1) * 2.4}deg`,
            }}
          >
            <button
              className="pile-hit"
              onClick={(e) => onOpen(newsCase.case_id, e.currentTarget.closest(".pile"))}
              aria-label={`Review ${newsCase.topic}: ${ruled} of ${total} articles ruled`}
            >
              <span className="pile-sheet pile-sheet-b" aria-hidden="true" />
              <span className="pile-sheet pile-sheet-a" aria-hidden="true" />
              <span className="pile-front">
                <span className="pile-kicker">Story {String(i + 1).padStart(2, "0")}</span>
                <span className="pile-topic">{newsCase.topic}</span>
                <span className="pile-count mono">
                  {done ? `${total} article cards ruled` : `${ruled}/${total} article cards`}
                </span>
                <span className="pile-badges">
                  {deckState?.hasHolds && <span className="risk risk-medium">review hold</span>}
                  {newsCase.conflicts.length > 0 && (
                    <span className="risk risk-contested">
                      {newsCase.conflicts.length} conflict{newsCase.conflicts.length > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
                <span className="pile-progress" aria-hidden="true">
                  <span style={{ width: `${(ruled / total) * 100}%` }} />
                </span>
                {done && (
                  <span className="pile-stamp" aria-hidden="true">
                    Ruled
                  </span>
                )}
                {incoming && (
                  <span className="route-landing">
                    Incoming article
                    {typeof incoming.confidence === "number" ? ` · ${incoming.confidence}% route` : ""}
                  </span>
                )}
              </span>
            </button>
            {canCompose && (
              <button
                type="button"
                className="pile-compose"
                onClick={(e) => {
                  e.stopPropagation();
                  onComposeDeck(newsCase);
                }}
                disabled={composingCaseId === newsCase.case_id}
              >
                {hasBrief ? "Brief" : composingCaseId === newsCase.case_id ? "..." : "Compose"}
              </button>
            )}
          </div>
        );
      })}
      {absorbIndex >= 0 &&
        (() => {
          const [toX, toY] = SLOTS[absorbIndex % SLOTS.length];
          const [fromX, fromY] = SLOTS[(absorb.fromIndex ?? cases.length) % SLOTS.length];
          const tilt = ((absorbIndex % 3) - 1) * 2.4;
          return (
            <div
              key={`absorb-${absorb.caseId}`}
              className="absorb-flight"
              style={{
                "--from-x": `${fromX}%`,
                "--from-y": `${fromY}%`,
                "--to-x": `${toX}%`,
                "--to-y": `${toY}%`,
                "--tilt": `${tilt}deg`,
              }}
              aria-hidden="true"
            >
              <span className="absorb-card">
                <span className="pile-kicker">Filed</span>
                <span className="absorb-title">{absorb.title}</span>
              </span>
            </div>
          );
        })()}
      {pendingCases.map((pending, i) => {
        const [x, y] = SLOTS[(cases.length + i) % SLOTS.length];
        const routed = Boolean(pending.targetCaseId && pending.targetTopic);
        return (
          <div
            key={pending.id}
            className="pile pile-pending pile-deal"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              "--float-dur": `${7.4 + (i % 3) * 1.1}s`,
              "--deal-delay": `${i * 0.12}s`,
              "--tilt": `${((i % 3) - 1) * 2.4}deg`,
            }}
            aria-label={`Analyzing ${pending.title}`}
          >
            <span className="pile-sheet pile-sheet-b" aria-hidden="true" />
            <span className="pile-sheet pile-sheet-a" aria-hidden="true" />
            <span className="pile-front">
              <span className="pile-kicker">{routed ? "Routing" : "Reading"}</span>
              <span className="pile-topic">{pending.title}</span>
              <span className="pile-count mono">
                {routed
                  ? `into ${pending.targetTopic}${
                      typeof pending.confidence === "number" ? ` · ${pending.confidence}%` : ""
                    }`
                  : pending.sourceName || "Linked article"}
              </span>
              <span className="pile-badges">
                <span className="risk risk-medium">
                  {pending.phase === "routing" ? "routing" : "analyzing"}
                </span>
              </span>
              <span className="pile-progress pile-progress-active" aria-hidden="true">
                <span />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
