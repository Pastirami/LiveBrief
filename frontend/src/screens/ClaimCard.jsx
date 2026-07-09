import { useEffect, useRef, useState } from "react";
import { CountUp, Meter, RiskBadge, SourceMark } from "../bits";

const H_THRESHOLD = 100;
const V_THRESHOLD = 96;
const EXIT_MS = 300;

/**
 * One claim as a draggable index card.
 * Right = approve, left = discard, down = hold for verification.
 * `command` lets the desk (buttons / keyboard) trigger the same exit
 * animation as a physical swipe.
 */
export default function ClaimCard({
  claim,
  sourceType,
  sourceUrl,
  conflict,
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
  const [exit, setExit] = useState(null); // status while flying out
  const exitTimer = useRef(null);
  const start = useRef({ x: 0, y: 0, id: null });

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  const decide = (status) => {
    if (exit) return;
    setExit(status);
    exitTimer.current = setTimeout(() => onDecide(claim.id, status), EXIT_MS);
  };

  // Desk-driven decisions (buttons, keyboard) reuse the swipe exit.
  const lastCommand = useRef(0);
  useEffect(() => {
    if (!interactive || !command || command.id !== claim.id || command.seq === lastCommand.current)
      return;
    lastCommand.current = command.seq;
    decide(command.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, interactive]);

  const onPointerDown = (e) => {
    if (!interactive || exit) return;
    if (e.target.closest("a, button")) return;
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
      aria-label={`Claim ${index + 1} of ${total}: ${claim.claim}`}
    >
      <div className="stamp stamp-approve" style={{ opacity: exit === "confirmed" ? 1 : approveHint }}>
        Approved
      </div>
      <div className="stamp stamp-discard" style={{ opacity: exit === "ignored" ? 1 : discardHint }}>
        Discarded
      </div>
      <div className="stamp stamp-hold" style={{ opacity: exit === "to_verify" ? 1 : holdHint }}>
        Hold — verify
      </div>

      <header className="card-head">
        <span className="kicker">{claim.group_label}</span>
        <span className="mono card-count">
          {String(index + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(total).padStart(2, "0")}
        </span>
      </header>

      <div className="card-badges">
        <RiskBadge risk={claim.risk} />
        {conflict && <span className="risk risk-contested">contested</span>}
      </div>

      <h3 className="card-claim">{claim.claim}</h3>

      <blockquote className="card-evidence">
        <span className="evidence-label">Evidence on record</span>
        {claim.evidence}
        {onViewSource && (
          <button
            className="btn-link evidence-more"
            onClick={() => onViewSource(claim.source_id)}
          >
            Read the original report
          </button>
        )}
      </blockquote>

      {conflict && (
        <div className="card-conflict">
          <p className="conflict-title">{conflict.title}</p>
          <p className="conflict-values">
            {conflict.conflicting_values.map((v, i) => (
              <span key={i}>
                <span className={v === claim.value ? "cv cv-this" : "cv"}>{v}</span>
                {i < conflict.conflicting_values.length - 1 && (
                  <span className="cv-sep"> · </span>
                )}
              </span>
            ))}
          </p>
          <p className="conflict-reco">{conflict.recommendation}</p>
        </div>
      )}

      <footer className="card-foot">
        <div className="card-source">
          <span className="source-ident">
            <SourceMark name={claim.source_name} url={sourceUrl} size={18} />
            <span className="source-name">{claim.source_name}</span>
          </span>
          <span className="mono source-meta">
            {sourceType || "report"}
            {claim.time ? ` · ${claim.time}` : ""}
            {claim.location ? ` · ${claim.location}` : ""}
          </span>
        </div>
        <div className="card-confidence">
          <span className="mono confidence-num">
            {interactive ? <CountUp value={claim.confidence} suffix="%" /> : `${claim.confidence}%`}
          </span>
          <Meter value={interactive ? claim.confidence : 0} />
          <span className="confidence-label">extraction confidence</span>
        </div>
      </footer>
    </article>
  );
}
