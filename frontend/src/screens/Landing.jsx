import { Clock, dateline } from "../bits";
import { WIRE_SOURCES } from "../mock";

const WIRE_ITEMS = WIRE_SOURCES.map(
  (s) => `${s.received_at} — ${s.name} · ${s.topic} · ${s.text.slice(0, 110)}…`
);

export default function Landing({ onDemo, onCompose }) {
  return (
    <div className="page landing">
      <header className="topbar">
        <span className="mono">{dateline()}</span>
        <span className="topbar-center">Independent verification desk</span>
        <span className="mono">
          <span className="live-dot" aria-hidden="true" /> <Clock />
        </span>
      </header>

      <main className="landing-main">
        <h1 className="masthead">LiveBrief</h1>
        <div className="masthead-rule" aria-hidden="true" />
        <p className="deck-line">
          Breaking-news claims, <em>verified by hand</em> before a single line
          is published.
        </p>
        <p className="lede">
          Feed the desk reports from any number of stories. The machine sorts
          them into topic piles and extracts every claim with its source and
          evidence attached — then the judgement is yours. Approve, hold or
          discard each claim; each story's brief is written only from what you
          approved.
        </p>

        <div className="landing-actions">
          <button className="btn btn-primary" onClick={onDemo}>
            Open the demo case
          </button>
          <button className="btn btn-ghost" onClick={onCompose}>
            File your own reports
          </button>
        </div>

        <section className="landing-cols" aria-label="How it works">
          <div className="landing-col">
            <span className="col-num">01</span>
            <h3>Extract</h3>
            <p>
              Every report is broken into source-grounded claims — with
              evidence, confidence and risk attached. Nothing is asserted as
              true.
            </p>
          </div>
          <div className="landing-col">
            <span className="col-num">02</span>
            <h3>Compare</h3>
            <p>
              Related claims are grouped; contradictions between sources stay
              visible until an editor rules on them. 8 injured or 12? You
              decide.
            </p>
          </div>
          <div className="landing-col">
            <span className="col-num">03</span>
            <h3>Publish</h3>
            <p>
              The final brief is assembled from approved claim text alone. No
              new names, numbers, causes or locations can appear.
            </p>
          </div>
        </section>
      </main>

      <footer className="wire" aria-hidden="true">
        <span className="wire-label">Wire</span>
        <div className="wire-track">
          <div className="wire-belt">
            {[...WIRE_ITEMS, ...WIRE_ITEMS].map((item, i) => (
              <span className="wire-item" key={i}>
                {item}
                <span className="wire-sep"> +++ </span>
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
