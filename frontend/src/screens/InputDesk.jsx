import { useState } from "react";

const EMPTY_ARTICLE = () => ({ source_name: "", url: "", text: "" });
const EMPTY_STORY = () => ({ topic: "", articles: [EMPTY_ARTICLE(), EMPTY_ARTICLE()] });

/**
 * File reports story by story. Paste public article URLs — the
 * backend fetches and extracts the bodies — or paste raw text.
 * Each story runs through the pipeline separately, so unrelated
 * topics land on the case board as their own piles.
 */
export default function InputDesk({ onRun, onBack, onDemo }) {
  const [stories, setStories] = useState([EMPTY_STORY()]);
  const [error, setError] = useState("");

  const updateStory = (i, patch) =>
    setStories((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const updateArticle = (i, k, field, value) =>
    setStories((prev) =>
      prev.map((s, j) =>
        j === i
          ? {
              ...s,
              articles: s.articles.map((a, l) => (l === k ? { ...a, [field]: value } : a)),
            }
          : s
      )
    );

  const addStory = () => setStories((prev) => [...prev, EMPTY_STORY()]);

  const removeStory = (i) =>
    setStories((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const addArticle = (i) =>
    setStories((prev) =>
      prev.map((s, j) =>
        j === i && s.articles.length < 10
          ? { ...s, articles: [...s.articles, EMPTY_ARTICLE()] }
          : s
      )
    );

  const removeArticle = (i, k) =>
    setStories((prev) =>
      prev.map((s, j) =>
        j === i && s.articles.length > 1
          ? { ...s, articles: s.articles.filter((_, l) => l !== k) }
          : s
      )
    );

  const submit = (e) => {
    e.preventDefault();
    const payload = [];
    for (const [i, story] of stories.entries()) {
      if (story.topic.trim().length < 3) {
        setError(`Story ${i + 1} needs a topic of at least three characters.`);
        return;
      }
      const articles = story.articles
        .filter((a) => a.text.trim() || a.url.trim())
        .map((a, k) => ({
          source_name: a.source_name.trim() || `Source ${k + 1}`,
          source_type: a.url.trim() ? "Linked article" : "Pasted report",
          ...(a.text.trim() ? { text: a.text.trim() } : {}),
          ...(a.url.trim() ? { url: a.url.trim() } : {}),
        }));
      if (articles.length === 0) {
        setError(`Story ${i + 1} needs at least one report with a URL or pasted text.`);
        return;
      }
      payload.push({ topic: story.topic.trim(), articles });
    }
    setError("");
    onRun(payload);
  };

  return (
    <div className="page input-desk">
      <header className="topbar">
        <button className="btn-link" onClick={onBack}>
          Back to the front page
        </button>
        <span className="topbar-center">File reports</span>
        <button className="btn-link" onClick={onDemo}>
          Use the demo case instead
        </button>
      </header>

      <main className="input-main">
        <h2 className="section-title">New cases</h2>
        <p className="section-sub">
          File reports story by story — unrelated topics become separate piles
          on the case board. Paste a public article URL and the desk fetches
          and reads it for you; the configured extractor (OpenAI when a key is
          set) pulls out the claims. Pasting raw text works too. Requires a
          running LiveBrief API.
        </p>

        <form onSubmit={submit}>
          {stories.map((story, i) => (
            <fieldset className="story-block" key={i}>
              <legend className="mono">Story {String(i + 1).padStart(2, "0")}</legend>
              <label className="field">
                <span className="field-label">Story topic</span>
                <input
                  type="text"
                  value={story.topic}
                  onChange={(e) => updateStory(i, { topic: e.target.value })}
                  placeholder="Airstrike reported near Port Kessa harbour"
                  maxLength={240}
                />
              </label>

              {story.articles.map((a, k) => (
                <div className="article-row" key={k}>
                  <div className="article-row-grid">
                    <label className="field">
                      <span className="field-label">Source name (optional)</span>
                      <input
                        type="text"
                        value={a.source_name}
                        onChange={(e) => updateArticle(i, k, "source_name", e.target.value)}
                        placeholder={`Source ${k + 1}`}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Article URL</span>
                      <input
                        type="url"
                        value={a.url}
                        onChange={(e) => updateArticle(i, k, "url", e.target.value)}
                        placeholder="https://example.com/article"
                      />
                    </label>
                  </div>
                  <details className="paste-details" open={!!a.text}>
                    <summary className="mono">…or paste the report text instead</summary>
                    <textarea
                      rows={4}
                      value={a.text}
                      onChange={(e) => updateArticle(i, k, "text", e.target.value)}
                      placeholder="Officials say 8 people were injured after an explosion…"
                    />
                  </details>
                  {story.articles.length > 1 && (
                    <button
                      type="button"
                      className="btn-link btn-remove"
                      onClick={() => removeArticle(i, k)}
                    >
                      Remove report
                    </button>
                  )}
                </div>
              ))}

              <div className="story-actions">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => addArticle(i)}
                  disabled={story.articles.length >= 10}
                >
                  Add a report to this story
                </button>
                {stories.length > 1 && (
                  <button
                    type="button"
                    className="btn-link btn-remove"
                    onClick={() => removeStory(i)}
                  >
                    Remove story
                  </button>
                )}
              </div>
            </fieldset>
          ))}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="input-actions">
            <button type="button" className="btn btn-ghost" onClick={addStory}>
              Add another story
            </button>
            <button type="submit" className="btn btn-primary">
              Run the analysis
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
