/**
 * The grid of things the learner can do next, plus the hint button below
 * it. An action button disables itself once clicked (each action can only
 * be taken once). Hints reveal one at a time, in the order the scenario
 * defines them, from gentlest nudge to most direct.
 */
export default function ActionList({
  actions,
  taken,
  onTake,
  requiredCount,
  doneCount,
  hints,
  hintsUsed,
  onHint,
}) {
  return (
    <section className="actions">
      <h3 className="section-head">
        What do you do?
        <span className="progress">
          {doneCount} of {requiredCount} key steps
        </span>
      </h3>

      <div className="actions__grid">
        {actions.map((a) => {
          const used = taken.includes(a.id);
          return (
            <button
              key={a.id}
              className={`action ${used ? "action--used" : ""}`}
              onClick={() => onTake(a)}
              disabled={used}
            >
              <span className="action__label">{a.label}</span>
              <span className="action__detail">{a.detail}</span>
            </button>
          );
        })}
      </div>

      {hintsUsed < hints.length && (
        <button className="btn btn--ghost" onClick={onHint}>
          I'm stuck — give me a hint
        </button>
      )}
      {hints.slice(0, hintsUsed).map((h, i) => (
        <p key={i} className="hint">
          {h}
        </p>
      ))}
    </section>
  );
}
