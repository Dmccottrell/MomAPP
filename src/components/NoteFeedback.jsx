import { useState } from "react";
import { splitByMatches } from "../utils/highlight";

/**
 * The results screen for a completed scenario run: the score against the
 * documentation rubric, the learner's note next to an optional model note,
 * and the scenario's list of common pitfalls for this note type.
 *
 * The note itself is rendered with the words that earned or cost credit
 * highlighted in place, so the learner can see exactly what the grader
 * keyed off of rather than just a matched-keyword list next to the rubric.
 */
export default function NoteFeedback({
  graded,
  tips = [],
  missteps,
  note,
  documentation,
  onRestart,
  onExit,
}) {
  const [showModel, setShowModel] = useState(false);
  const metCount = graded.filter((g) => g.status === "met").length;

  const highlightTerms = graded.flatMap((g) =>
    g.matched.map((phrase) => ({
      phrase,
      kind: g.status === "violated" ? "violated" : "met",
    }))
  );
  const noteSegments = splitByMatches(note, highlightTerms);

  return (
    <section className="panel">
      <div className="score">
        <span className="score__big">
          {metCount}
          <span className="score__of">/{graded.length}</span>
        </span>
        <span className="score__label">
          documentation elements covered
          {missteps > 0 &&
            ` · ${missteps} misstep${missteps === 1 ? "" : "s"} during care`}
        </span>
      </div>

      <ul className="rubric">
        {graded.map((g) => (
          <li key={g.id} className={`rubric__item rubric__item--${g.status}`}>
            <p className="rubric__label">{g.label}</p>
            <p className="rubric__why">{g.why}</p>
            {g.status === "met" && g.matched.length > 0 && (
              <p className="rubric__match">
                Found: "{g.matched.join('", "')}"
              </p>
            )}
            {g.status === "missing" && g.hint && <p className="rubric__flag">{g.hint}</p>}
            {g.status === "violated" && (
              <p className="rubric__flag">
                Found in your note: "{g.matched.join('", "')}"
              </p>
            )}
          </li>
        ))}
      </ul>

      {tips.length > 0 && (
        <div className="pitfalls">
          <h3 className="section-head">Wording to tighten</h3>
          <ul>
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="compare">
        <h3 className="section-head">Your note</h3>
        <pre className="note-block">
          {noteSegments.map((seg, i) =>
            seg.kind ? (
              <mark key={i} className={`mark mark--${seg.kind}`}>
                {seg.text}
              </mark>
            ) : (
              seg.text
            )
          )}
        </pre>

        <button className="btn btn--ghost" onClick={() => setShowModel((s) => !s)}>
          {showModel ? "Hide" : "Show"} a strong version of this note
        </button>
        {showModel && (
          <pre className="note-block note-block--model">
            {documentation.modelNote}
          </pre>
        )}
      </div>

      <div className="pitfalls">
        <h3 className="section-head">Common misses on this note type</h3>
        <ul>
          {documentation.pitfalls.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="doc__foot">
        <button className="btn btn--ghost" onClick={onRestart}>
          Run it again
        </button>
        <button className="btn btn--go" onClick={onExit}>
          Back to scenarios
        </button>
      </div>
    </section>
  );
}
