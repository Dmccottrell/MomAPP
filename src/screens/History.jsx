import { listHistory } from "../utils/storage";

/**
 * Every completed run for the current profile, newest first. Lets the
 * learner jump straight back into a scenario they've already attempted.
 */
export default function History({ scenarios, onSelectScenario }) {
  const entries = listHistory();

  return (
    <div className="page">
      <header className="page__head">
        <h1>History</h1>
        <p>Every note you've submitted, most recent first.</p>
      </header>

      {entries.length === 0 ? (
        <p className="empty">
          Nothing here yet — finish a scenario and it'll show up on this page.
        </p>
      ) : (
        <ul className="history">
          {entries.map((e) => {
            const scenario = scenarios.find((s) => s.id === e.scenarioId);
            const when = new Date(e.completedAt);
            return (
              <li key={e.id} className="history__row">
                <div className="history__score">
                  {e.score}
                  <span className="history__of">/{e.total}</span>
                </div>
                <div className="history__body">
                  <p className="history__title">{e.scenarioTitle}</p>
                  <p className="history__meta">
                    {when.toLocaleDateString()} · {when.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {e.missteps > 0 &&
                      ` · ${e.missteps} misstep${e.missteps === 1 ? "" : "s"}`}
                  </p>
                </div>
                {scenario && (
                  <button
                    className="btn btn--ghost history__redo"
                    onClick={() => onSelectScenario(scenario)}
                  >
                    Practice again
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
