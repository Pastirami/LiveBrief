import { useEffect, useMemo, useRef, useState } from "react";
import { CountUp, Meter, RiskBadge, SourceMark } from "../bits";

const H_THRESHOLD = 100;
const V_THRESHOLD = 96;
const EXIT_MS = 300;
const CONFIDENCE_HELP =
  "Average confidence that the backend correctly extracted these claims from the cleaned article text. It is not a truth score.";
const RISK_HELP =
  "High or critical risk flags claims that need careful attribution, such as casualty numbers, cause, responsibility, location/time uncertainty, unverified details, or conflicts.";

/**
 * One article/source as a draggable index card.
 * Right = approve all claims from this article, left = discard, down = hold for review.
 */
export default function ClaimCard({
  article,
  claims,
  conflicts,
  topic,
  index,
  total,
  stackIndex,
  interactive,
  command,
  onDecide,
  onViewSource,
  returning,
}) {
  const cardRef = useRef(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0, active: false });
  const [exit, setExit] = useState(null);
  const exitTimer = useRef(null);
  const start = useRef({ x: 0, y: 0, id: null });

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  const topRisk = useMemo(() => {
    const order = { low: 0, medium: 1, high: 2, critical: 3 };
    return claims.reduce(
      (highest, claim) => (order[claim.risk] > order[highest] ? claim.risk : highest),
      "low"
    );
  }, [claims]);

  const confidence = useMemo(() => {
    if (claims.length === 0) return 0;
    return Math.round(claims.reduce((sum, claim) => sum + claim.confidence, 0) / claims.length);
  }, [claims]);

  const decide = (status) => {
    if (exit) return;
    setExit(status);
    exitTimer.current = setTimeout(() => onDecide(article.id, status), EXIT_MS);
  };

  const lastCommand = useRef(0);
  useEffect(() => {
    if (!interactive || !command || command.id !== article.id || command.seq === lastCommand.current)
      return;
    lastCommand.current = command.seq;
    decide(command.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, interactive]);

  const onPointerDown = (e) => {
    if (!interactive || exit) return;
    if (e.target.closest("a, button")) return;
    if (e.target.closest(".card-body")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    cardRef.current.setPointerCapture(e.pointerId);
    setDrag({ dx: 0, dy: 0, active: true });
  };

  const onPointerMove = (e) => {
    if (!drag.active || e.pointerId !== start.current.id) return;
    setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y, active: true });
  };

  const onPointerUp = (e) => {
    if (!drag.active || e.pointerId !== start.current.id) return;
    const { dx, dy } = drag;
    if (dx > H_THRESHOLD) decide("confirmed");
    else if (dx < -H_THRESHOLD) decide("ignored");
    else if (dy > V_THRESHOLD && Math.abs(dy) > Math.abs(dx)) decide("to_verify");
    setDrag({ dx: 0, dy: 0, active: false });
  };

  const { dx, dy, active } = drag;
  const downIntent = dy > 0 && Math.abs(dy) > Math.abs(dx);
  const approveHint = Math.max(0, Math.min(1, dx / H_THRESHOLD));
  const discardHint = Math.max(0, Math.min(1, -dx / H_THRESHOLD));
  const holdHint = downIntent ? Math.max(0, Math.min(1, dy / V_THRESHOLD)) : 0;

  let transform;
  let className = "claim-card";
  if (exit === "confirmed") transform = `translate(120vw, ${dy - 60}px) rotate(20deg)`;
  else if (exit === "ignored") transform = `translate(-120vw, ${dy - 60}px) rotate(-20deg)`;
  else if (exit === "to_verify") transform = `translate(${dx}px, 110vh) rotate(2deg)`;
  else if (active) transform = `translate(${dx}px, ${dy}px) rotate(${dx / 16}deg)`;
  else transform = "translate(0, 0) rotate(0deg)";

  if (exit) className += " card-exit";
  else if (active) className += " card-dragging";
  if (returning) className += ` card-return card-return-${returning}`;
  if (!interactive) className += " card-under";

  return (
    <article
      ref={cardRef}
      className={className}
      style={{
        transform: interactive || exit ? transform : undefined,
        "--stack": stackIndex,
        zIndex: 30 - stackIndex,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={`Article ${index + 1} of ${total}: ${article.name}`}
    >
      <div className="stamp stamp-approve" style={{ opacity: exit === "confirmed" ? 1 : approveHint }}>
        Approved
      </div>
      <div className="stamp stamp-discard" style={{ opacity: exit === "ignored" ? 1 : discardHint }}>
        Discarded
      </div>
      <div className="stamp stamp-hold" style={{ opacity: exit === "to_verify" ? 1 : holdHint }}>
        Hold for review
      </div>

      <header className="card-head">
        <span className="kicker">Article on file</span>
        <span className="mono card-count">
          {String(index + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(total).padStart(2, "0")}
        </span>
      </header>

      <div className="card-badges">
        <RiskBadge risk={topRisk} />
        <span className="risk risk-medium">{claims.length} claims</span>
        {conflicts.length > 0 && <span className="risk risk-contested">{conflicts.length} conflicts</span>}
      </div>

      <div className="card-guidance">
        <span title={CONFIDENCE_HELP}>Confidence is extraction certainty, not truth.</span>
        <span title={RISK_HELP}>High risk means the claim needs attribution or extra review.</span>
      </div>

      <h3 className="card-claim">
        <SourceMark name={article.name} url={article.url} size={24} />
        {article.name}
      </h3>

      <div className="card-body">
        <blockquote className="card-evidence">
          <span className="evidence-label">Cleaned article text</span>
          <span className="evidence-help">
            Crawled body text with navigation, ads and boilerplate removed. The claims below
            are extracted from this text.
          </span>
          <span>{article.text}</span>
          {onViewSource && (
            <button className="btn-link evidence-more" onClick={() => onViewSource(article.id)}>
              Read full cleaned text
            </button>
          )}
        </blockquote>

        {claims.length > 0 && (
          <div className="article-claims">
            <p className="conflict-title">Claims extracted from this article</p>
            <ul>
              {claims.slice(0, 5).map((claim) => (
                <li key={claim.id}>{claim.claim}</li>
              ))}
            </ul>
            {claims.length > 5 && (
              <p className="mono article-claims-more">+ {claims.length - 5} more claims</p>
            )}
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="card-conflict">
            <p className="conflict-title">Conflicts touching this article</p>
            {conflicts.slice(0, 2).map((conflict) => (
              <p className="conflict-reco" key={conflict.id}>
                {conflict.title}: {conflict.recommendation}
              </p>
            ))}
          </div>
        )}
      </div>

      <footer className="card-foot">
        <div className="card-source">
          <span className="source-ident">
            <SourceMark name={article.name} url={article.url} size={18} />
            <span className="source-name">{topic}</span>
          </span>
          <span className="mono source-meta">
            {article.source_type || "report"}
            {article.received_at ? ` · ${article.received_at}` : ""}
          </span>
        </div>
        <div className="card-confidence" title={CONFIDENCE_HELP}>
          <span className="mono confidence-num">
            {interactive ? <CountUp value={confidence} suffix="%" /> : `${confidence}%`}
          </span>
          <Meter value={interactive ? confidence : 0} />
          <span className="confidence-label">avg extraction confidence</span>
        </div>
      </footer>
    </article>
  );
}
