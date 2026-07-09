import { useEffect, useMemo, useRef, useState } from "react";
import ClaimCard from "./ClaimCard";
import ClusterField from "./ClusterField";
import SourceModal from "./SourceModal";
import UrlStoryDialog from "./UrlStoryDialog";
import BriefView from "./BriefView";
import { generateBrief, routeArticleToDeck, runPreviewAnalysis } from "../api";
import { SourceMark } from "../bits";

/**
 * The verification desk. The centre stage opens on the case board —
 * one floating pile per news story. Picking up a pile expands it into
 * the swipeable deck; once every article in the story is ruled the deck
 * settles back onto the board. Sources and conflicts sit on the left
 * rail, the growing drafts on the right; both collapse into a bottom
 * sheet on small screens.
 */
export default function Desk({ session, initialVerdicts, onExit, onAddCase }) {
  const { cases, live } = session;
  const allClaims = useMemo(() => cases.flatMap((c) => c.claims), [cases]);
  const allArticles = useMemo(() => cases.flatMap((c) => c.sources), [cases]);

  const [verdicts, setVerdicts] = useState(initialVerdicts || {});
  const [history, setHistory] = useState(() =>
    allArticles.filter((source) => (initialVerdicts || {})[source.id]).map((source) => source.id)
  );
  const [command, setCommand] = useState(null);
  const [returningId, setReturningId] = useState(null);
  const [sheet, setSheet] = useState(null); // 'draft' | 'sources' | 'briefs' | null
  const [railTab, setRailTab] = useState("drafts");
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [deckFrom, setDeckFrom] = useState({ x: 0, y: 0 });
  const [viewSource, setViewSource] = useState(null); // { source, topic }
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [pendingStories, setPendingStories] = useState([]);
  const [addingUrl, setAddingUrl] = useState(false);
  const [boardNotice, setBoardNotice] = useState("");
  const [briefs, setBriefs] = useState({}); // case id -> generated brief record
  const [briefBusyId, setBriefBusyId] = useState(null);
  const [briefError, setBriefError] = useState("");
  const [briefViewCaseId, setBriefViewCaseId] = useState(null);
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

  const claimsBySource = useMemo(() => {
    const map = {};
    for (const claim of allClaims) {
      if (!map[claim.source_id]) map[claim.source_id] = [];
      map[claim.source_id].push(claim);
    }
    return map;
  }, [allClaims]);

  const conflictsBySource = useMemo(() => {
    const map = {};
    for (const newsCase of cases) {
      const groupById = Object.fromEntries(newsCase.groups.map((g) => [g.id, g]));
      for (const conflict of newsCase.conflicts) {
        const group = groupById[conflict.group_id];
        if (!group) continue;
        for (const claim of group.claims) {
          if (!map[claim.source_id]) map[claim.source_id] = [];
          if (!map[claim.source_id].some((item) => item.id === conflict.id)) {
            map[claim.source_id].push(conflict);
          }
        }
      }
    }
    return map;
  }, [cases]);

  const sourceCase = useMemo(() => {
    const map = {};
    for (const newsCase of cases) {
      for (const source of newsCase.sources) map[source.id] = newsCase;
    }
    return map;
  }, [cases]);

  const deckStates = useMemo(() => {
    const map = {};
    for (const newsCase of cases) {
      const unruled = newsCase.sources.filter((source) => !verdicts[source.id]);
      const held = newsCase.sources.filter((source) => verdicts[source.id] === "to_verify");
      const approved = newsCase.sources.filter((source) => verdicts[source.id] === "confirmed");
      const discarded = newsCase.sources.filter((source) => verdicts[source.id] === "ignored");
      map[newsCase.case_id] = {
        unruled,
        held,
        approved,
        discarded,
        allRuled: newsCase.sources.length > 0 && unruled.length === 0,
        hasHolds: held.length > 0,
        brief: briefs[newsCase.case_id] || null,
      };
    }
    return map;
  }, [briefs, cases, verdicts]);

  const active = cases.find((c) => c.case_id === activeCaseId) || null;
  const activeDeckState = active ? deckStates[active.case_id] : null;
  const pending = active
    ? activeDeckState.unruled.length > 0
      ? activeDeckState.unruled
      : activeDeckState.held
    : [];
  const ruledInActive = active ? active.sources.length - pending.length : 0;

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
        approved: newsCase.claims.filter((claim) => verdicts[claim.source_id] === "confirmed"),
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
    setHistory((h) => [...h.filter((item) => item !== id), id]);
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
    const homeCase = sourceCase[id];
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

  const openUrlDialog = () => {
    setBoardNotice("");
    setUrlDialogOpen(true);
  };

  const composeDeckBrief = async (newsCase) => {
    if (!newsCase || briefBusyId) return;
    const deckState = deckStates[newsCase.case_id];
    if (!deckState?.allRuled) return;
    if (deckState.brief) {
      setBriefViewCaseId(newsCase.case_id);
      return;
    }

    setBriefBusyId(newsCase.case_id);
    setBriefError("");
    try {
      const approved = newsCase.claims.filter((claim) => verdicts[claim.source_id] === "confirmed");
      const holds = newsCase.sources.filter((source) => verdicts[source.id] === "to_verify").length;
      const { response, live: briefLive } = await generateBrief({
        topic: newsCase.topic,
        approved_claims: approved.map((claim) => ({ ...claim, status: "confirmed" })),
        include_unverified_context: holds > 0,
      });
      const record = {
        newsCase,
        response,
        live: briefLive,
        approved,
        holds,
        createdAt: new Date().toISOString(),
      };
      setBriefs((current) => ({ ...current, [newsCase.case_id]: record }));
      setRailTab("briefs");
      setBriefViewCaseId(newsCase.case_id);
    } catch (err) {
      setBriefError(err?.message || "The brief could not be generated.");
    } finally {
      setBriefBusyId(null);
    }
  };

  const addPreviewToBoard = async (preview) => {
    const pendingId = `pending-${Date.now()}`;
    const pendingTitle = preview.title || preview.source_name || "Linked article";
    setAddingUrl(true);
    setBoardNotice("");
    setUrlDialogOpen(false);
    setPendingStories((items) => [
      ...items,
      {
        id: pendingId,
        title: pendingTitle,
        sourceName: "Finding matching story deck",
        phase: "routing",
      },
    ]);
    try {
      const route = await routeArticleToDeck(preview, cases);
      const targetCase = route.target_case_id
        ? cases.find((newsCase) => newsCase.case_id === route.target_case_id)
        : null;
      setPendingStories((items) =>
        items.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                title: route.topic || pendingTitle,
                sourceName: targetCase
                  ? `Routing into ${targetCase.topic}`
                  : "Creating a new story deck",
                targetCaseId: targetCase?.case_id || null,
                targetTopic: targetCase?.topic || route.topic,
                confidence: route.confidence,
                reason: route.reason,
                phase: "analyzing",
              }
            : item
        )
      );
      const newsCase = await runPreviewAnalysis(preview, {
        topic: targetCase ? targetCase.topic : route.topic,
        existingSources: targetCase?.sources || [],
      });
      const invalidatedBrief = Boolean(targetCase && briefs[targetCase.case_id]);
      if (targetCase) {
        setBriefs((current) => {
          const next = { ...current };
          delete next[targetCase.case_id];
          return next;
        });
      }
      onAddCase(newsCase, true, targetCase?.case_id || null);
      if (targetCase && activeCaseId === targetCase.case_id) {
        setActiveCaseId(newsCase.case_id);
      }
      setBoardNotice(
        targetCase
          ? `Article routed into "${targetCase.topic}".${
              invalidatedBrief ? " The old brief was removed because the deck changed." : ""
            }`
          : `New story deck created: "${newsCase.topic}".`
      );
    } catch (err) {
      setBoardNotice(
        err?.message
          ? `The source was crawled, but routing or analysis failed: ${err.message}`
          : "The source was crawled, but routing or analysis failed."
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
  const progress = allArticles.length ? (history.length / allArticles.length) * 100 : 0;
  const lastRuled = history[history.length - 1];
  const canUndoHere =
    history.length > 0 && (!activeCaseId || sourceCase[lastRuled]?.case_id === activeCaseId);

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
                  Read cleaned text
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

  const briefRecords = cases
    .map((newsCase) => briefs[newsCase.case_id])
    .filter(Boolean);

  const briefList = (
    <section>
      <h4 className="rail-title">Briefs</h4>
      {briefError && (
        <p className="form-error" role="alert">
          {briefError}
        </p>
      )}
      {briefRecords.length === 0 ? (
        <p className="rail-empty">No briefs composed yet.</p>
      ) : (
        <ul className="brief-list">
          {briefRecords.map((brief) => (
            <li key={brief.newsCase.case_id} className="brief-list-item">
              <button className="brief-list-button" onClick={() => setBriefViewCaseId(brief.newsCase.case_id)}>
                <span>{brief.newsCase.topic}</span>
                <span className="mono">
                  {brief.response.used_claim_ids.length} claims · {brief.holds} review hold
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const openBrief = briefViewCaseId ? briefs[briefViewCaseId] : null;

  if (openBrief) {
    return (
      <BriefView
        session={{ cases: [openBrief.newsCase] }}
        verdicts={verdicts}
        briefsOverride={[openBrief]}
        onBackToDesk={() => setBriefViewCaseId(null)}
        onRestart={onExit}
        title="Brief"
      />
    );
  }

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
          <button
            className={railTab === "briefs" ? "desk-tab desk-tab-active" : "desk-tab"}
            onClick={() => {
              setRailTab("briefs");
              setSheet(null);
            }}
          >
            Briefs ({briefRecords.length})
          </button>
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
          {boardNotice && !emptyBoard && (
            <p className="board-notice" role="status">
              {boardNotice}
            </p>
          )}
          {emptyBoard ? (
            <div className="empty-board">
              <p className="kicker">Case board</p>
              <h3 className="done-title">Start with a public article URL.</h3>
              <p className="empty-copy">
                LiveBrief will crawl the article, show the cleaned text for confirmation,
                then route it into a matching story deck or create a new one.
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
                  {ruledInActive}&thinsp;/&thinsp;{active.sources.length}
                </span>
              </div>
              {stack.length > 0 ? (
                <>
                  <div className="card-stack">
                    {stack.map((article, i) => (
                      <ClaimCard
                        key={article.id}
                        article={article}
                        claims={claimsBySource[article.id] || []}
                        conflicts={conflictsBySource[article.id] || []}
                        topic={active.topic}
                        index={active.sources.findIndex((source) => source.id === article.id)}
                        total={active.sources.length}
                        stackIndex={i}
                        interactive={i === 0}
                        command={i === 0 ? command : null}
                        onDecide={handleDecide}
                        onViewSource={openSource}
                        returning={
                          returningId && returningId.startsWith(`${article.id}:`)
                            ? returningId.split(":")[1]
                            : null
                        }
                      />
                    ))}
                  </div>
                  <div className="stage-controls">
                    <button className="ctl ctl-discard" onClick={() => requestDecide("ignored")}>
                      <span className="ctl-key mono">&larr;</span> Discard
                    </button>
                    <button className="ctl ctl-hold" onClick={() => requestDecide("to_verify")}>
                      <span className="ctl-key mono">&darr;</span> Hold for review
                    </button>
                    <button className="ctl ctl-approve" onClick={() => requestDecide("confirmed")}>
                      Approve <span className="ctl-key mono">&rarr;</span>
                    </button>
                  </div>
                  <div className="stage-underline">
                    <button className="btn-link" onClick={undo} disabled={!canUndoHere}>
                      Undo last ruling
                    </button>
                    <span className="mono stage-hint">
                      {activeDeckState.unruled.length === 0 && activeDeckState.hasHolds
                        ? "held-for-review article cards are back on the desk"
                        : "drag article cards, arrows rule, esc closes"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="deck-done deck-done-local">
                  <p className="kicker">Deck ruled</p>
                  <h3 className="done-title">{active.topic}</h3>
                  <dl className="done-figures">
                    <div>
                      <dt>Approved</dt>
                      <dd className="mono">{activeDeckState.approved.length}</dd>
                    </div>
                    <div>
                      <dt>Held for review</dt>
                      <dd className="mono">{activeDeckState.held.length}</dd>
                    </div>
                    <div>
                      <dt>Discarded</dt>
                      <dd className="mono">{activeDeckState.discarded.length}</dd>
                    </div>
                  </dl>
                  <div className="done-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => composeDeckBrief(active)}
                      disabled={briefBusyId === active.case_id}
                    >
                      {activeDeckState.brief
                        ? "View brief"
                        : briefBusyId === active.case_id
                          ? "Composing"
                          : "Compose brief"}
                    </button>
                    <button className="btn btn-ghost btn-small" onClick={() => setActiveCaseId(null)}>
                      Back to board
                    </button>
                  </div>
                  {activeDeckState.hasHolds && (
                    <p className="done-warning">
                      Held-for-review articles are excluded from this brief. Reopen this deck
                      to approve or discard them.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <ClusterField
              cases={cases}
              pendingCases={pendingStories}
              verdicts={verdicts}
              deckStates={deckStates}
              composingCaseId={briefBusyId}
              onOpen={openCase}
              onComposeDeck={composeDeckBrief}
              animateIn={!introPlayed}
              leavingId={leavingId}
            />
          )}
        </main>

        <aside className="rail rail-right">
          <div className="rail-tabs" role="tablist" aria-label="Desk side panel">
            <button
              className={railTab === "drafts" ? "rail-tab rail-tab-active" : "rail-tab"}
              onClick={() => setRailTab("drafts")}
            >
              Drafts
            </button>
            <button
              className={railTab === "briefs" ? "rail-tab rail-tab-active" : "rail-tab"}
              onClick={() => setRailTab("briefs")}
            >
              Briefs ({briefRecords.length})
            </button>
          </div>
          {railTab === "briefs" ? (
            briefList
          ) : (
            <>
              {draftList}
              <section>
                <h4 className="rail-title">Desk tally</h4>
                <ul className="tally">
                  <li>
                    <span className="tally-dot dot-approve" /> Approved
                    <span className="mono tally-num">{counts.confirmed}</span>
                  </li>
                  <li>
                    <span className="tally-dot dot-hold" /> Held for review
                    <span className="mono tally-num">{counts.to_verify}</span>
                  </li>
                  <li>
                    <span className="tally-dot dot-discard" /> Discarded
                    <span className="mono tally-num">{counts.ignored}</span>
                  </li>
                  <li>
                    <span className="tally-dot dot-rest" /> Remaining
                    <span className="mono tally-num">{allArticles.length - history.length}</span>
                  </li>
                </ul>
              </section>
            </>
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
        <button
          className={sheet === "briefs" ? "sheet-tab sheet-tab-on" : "sheet-tab"}
          onClick={() => setSheet(sheet === "briefs" ? null : "briefs")}
        >
          Briefs ({briefRecords.length})
        </button>
      </div>

      {sheet && (
        <div className="sheet" role="dialog" aria-label={sheet}>
          <div className="sheet-handle" onClick={() => setSheet(null)} />
          <div className="sheet-body">
            {sheet === "draft" ? draftList : sheet === "briefs" ? briefList : sourceList}
          </div>
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
