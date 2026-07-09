import { useEffect, useRef, useState } from "react";
import { runDemoAnalysis, runMultiAnalysis } from "../api";

const STEPS = [
  "Ingesting reports",
  "Clustering stories by topic",
  "Extracting source-grounded claims",
  "Detecting contradictions",
  "Building the timelines",
];

const STEP_MS = 480;

export default function Analyzing({ job, onReady, onFail }) {
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const ticker = setInterval(() => {
      setDone((d) => Math.min(d + 1, STEPS.length - 1));
    }, STEP_MS);

    const minimumWait = new Promise((r) => setTimeout(r, STEPS.length * STEP_MS));

    const work =
      job?.kind === "custom" ? runMultiAnalysis(job.payload) : runDemoAnalysis();

    Promise.all([work, minimumWait])
      .then(([sessionData]) => {
        clearInterval(ticker);
        setDone(STEPS.length);
        setTimeout(() => onReady(sessionData), 350);
      })
      .catch((err) => {
        clearInterval(ticker);
        setError(
          err?.message
            ? `The desk could not run this case: ${err.message}`
            : "The desk could not reach the LiveBrief API."
        );
      });

    return () => clearInterval(ticker);
  }, [job, onReady]);

  return (
    <div className="page analyzing">
      <div className="analyzing-box">
        <p className="kicker">Processing</p>
        <h2 className="analyzing-title">Reading the wire</h2>
        <ol className="steps">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={i < done ? "step step-done" : i === done ? "step step-active" : "step"}
            >
              <span className="step-mark" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ol>
        {error && (
          <div className="analyzing-error" role="alert">
            <p>{error}</p>
            <button className="btn btn-ghost" onClick={onFail}>
              Back to the reports
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
