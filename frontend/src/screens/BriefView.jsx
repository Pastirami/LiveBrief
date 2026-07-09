import { useEffect, useState } from "react";
import { generateBrief } from "../api";
import { Typewriter, dateline } from "../bits";

/**
 * The final dispatches — one per story, each composed only from that
 * story's approved claims. Uses the backend generator when reachable;
 * otherwise a local composer that follows the same no-invention rule.
 */
export default function BriefView({ session, verdicts, onBackToDesk, onRestart }) {
  const { cases } = session;
  const [briefs, setBriefs] = useState(null); // [{ newsCase, response, live, approved, holds }]
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      cases.map(async (newsCase) => {
        const approved = newsCase.claims.filter((c) => verdicts[c.id] === "confirmed");
        const holds = newsCase.claims.filter((c) => verdicts[c.id] === "to_verify").length;
        const { response, live } = await generateBrief({
          topic: newsCase.topic,
          // The backend generator only uses claims whose own status is
          // approved, so the journalist's verdict is written onto them.
          approved_claims: approved.map((c) => ({ ...c, status: "confirmed" })),
          include_unverified_context: holds > 0,
        });
        return { newsCase, response, live, approved, holds };
      })
    ).then((results) => {
      if (!cancelled) setBriefs(results);
    });
    return () => {
      cancelled = true;
    };
  }, [cases, verdicts]);

  const copy = async (brief) => {
    try {
      await navigator.clipboard.writeText(`${brief.newsCase.topic}\n\n${brief.response.brief}`);
      setCopiedId(brief.newsCase.case_id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="page brief-page">
      <header className="topbar">
        <button className="btn-link" onClick={onBackToDesk}>
          Back to the desk
        </button>
        <span className="topbar-center">
          {cases.length > 1 ? `Dispatches · ${cases.length} stories` : "Dispatch"}
        </span>
        <button className="btn-link" onClick={onRestart}>
          New case
        </button>
      </header>

      <main className="dispatch">
        {!briefs ? (
          <p className="dispatch-waiting mono">Composing from approved claims…</p>
        ) : (
          <div className="dispatch-stack">
            {briefs.map((brief, i) => (
              <article
                className="dispatch-sheet"
                key={brief.newsCase.case_id}
                style={{ "--sheet-delay": `${i * 0.14}s` }}
              >
                <p className="dispatch-kicker mono">
                  Story {String(i + 1).padStart(2, "0")} / {String(briefs.length).padStart(2, "0")}{" "}
                  · for editorial review · {dateline()} ·{" "}
                  {brief.live ? "generator: livebrief api" : "generator: local, rule-based"}
                </p>
                <h2 className="dispatch-topic">{brief.newsCase.topic}</h2>
                <div className="masthead-rule thin" aria-hidden="true" />
                <p className="dispatch-body">
                  <Typewriter text={brief.response.brief} speed={9} />
                </p>

                <div className="dispatch-meta meta-in">
                  <div className="meta-figures mono">
                    <span>{brief.response.used_claim_ids.length} claims used</span>
                    <span>{brief.response.excluded_claim_ids.length} excluded</span>
                    <span>{brief.holds} still on hold</span>
                  </div>

                  {brief.response.safety_notes?.length > 0 && (
                    <div className="safety">
                      <h4 className="rail-title">Safety notes</h4>
                      <ul>
                        {brief.response.safety_notes.map((note, j) => (
                          <li key={j}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="dispatch-actions">
                    <button className="btn btn-primary" onClick={() => copy(brief)}>
                      {copiedId === brief.newsCase.case_id ? "Copied" : "Copy this dispatch"}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <div className="dispatch-footer">
              <button className="btn btn-ghost" onClick={onBackToDesk}>
                Revisit rulings
              </button>
              <button className="btn btn-ghost" onClick={onRestart}>
                Start a new case
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
