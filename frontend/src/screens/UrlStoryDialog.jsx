import { useEffect, useState } from "react";
import { previewArticleUrl } from "../api";

export default function UrlStoryDialog({ open, onClose, onConfirm, busy, error }) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading && !busy) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, loading, busy, onClose]);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setPreview(null);
      setLocalError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const submitUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setLocalError("Enter a public article URL.");
      return;
    }
    setLoading(true);
    setLocalError("");
    try {
      const nextPreview = await previewArticleUrl(url.trim());
      setPreview(nextPreview);
    } catch (err) {
      setLocalError(err?.message || "The article could not be fetched.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setLocalError("");
  };

  const blocked = loading || busy;

  return (
    <div className="modal-backdrop" onClick={blocked ? undefined : onClose}>
      <article
        className="modal-sheet url-dialog"
        role="dialog"
        aria-label="Add article URL"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <p className="kicker">Add source</p>
            <h3 className="modal-source">
              {preview ? "Review the cleaned article" : "File an article URL"}
            </h3>
            <p className="mono modal-meta">
              {preview ? "confirm before analysis" : "crawl first, analyze after confirmation"}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={blocked}>
            Close
          </button>
        </header>

        <div className="modal-rule" aria-hidden="true" />

        {!preview ? (
          <form onSubmit={submitUrl}>
            <label className="field">
              <span className="field-label">Article URL</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/news/article"
                autoFocus
                disabled={blocked}
              />
            </label>
            {(localError || error) && (
              <p className="form-error" role="alert">
                {localError || error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={blocked}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={blocked}>
                {loading ? "Crawling" : "Crawl URL"}
              </button>
            </div>
          </form>
        ) : (
          <div className="url-preview">
            <p className="kicker">Cleaned source</p>
            <h4 className="url-preview-title">{preview.title}</h4>
            <p className="mono modal-meta">
              {preview.source_name} · {preview.word_count} words
            </p>
            <p className="url-preview-excerpt">{preview.excerpt}</p>
            <p className="mono modal-link">
              Filed from{" "}
              <a href={preview.final_url || preview.url} target="_blank" rel="noreferrer">
                {preview.final_url || preview.url}
              </a>
            </p>
            {(localError || error) && (
              <p className="form-error" role="alert">
                {localError || error}
              </p>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={blocked}>
                Use another URL
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onConfirm(preview)}
                disabled={blocked}
              >
                {busy ? "Analyzing" : "Analyze and add"}
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
