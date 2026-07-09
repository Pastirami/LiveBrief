import { DEMO_CASES } from "./mock";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api/v1";

async function request(path, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    if (!res.ok) {
      let detail = `${res.status}`;
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch {
        /* keep status */
      }
      throw new Error(detail);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth() {
  try {
    return await request("/health", {}, 2500);
  } catch {
    return null;
  }
}

/**
 * The demo desk covers several unrelated stories at once, so it ships
 * with a bundled multi-case dataset rather than the API's single
 * sample case. Custom cases still run through the live pipeline.
 */
export async function runDemoAnalysis() {
  return { cases: structuredClone(DEMO_CASES), live: false };
}

/**
 * Runs each story through the backend pipeline: URLs are fetched and
 * their bodies extracted server-side, then claims are pulled out by
 * the configured extractor (OpenAI when a key is set). One
 * AnalysisResult per story keeps the topics clustered separately.
 */
export async function runMultiAnalysis(stories) {
  const results = await Promise.all(
    stories.map((story) =>
      request(
        "/analysis/run",
        { method: "POST", body: JSON.stringify(story) },
        120000
      )
    )
  );
  return { cases: results, live: true };
}

export async function previewArticleUrl(url) {
  return await request(
    "/analysis/preview",
    { method: "POST", body: JSON.stringify({ url }) },
    45000
  );
}

export async function runPreviewAnalysis(preview) {
  return await request(
    "/analysis/run",
    {
      method: "POST",
      body: JSON.stringify({
        topic: preview.title || preview.source_name || "Untitled report",
        articles: [
          {
            source_name: preview.source_name || "Linked article",
            source_type: "Linked article",
            url: preview.final_url || preview.url,
            text: preview.text,
          },
        ],
      }),
    },
    120000
  );
}

export async function generateBrief(payload) {
  try {
    const response = await request("/analysis/brief", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { response, live: true };
  } catch {
    return { response: composeBriefLocally(payload), live: false };
  }
}

// Mirrors the backend rule: publication copy is assembled only from
// journalist-approved claim text; nothing new is invented.
export function composeBriefLocally({ topic, approved_claims, include_unverified_context }) {
  const approved = approved_claims || [];
  const usedIds = approved.map((c) => c.id);
  const safety = [
    "Composed locally from approved claim text only.",
    "No names, numbers, causes or locations were added by generation.",
  ];
  if (approved.length === 0) {
    return {
      topic,
      brief:
        "No claims have been approved for publication. Verified copy cannot be issued for this case yet.",
      used_claim_ids: [],
      excluded_claim_ids: [],
      safety_notes: safety,
    };
  }
  const seen = new Set();
  const sentences = [];
  for (const claim of approved) {
    const text = claim.claim.trim().replace(/\s+/g, " ");
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sentences.push(/[.!?]$/.test(text) ? text : `${text}.`);
  }
  let brief = sentences.join(" ");
  if (include_unverified_context) {
    brief +=
      " Further details are circulating but have not been verified by the desk.";
    safety.push("Unverified context is flagged, not asserted.");
  }
  return {
    topic,
    brief,
    used_claim_ids: usedIds,
    excluded_claim_ids: [],
    safety_notes: safety,
  };
}
