import { useEffect, useMemo, useRef, useState } from "react";
import ClaimCard from "./ClaimCard";
import ClusterField from "./ClusterField";
import SourceModal from "./SourceModal";
import UrlStoryDialog from "./UrlStoryDialog";
import { runPreviewAnalysis } from "../api";
import { CountUp, SourceMark } from "../bits";

/**
 * The verification desk. The centre stage opens on the case board —
 * one floating pile per news story. Picking up a pile expands it into
 * the swipeable deck; once every claim in the story is ruled the deck
 * settles back onto the board. Sources and conflicts sit on the left
 * rail, the growing drafts on the right; both collapse into a bottom
 * sheet on small screens.
 */
export default function Desk({ session, initialVerdicts, onCompose, onExit, onAddCase }) {
  const { cases, live } = session;
  const allClaims = useMemo(() => cases.flatMap((c) => c.claims), [cases]);

  const [verdicts, setVerdicts] = useState(initialVerdicts || {});
  const [history, setHistory] = useState(() =>
    allClaims.filter((c) => (initialVerdicts || {})[c.id]).map((c) => c.id)
  );
  const [command, setCommand] = useState(null);
  const [returningId, setReturningId] = useState(null);
  const [sheet, setSheet] = useState(null); // 'draft' | 'sources' | null
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [deckFrom, setDeckFrom] = useState({ x: 0, y: 0 });
  const [viewSource, setViewSource] = useState(null); // { source, topic }
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [pendingStories, setPendingStories] = useState([]);
  const [addingUrl, setAddingUrl] = useState(false);
  const [boardNotice, setBoardNotice] = useState("");
  const seq = useRef(0);
  const stageRef = useRef(null);
  const pickTimer = useRef(null);

  // The dealing-in animation runs once, when the board first opens.
  useEffect(() => {
    const timer = setTimeout(() => setIntroPlayed(true), 1600);
    return () => {
      clearTimeout(timer);
      clearTimeout(pickTimer.current);
    };
  }, []);

  const canAddStories = Boolean(onAddCase);
  const finished = allClaims.length > 0 && history.length >= allClaims.length;
  const emptyBoard = cases.length === 0 && pendingStories.length === 0;

  const sourceIndex = useMemo(() => {
    const map = {};
    for (const newsCase of cases) {
      for (const source of newsCase.sources) {
        map[source.id] = { source, topic: newsCase.topic };
      }
    }
    return map;
  }, [cases]);

  const conflictIndex = useMemo(() => {
    const map = {};
    for (const newsCase of cases) {
      const groupById = Object.fromEntries(newsCase.groups.map((g) => [g.id, g]));
      map[newsCase.case_id] = {};
      for (const conflict of newsCase.conflicts) {
        const group = groupById[conflict.group_id];
        if (group) map[newsCase.case_id][group.label] = conflict;
      }
    }
    return map;
  }, [cases]);

  const claimCase = useMemo(() => {
    const map = {};
    for (const newsCase of cases) {
      for (const c of newsCase.claims) map[c.id] = newsCase;
    }
    return map;
  }, [cases]);

  const active = cases.find((c) => c.case_id === activeCaseId) || null;
  const pending = active ? active.claims.filter((c) => !verdicts[c.id]) : [];
  const ruledInActive = active ? active.claims.length - pending.length : 0;

  const counts = useMemo(() => {
    const c = { confirmed: 0, to_verify: 0, ignored: 0 };
    for (const id of history) {
      const status = verdicts[id];
      if (status in c) c[status] += 1;
    }
    return c;
  }, [history, verdicts]);

  const approvedByCase = useMemo(
    () =>
      cases.map((newsCase) => ({
        newsCase,
        approved: newsCase.claims.filter((c) => verdicts[c.id] === "confirmed"),
      })),
    [cases, verdicts]
  );

  const openCase = (caseId, pileEl) => {
    if (leavingId) return;
    const stage = stageRef.current?.getBoundingClientRect();
    if (stage && pileEl) {
      const rect = pileEl.getBoundingClientRect();
      setDeckFrom({
        x: rect.left + rect.width / 2 - (stage.left + stage.width / 2),
        y: rect.top + rect.height / 2 - (stage.top + stage.height / 2),
      });
    }
    setReturningId(null);
    if (pileEl) {
      // Let the picked pile lift and its neighbours fade before the deck grows.
      setLeavingId(caseId);
      pickTimer.current = setTimeout(() => {
        setActiveCaseId(caseId);
        setLeavingId(null);
      }, 240);
    } else {
      setActiveCaseId(caseId);
    }
  };

  const handleDecide = (id, status) => {
    setVerdicts((v) => ({ ...v, [id]: status }));
    setHistory((h) => (h.includes(id) ? h : [...h, id]));
    setReturningId(null);
  };

  const requestDecide = (status) => {
    const target = pending[0];
    if (!target) return;
    seq.current += 1;
    setCommand({ status, seq: seq.current, id: target.id });
  };

  const undo = () => {
    if (history.length === 0) return;
    const id = history[history.length - 1];
    const homeCase = claimCase[id];
    // Inside a deck, only rulings from that story can be taken back.
    if (activeCaseId && homeCase?.case_id !== activeCaseId) return;
    const dir =
      verdicts[id] === "confirmed" ? "right" : verdicts[id] === "ignored" ? "left" : "down";
    setHistory((h) => h.slice(0, -1));
    setVerdicts((v) => {
      const next = { ...v };
      delete next[id];
      return next;
    });
    if (activeCaseId) setReturningId(`${id}:${dir}`);
    else if (homeCase) openCase(homeCase.case_id, null);
  };

  // A finished story settles back onto the board on its own.
  useEffect(() => {
    if (activeCaseId && active && pending.length === 0) {
      const timer = setTimeout(() => setActiveCaseId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [activeCaseId, active, pending.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof Element && e.target.closest("input, textarea")) return;
      if (viewSource) return; // the modal owns Escape
      if (e.key === "Escape") setActiveCaseId(null);
      else if (e.key === "ArrowRight") requestDecide("confirmed");
      else if (e.key === "ArrowLeft") requestDecide("ignored");
      else if (e.key === "ArrowDown") requestDecide("to_verify");
      else if (e.key === "z" || e.key === "u" || e.key === "Backspace") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const compose = () => onCompose(verdicts);

  const openUrlDialog = () => {
    setBoardNotice("");
    setUrlDialogOpen(true);
  };

  const addPreviewToBoard = async (preview) => {
    const pendingId = `pending-${Date.now()}`;
    setAddingUrl(true);
    setBoardNotice("");
    setPendingStories((items) => [
      ...items,
      {
        id: pendingId,
        title: preview.title || preview.source_name || "Linked article",
        sourceName: preview.source_name,
      },
    ]);
    setUrlDialogOpen(false);
    try {
      const newsCase = await runPreviewAnalysis(preview);
      onAddCase(newsCase, true);
    } catch (err) {
      setBoardNotice(
        err?.message
          ? `The source was crawled, but analysis failed: ${err.message}`
          : "The source was crawled, but analysis failed."
      );
    } finally {
      setPendingStories((items) => items.filter((item) => item.id !== pendingId));
      setAddingUrl(false);
    }
  };

  const openSource = (sourceId) => {
    const entry = sourceIndex[sourceId];
    if (entry) setViewSource(entry);
  };

  const stack = pending.slice(0, 3);
  const progress = allClaims.length ? (history.length / allClaims.length) * 100 : 0;
  const lastRuled = history[history.length - 1];
  const canUndoHere =
    history.length > 0 && (!activeCaseId || claimCase[lastRuled]?.case_id === activeCaseId);

  const railCases = active ? [active] : cases;

  const sourceList = (
    <>
      {railCases.map((newsCase) => (
        <section key={newsCase.case_id}>
          <h4 className="rail-title">{active ? "Sources on file" : newsCase.topic}</h4>
          <ul className="source-list">
            {newsCase.sources.map((s) => (
              <li key={s.id} className="source-item">
                <div className="source-row">
                  <span className="source-ident">
                    <SourceMark name={s.name} url={s.url} size={18} />
                    <span className="source-name">{s.name}</span>
                  </span>
                  <span className="mono source-time">{s.received_at || "—"}</span>
                </div>
                <span className="source-type">{s.source_type}</span>
                <p className="source-snippet">{s.text}</p>
                <button className="btn-link source-more" onClick={() => openSource(s.id)}>
                  Read the original
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h4 className="rail-title">Conflict alerts</h4>
        {railCases.every((c) => c.conflicts.length === 0) && (
          <p className="rail-empty">No contradictions detected.</p>
        )}
        <ul className="conflict-list">
          {railCases.flatMap((newsCase) =>
            newsCase.conflicts.map((c) => (
              <li key={c.id} className={`conflict-item severity-${c.severity}`}>
                <span className="conflict-severity mono">{c.severity}</span>
                <p className="conflict-item-title">{c.title}</p>
                <p className="conflict-item-values mono">{c.conflicting_values.join("  ·  ")}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );

  const draftList = (
    <>
      {approvedByCase.map(({ newsCase, approved }) => (
        <section key={newsCase.case_id}>
          <h4 className="rail-title">{newsCase.topic}</h4>
          {approved.length === 0 ? (
            <p className="rail-empty">Nothing approved for this story yet.</p>
          ) : (
            <ol className="draft-list">
              {approved.map((c) => (
                <li key={c.id} className="draft-line">
                  {c.claim}
                  <span className="draft-source mono"> — {c.source_name}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </>
  );

  return (
    <div className="page desk">
      <header className="topbar desk-topbar">
        <button className="btn-link" onClick={onExit}>
          Leave the desk
        </button>
        <span className="topbar-center desk-topic" title={active ? active.topic : ""}>
          {active
            ? active.topic
            : cases.length > 0
              ? `${cases.length} stories on the desk`
              : "No stories on the desk"}
        </span>
        <span className="desk-actions">
          {canAddStories && (
            <button className="btn-link" onClick={openUrlDialog}>
              Add URL
            </button>
          )}
          <span className="mono desk-mode">
            <span className="live-dot" aria-hidden="true" />
            {live ? "Live analysis" : "Demo data"}
          </span>
        </span>
      </header>

      <div className="progress-rail" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="desk-grid">
        <aside className="rail rail-left">{sourceList}</aside>

        <main className="stage" ref={stageRef}>
          {emptyBoard ? (
            <div className="empty-board">
              <p className="kicker">Case board</p>
              <h3 className="done-title">Start with a public article URL.</h3>
              <p className="empty-copy">
                LiveBrief will crawl the article, show the cleaned text for confirmation,
                then analyze it into a new story pile.
              </p>
              {boardNotice && (
                <p className="form-error empty-error" role="alert">
                  {boardNotice}
                </p>
              )}
              <button className="btn btn-primary" onClick={openUrlDialog}>
                Add URL
              </button>
            </div>
          ) : finished ? (
            <div className="deck-done">
              <p className="kicker">Review complete</p>
              <h3 className="done-title">Every story has been ruled on.</h3>
              <dl className="done-figures">
                <div>
                  <dt>Approved</dt>
                  <dd className="mono">
                    <CountUp value={counts.confirmed} />
                  </dd>
                </div>
                <div>
                  <dt>On hold</dt>
                  <dd className="mono">
                    <CountUp value={counts.to_verify} />
                  </dd>
                </div>
                <div>
                  <dt>Discarded</dt>
                  <dd className="mono">
                    <CountUp value={counts.ignored} />
                  </dd>
                </div>
              </dl>
              <div className="done-actions">
                <button className="btn btn-primary" onClick={compose}>
                  Compose the briefs
                </button>
                <button className="btn btn-ghost" onClick={undo}>
                  Revisit last ruling
                </button>
              </div>
              {counts.confirmed === 0 && (
                <p className="done-warning">
                  Nothing is approved — every brief will say so, plainly.
                </p>
              )}
            </div>
          ) : active ? (
            <div
              className="cluster-deck"
              style={{ "--from-x": `${deckFrom.x}px`, "--from-y": `${deckFrom.y}px` }}
            >
              <div className="deck-headline">
                <button className="btn-link" onClick={() => setActiveCaseId(null)}>
                  Back to the board
                </button>
                <span className="deck-cluster-label">{active.topic}</span>
                <span className="mono deck-cluster-count">
                  {ruledInActive}&thinsp;/&thinsp;{active.claims.length}
                </span>
              </div>
              <div className="card-stack">
                {stack.map((claim, i) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    sourceType={sourceIndex[claim.source_id]?.source.source_type}
                    sourceUrl={sourceIndex[claim.source_id]?.source.url}
                    conflict={conflictIndex[active.case_id]?.[claim.group_label] || null}
                    index={ruledInActive + i}
                    total={active.claims.length}
                    stackIndex={i}
                    interactive={i === 0}
                    command={i === 0 ? command : null}
                    onDecide={handleDecide}
                    onViewSource={openSource}
                    returning={
                      returningId && returningId.startsWith(`${claim.id}:`)
                        ? returningId.split(":")[1]
                        : null
                    }
                  />
                ))}
                {stack.length === 0 && (
                  <p className="deck-settling mono">Story ruled — returning to the board</p>
                )}
              </div>
              <div className="stage-controls">
                <button className="ctl ctl-discard" onClick={() => requestDecide("ignored")}>
                  <span className="ctl-key mono">&larr;</span> Discard
                </button>
                <button className="ctl ctl-hold" onClick={() => requestDecide("to_verify")}>
                  <span className="ctl-key mono">&darr;</span> Hold
                </button>
                <button className="ctl ctl-approve" onClick={() => requestDecide("confirmed")}>
                  Approve <span className="ctl-key mono">&rarr;</span>
                </button>
              </div>
              <div className="stage-underline">
                <button className="btn-link" onClick={undo} disabled={!canUndoHere}>
                  Undo last ruling
                </button>
                <span className="mono stage-hint">drag the card, arrows rule, esc closes</span>
              </div>
            </div>
          ) : (
            <ClusterField
              cases={cases}
              pendingCases={pendingStories}
              verdicts={verdicts}
              onOpen={openCase}
              animateIn={!introPlayed}
              leavingId={leavingId}
            />
          )}
        </main>

        <aside className="rail rail-right">
          {draftList}
          <section>
            <h4 className="rail-title">Desk tally</h4>
            <ul className="tally">
              <li>
                <span className="tally-dot dot-approve" /> Approved
                <span className="mono tally-num">{counts.confirmed}</span>
              </li>
              <li>
                <span className="tally-dot dot-hold" /> On hold
                <span className="mono tally-num">{counts.to_verify}</span>
              </li>
              <li>
                <span className="tally-dot dot-discard" /> Discarded
                <span className="mono tally-num">{counts.ignored}</span>
              </li>
              <li>
                <span className="tally-dot dot-rest" /> Remaining
                <span className="mono tally-num">{allClaims.length - history.length}</span>
              </li>
            </ul>
          </section>
          {finished && (
            <button className="btn btn-primary btn-block" onClick={compose}>
              Compose the briefs
            </button>
          )}
        </aside>
      </div>

      <div className="sheet-tabs">
        {canAddStories && (
          <button className="sheet-tab sheet-tab-on" onClick={openUrlDialog}>
            Add URL
          </button>
        )}
        <button
          className={sheet === "draft" ? "sheet-tab sheet-tab-on" : "sheet-tab"}
          onClick={() => setSheet(sheet === "draft" ? null : "draft")}
        >
          Drafts ({counts.confirmed})
        </button>
        <button
          className={sheet === "sources" ? "sheet-tab sheet-tab-on" : "sheet-tab"}
          onClick={() => setSheet(sheet === "sources" ? null : "sources")}
        >
          Sources ({railCases.reduce((n, c) => n + c.sources.length, 0)})
        </button>
        {finished && (
          <button className="sheet-tab sheet-tab-on" onClick={compose}>
            Compose
          </button>
        )}
      </div>

      {sheet && (
        <div className="sheet" role="dialog" aria-label={sheet}>
          <div className="sheet-handle" onClick={() => setSheet(null)} />
          <div className="sheet-body">{sheet === "draft" ? draftList : sourceList}</div>
        </div>
      )}

      {viewSource && (
        <SourceModal
          source={viewSource.source}
          topic={viewSource.topic}
          onClose={() => setViewSource(null)}
        />
      )}

      <UrlStoryDialog
        open={urlDialogOpen}
        onClose={() => setUrlDialogOpen(false)}
        onConfirm={addPreviewToBoard}
        busy={addingUrl}
        error={boardNotice}
      />
    </div>
  );
}
