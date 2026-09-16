import AboutContent from "../components/AboutContent";

/**
 * What this app is, and who built it. A straightforward credits/mission
 * page — no data, no state, just context for anyone using the app. The
 * actual write-up lives in AboutContent.jsx, shared with Settings' About
 * tab so neither is a condensed copy of the other.
 */
export default function About() {
  return (
    <div className="page">
      <header className="page__head">
        <h1>About</h1>
        <p>What this is, and who built it.</p>
      </header>

      <AboutContent />
    </div>
  );
}
