import { useEffect } from "react";
import { SourceMark } from "../bits";

/** Cleaned article body, presented as a filed source document. */
export default function SourceModal({ source, topic, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!source) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article
        className="modal-sheet"
        role="dialog"
        aria-label={`Cleaned source text from ${source.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="kicker">Cleaned source text</p>
            <h3 className="modal-source">
              <SourceMark name={source.name} url={source.url} size={26} />
              {source.name}
            </h3>
            <p className="mono modal-meta">
              {source.source_type}
              {source.received_at ? ` · received ${source.received_at}` : ""}
              {topic ? ` · ${topic}` : ""}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
        <div className="modal-rule" aria-hidden="true" />
        <p className="modal-note">
          This is the crawled article body after navigation, ads and boilerplate are removed.
          Use the filed URL below when you need to inspect the publisher page.
        </p>
        <p className="modal-body">{source.text}</p>
        {source.url && (
          <p className="mono modal-link">
            Filed from{" "}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.url}
            </a>
          </p>
        )}
      </article>
    </div>
  );
}
