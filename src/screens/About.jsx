import { useEffect, useState } from "react";
import AboutContent from "../components/AboutContent";
import { latestRelease } from "../utils/releases";

/**
 * What this app is, and who built it. A straightforward credits/mission
 * page — just context for anyone using the app. The actual write-up lives
 * in AboutContent.jsx. With `showVersion` (the 'single-about' flag) the
 * latest published version is shown as a quiet footer at the bottom.
 */
export default function About({ showVersion = false }) {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    if (!showVersion) return;
    let cancelled = false;
    latestRelease().then((release) => {
      if (!cancelled && release) setVersion(release.version);
    });
    return () => {
      cancelled = true;
    };
  }, [showVersion]);

  return (
    <div className="page">
      <header className="page__head">
        <h1>About</h1>
        <p>What this is, and who built it.</p>
      </header>

      <AboutContent />

      {showVersion && version && <p className="settings-footer">Charting Practice v{version}</p>}
    </div>
  );
}
