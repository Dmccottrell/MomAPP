import { useState } from "react";
import ScenarioPlayer from "./ScenarioPlayer";
import fall01 from "./scenarios/fall-01.json";

// Add new scenarios here. One import line per file — that's the only
// code change needed when Mom writes a new case.
const SCENARIOS = [fall01];

export default function App() {
  const [active, setActive] = useState(null);

  if (active) {
    return <ScenarioPlayer scenario={active} onExit={() => setActive(null)} />;
  }

  return (
    <div className="home">
      <header className="home__head">
        <h1>Charting Practice</h1>
        <p>
          Work a patient scenario from start to finish, then write the note.
          Every patient here is fictional.
        </p>
      </header>

      <ul className="cases">
        {SCENARIOS.map((s) => (
          <li key={s.id}>
            <button className="case" onClick={() => setActive(s)}>
              <span className="case__cat">{s.category}</span>
              <span className="case__title">{s.title}</span>
              <span className="case__meta">
                {s.unit} · {s.difficulty} · about {s.estimatedMinutes} min
              </span>
              <span className="case__objectives">{s.objectives[0]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
