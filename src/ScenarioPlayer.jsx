import { useState, useMemo, useRef, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Grading helpers — all local, no network, no API key                */
/* ------------------------------------------------------------------ */

function gradeNote(text, requirements) {
  const haystack = text.toLowerCase();
  return requirements.map((req) => {
    const forbidden = (req.forbidden || []).filter((f) =>
      haystack.includes(f.toLowerCase())
    );
    if (forbidden.length) {
      return { ...req, status: "violated", matched: forbidden };
    }
    if (!req.keywords || req.keywords.length === 0) {
      return { ...req, status: "met", matched: [] };
    }
    const matched = req.keywords.filter((k) =>
      haystack.includes(k.toLowerCase())
    );
    return {
      ...req,
      status: matched.length ? "met" : "missing",
      matched,
    };
  });
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor((total % 1440) / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/* ------------------------------------------------------------------ */

export default function ScenarioPlayer({ scenario, onExit }) {
  const [phase, setPhase] = useState("brief");
  const [taken, setTaken] = useState([]);
  const [log, setLog] = useState([]);
  const [vitals, setVitals] = useState(scenario.vitals);
  const [elapsed, setElapsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [note, setNote] = useState("");
  const [graded, setGraded] = useState(null);
  const [showModel, setShowModel] = useState(false);
  const logEndRef = useRef(null);

  const requiredIds = useMemo(
    () =>
      scenario.actions
        .filter((a) => a.correct)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((a) => a.id),
    [scenario]
  );

  const doneRequired = requiredIds.filter((id) => taken.includes(id));
  const allDone = doneRequired.length === requiredIds.length;
  const missteps = log.filter((e) => e.penalty).length;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

  function takeAction(action) {
    if (taken.includes(action.id)) return;
    setTaken((t) => [...t, action.id]);
    setElapsed((e) => e + (action.timeCost || 1));
    setLog((l) => [
      ...l,
      {
        id: action.id,
        at: addMinutes(scenario.clock.start, elapsed + (action.timeCost || 1)),
        label: action.label,
        response: action.response,
        correct: action.correct,
        penalty: action.penalty,
        critical: action.critical,
        criticalWhy: action.criticalWhy,
      },
    ]);
    if (action.reveals) setVitals((v) => ({ ...v, ...action.reveals }));
  }

  function submitNote() {
    setGraded(gradeNote(note, scenario.documentation.requirements));
    setPhase("feedback");
  }

  function restart() {
    setPhase("brief");
    setTaken([]);
    setLog([]);
    setVitals(scenario.vitals);
    setElapsed(0);
    setHintsUsed(0);
    setNote("");
    setGraded(null);
    setShowModel(false);
  }

  const p = scenario.patient;

  return (
    <div className="sim">
      {/* ---------------- chart rail ---------------- */}
      <aside className="chart">
        <div className="chart__id">
          <h2>{p.name}</h2>
          <p className="chart__line">
            {p.age} {p.sex} &nbsp;·&nbsp; Room {p.room} &nbsp;·&nbsp; {p.mrn}
          </p>
          <p className="chart__dx">{p.diagnosis}</p>
        </div>

        <dl className="vitals">
          {Object.entries(vitals).map(([k, v]) => (
            <div key={k} className="vitals__cell">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="chart__block">
          <h3>Allergies</h3>
          <p className="chart__alert">{p.allergies.join(", ")}</p>
        </div>

        <div className="chart__block">
          <h3>History</h3>
          <ul>
            {p.history.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>

        <div className="chart__block">
          <h3>Active medications</h3>
          <ul>
            {p.medications.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        <div className="chart__block">
          <h3>Status</h3>
          <ul>
            <li>{p.code}</li>
            <li>{p.fallRisk}</li>
            <li>Hospital day {p.admitted.replace("Day ", "")}</li>
          </ul>
        </div>
      </aside>

      {/* ---------------- working area ---------------- */}
      <main className="work">
        <header className="work__head">
          <div>
            <p className="work__eyebrow">
              {scenario.category} · {scenario.unit}
            </p>
            <h1>{scenario.title}</h1>
          </div>
          <div className="clock">
            <span className="clock__time">
              {addMinutes(scenario.clock.start, elapsed)}
            </span>
            <span className="clock__label">
              {elapsed} min {scenario.clock.label.toLowerCase()}
            </span>
          </div>
        </header>

        {phase === "brief" && (
          <section className="panel">
            <p className="narrative">{scenario.opening}</p>
            <div className="objectives">
              <h3>What you're practicing</h3>
              <ol>
                {scenario.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ol>
            </div>
            <button className="btn btn--go" onClick={() => setPhase("care")}>
              Begin
            </button>
          </section>
        )}

        {phase === "care" && (
          <>
            <section className="panel">
              <p className="narrative">{scenario.opening}</p>
            </section>

            <section className="actions">
              <h3 className="section-head">
                What do you do?
                <span className="progress">
                  {doneRequired.length} of {requiredIds.length} key steps
                </span>
              </h3>
              <div className="actions__grid">
                {scenario.actions.map((a) => {
                  const used = taken.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      className={`action ${used ? "action--used" : ""}`}
                      onClick={() => takeAction(a)}
                      disabled={used}
                    >
                      <span className="action__label">{a.label}</span>
                      <span className="action__detail">{a.detail}</span>
                    </button>
                  );
                })}
              </div>

              {hintsUsed < scenario.hints.length && (
                <button
                  className="btn btn--ghost"
                  onClick={() => setHintsUsed((h) => h + 1)}
                >
                  I'm stuck — give me a hint
                </button>
              )}
              {scenario.hints.slice(0, hintsUsed).map((h, i) => (
                <p key={i} className="hint">
                  {h}
                </p>
              ))}
            </section>

            {log.length > 0 && (
              <section className="log">
                <h3 className="section-head">Shift log</h3>
                {log.map((e, i) => (
                  <article
                    key={i}
                    className={`entry ${e.penalty ? "entry--bad" : ""}`}
                  >
                    <span className="entry__time">{e.at}</span>
                    <div className="entry__body">
                      <p className="entry__action">{e.label}</p>
                      <p className="entry__response">{e.response}</p>
                      {e.critical && (
                        <p className="entry__critical">{e.criticalWhy}</p>
                      )}
                      {e.penalty && (
                        <p className="entry__penalty">{e.penalty}</p>
                      )}
                    </div>
                  </article>
                ))}
                <div ref={logEndRef} />
              </section>
            )}

            <div className="gate">
              {allDone ? (
                <>
                  <p className="gate__text">
                    Mr. Brenner is stable and back in bed. Now chart it.
                  </p>
                  <button
                    className="btn btn--go"
                    onClick={() => setPhase("documentation")}
                  >
                    Write the note
                  </button>
                </>
              ) : (
                <p className="gate__text gate__text--wait">
                  Finish caring for the patient before you document. Missing{" "}
                  {requiredIds.length - doneRequired.length} key step
                  {requiredIds.length - doneRequired.length === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          </>
        )}

        {phase === "documentation" && (
          <section className="panel">
            <h3 className="section-head">{scenario.documentation.prompt}</h3>
            <p className="doc__hint">
              Write it the way you would in the chart. Your shift log is below
              if you need to check a finding.
            </p>
            <textarea
              className="notepad"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={scenario.documentation.placeholder}
              rows={16}
              autoFocus
            />
            <div className="doc__foot">
              <span className="doc__count">
                {note.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                className="btn btn--go"
                onClick={submitNote}
                disabled={note.trim().length < 40}
              >
                Submit note
              </button>
            </div>

            <details className="recall">
              <summary>Check my shift log</summary>
              {log.map((e, i) => (
                <p key={i} className="recall__line">
                  <span className="entry__time">{e.at}</span> {e.response}
                </p>
              ))}
            </details>
          </section>
        )}

        {phase === "feedback" && graded && (
          <section className="panel">
            <div className="score">
              <span className="score__big">
                {graded.filter((g) => g.status === "met").length}
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
                  {g.status === "violated" && (
                    <p className="rubric__flag">
                      Found in your note: "{g.matched.join('", "')}"
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <div className="compare">
              <h3 className="section-head">Your note</h3>
              <pre className="note-block">{note}</pre>

              <button
                className="btn btn--ghost"
                onClick={() => setShowModel((s) => !s)}
              >
                {showModel ? "Hide" : "Show"} a strong version of this note
              </button>
              {showModel && (
                <pre className="note-block note-block--model">
                  {scenario.documentation.modelNote}
                </pre>
              )}
            </div>

            <div className="pitfalls">
              <h3 className="section-head">Common misses on this note type</h3>
              <ul>
                {scenario.documentation.pitfalls.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="doc__foot">
              <button className="btn btn--ghost" onClick={restart}>
                Run it again
              </button>
              <button className="btn btn--go" onClick={onExit}>
                Back to scenarios
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
