import { useEffect, useRef, useState } from "react";

/** Animated integer count-up for tabular figures. */
export function CountUp({ value, duration = 700, suffix = "" }) {
  const [shown, setShown] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);
  return (
    <span className="figure">
      {shown}
      {suffix}
    </span>
  );
}

/** Confidence meter that fills on mount. */
export function Meter({ value }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="meter" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="meter-fill" data-band={value >= 80 ? "high" : value >= 60 ? "mid" : "low"} style={{ width: `${width}%` }} />
    </div>
  );
}

export function RiskBadge({ risk }) {
  return <span className={`risk risk-${risk}`}>{risk} risk</span>;
}

/**
 * Small publisher mark: the favicon of the article's domain when a
 * URL is on file, otherwise a typographic monogram of the source name.
 */
export function SourceMark({ name, url, size = 20 }) {
  const [failed, setFailed] = useState(false);
  let host = null;
  try {
    host = url ? new URL(url).hostname : null;
  } catch {
    host = null;
  }
  if (host && !failed) {
    return (
      <img
        className="source-mark"
        style={{ width: size, height: size }}
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="source-mark source-mark-mono"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden="true"
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** Live clock rendered in the dateline. */
export function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <span className="clock" aria-label="current time">
      {hh}:{mm}:<span className="clock-s">{ss}</span>
    </span>
  );
}

export function dateline(date = new Date()) {
  return date
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

/** Character-by-character rendering for wire copy. */
export function Typewriter({ text, speed = 14, onDone }) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    doneRef.current = false;
    setCount(0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCount(text.length);
      onDone?.();
      return;
    }
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }
          return c;
        }
        return c + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span>
      {text.slice(0, count)}
      {count < text.length && <span className="caret" aria-hidden="true" />}
    </span>
  );
}
