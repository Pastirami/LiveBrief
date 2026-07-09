import { useCallback, useState } from "react";
import Landing from "./screens/Landing";
import Analyzing from "./screens/Analyzing";
import Desk from "./screens/Desk";

/**
 * Screen flow:
 *   landing -> analyzing -> desk
 *   landing -> empty desk -> URL dialog -> desk
 * `session.cases` holds one AnalysisResult per news topic; the demo
 * ships three unrelated stories, URL filing adds one crawled story at a time.
 */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [job, setJob] = useState(null); // { kind: "demo" } | { kind: "custom", payload }
  const [session, setSession] = useState(null); // { cases, live }
  const [verdicts, setVerdicts] = useState({}); // claim id -> status

  const startDemo = useCallback(() => {
    setJob({ kind: "demo" });
    setScreen("analyzing");
  }, []);

  const startCustomDesk = useCallback(() => {
    setJob(null);
    setSession({ cases: [], live: true, canAddStories: true });
    setVerdicts({});
    setScreen("desk");
  }, []);

  const handleAnalyzed = useCallback((nextSession) => {
    setSession({ canAddStories: true, ...nextSession });
    setVerdicts({});
    setScreen("desk");
  }, []);

  const handleAddCase = useCallback((newsCase, live = true, replaceCaseId = null) => {
    setSession((current) => ({
      cases: replaceCaseId
        ? (current?.cases || []).map((item) =>
            item.case_id === replaceCaseId ? newsCase : item
          )
        : [...(current?.cases || []), newsCase],
      live: Boolean(current?.live || live),
      canAddStories: current?.canAddStories ?? true,
    }));
  }, []);

  const reset = useCallback(() => {
    setJob(null);
    setSession(null);
    setVerdicts({});
    setScreen("landing");
  }, []);

  switch (screen) {
    case "landing":
      return <Landing onDemo={startDemo} onCompose={startCustomDesk} />;
    case "analyzing":
      return <Analyzing job={job} onReady={handleAnalyzed} onFail={() => setScreen("landing")} />;
    case "desk":
      return (
        <Desk
          session={session}
          initialVerdicts={verdicts}
          onExit={reset}
          onAddCase={session?.canAddStories ? handleAddCase : null}
        />
      );
    default:
      return null;
  }
}
