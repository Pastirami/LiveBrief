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
  onOpen,
  animateIn,
  leavingId,
}) {
  return (
    <div className="cluster-field">
      <p className="field-hint mono">Case board — pick up a story deck to review article cards</p>
      {cases.map((newsCase, i) => {
        const ruled = newsCase.sources.filter((source) => verdicts[source.id]).length;
        const total = newsCase.sources.length;
        const done = ruled === total;
        const [x, y] = SLOTS[i % SLOTS.length];
        let className = "pile";
        if (done) className += " pile-done";
        if (animateIn) className += " pile-deal";
        if (leavingId) {
          className += leavingId === newsCase.case_id ? " pile-picked" : " pile-fading";
        }
        return (
          <button
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
            onClick={(e) => onOpen(newsCase.case_id, e.currentTarget)}
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
            </span>
          </button>
        );
      })}
      {pendingCases.map((pending, i) => {
        const [x, y] = SLOTS[(cases.length + i) % SLOTS.length];
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
              <span className="pile-kicker">Reading</span>
              <span className="pile-topic">{pending.title}</span>
              <span className="pile-count mono">{pending.sourceName || "Linked article"}</span>
              <span className="pile-badges">
                <span className="risk risk-medium">analyzing</span>
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
