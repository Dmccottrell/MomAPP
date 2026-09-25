import { useState, useMemo, useEffect } from "react";
import PatientChart from "./components/PatientChart";
import ActionList from "./components/ActionList";
import ShiftLog from "./components/ShiftLog";
import NoteEditor from "./components/NoteEditor";
import NoteFeedback from "./components/NoteFeedback";
import FormatExample from "./components/FormatExample";
import FormatExampleBubble from "./components/FormatExampleBubble";
import { gradeNote, noteTips } from "./utils/grading";
import { addMinutes } from "./utils/time";
import { loadRun, saveRun, clearRun, addHistoryEntry } from "./utils/storage";
import { pickChartingFormatExample } from "./utils/chartingFormatExample";

/**
 * Runs a single scenario from start to finish.
 *
 * Owns all state for the run — which actions were taken, the shift log,
 * the clock, the note, and the grade — and decides which of the four
 * phases is showing: "brief" -> "care" -> "documentation" -> "feedback".
 * The phase components themselves (PatientChart, ActionList, ShiftLog,
 * NoteEditor, NoteFeedback) are presentational; all the logic lives here.
 *
 * In-progress state is mirrored to this device's localStorage (see the
 * effect below), scoped to the signed-in profile, so refreshing mid-"care"
 * or mid-"documentation" resumes rather than starting over. A completed
 * run is recorded to the shared database instead (see submitNote).
 */
export default function ScenarioPlayer({ scenario, profile, onExit }) {
  // Read once, at mount, whatever run was last saved for this scenario.
  const [resumed] = useState(() => loadRun(profile.id, scenario.id));

  // Picked fresh on mount (a new scenario, or reopening one) and again on
  // restart() (hitting Begin again on one already in progress), excluding
  // whichever index was shown last time so a restart never repeats the
  // same example — see utils/chartingFormatExample.js. Shared by
  // FormatExample and FormatExampleBubble so the same lines stay
  // consistent with each other within one run.
  const [formatExample, setFormatExample] = useState(() => pickChartingFormatExample());

  const [phase, setPhase] = useState(resumed?.phase ?? "brief");
  const [taken, setTaken] = useState(resumed?.taken ?? []);
  const [log, setLog] = useState(resumed?.log ?? []);
  const [vitals, setVitals] = useState(resumed?.vitals ?? scenario.vitals);
  const [elapsed, setElapsed] = useState(resumed?.elapsed ?? 0);
  const [hintsUsed, setHintsUsed] = useState(resumed?.hintsUsed ?? 0);
  const [note, setNote] = useState(resumed?.note ?? "");
  const [graded, setGraded] = useState(null);
  const [tips, setTips] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);

  // Keep the saved run in sync with state. Only "care" and "documentation"
  // are worth resuming — "brief" has nothing to lose, and "feedback" is
  // already graded and recorded in history, so both clear the save instead.
  useEffect(() => {
    if (phase === "care" || phase === "documentation") {
      saveRun(profile.id, scenario.id, { phase, taken, log, vitals, elapsed, hintsUsed, note });
    } else {
      clearRun(profile.id, scenario.id);
    }
  }, [profile.id, scenario.id, phase, taken, log, vitals, elapsed, hintsUsed, note]);

  // The correct actions, in clinical order — this is the checklist the
  // learner must clear before the note screen unlocks.
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

  /**
   * Records one action: marks it taken (actions can only be taken once),
   * advances the clock by its time cost, appends a shift-log entry, and
   * applies any vitals it reveals.
   */
  function takeAction(action) {
    if (taken.includes(action.id)) return;
    const cost = action.timeCost || 1;
    setTaken((t) => [...t, action.id]);
    setElapsed((e) => e + cost);
    setLog((l) => [
      ...l,
      {
        id: action.id,
        at: addMinutes(scenario.clock.start, elapsed + cost),
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

  /**
   * Grades the note against the scenario's documentation requirements,
   * records the attempt to history, and advances to the feedback screen.
   * The feedback screen shows immediately on the local grade — the history
   * write happens in the background, since the learner shouldn't wait on
   * a network round-trip to see their own score. If it can't reach the
   * server the run is kept on this device and saved later (see
   * flushPendingHistory), and the feedback screen says so.
   */
  function submitNote() {
    const result = gradeNote(note, scenario.documentation.requirements);
    setGraded(result);
    setTips(noteTips(note));
    setPhase("feedback");
    setSaveStatus(null);
    addHistoryEntry(
      {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        score: result.filter((g) => g.status === "met").length,
        total: result.length,
        missteps,
      },
      profile.id
    )
      .then(setSaveStatus)
      .catch(() => setSaveStatus("failed"));
  }

  /** Resets every piece of run state so the same scenario can be replayed from the brief screen. */
  function restart() {
    setPhase("brief");
    setTaken([]);
    setLog([]);
    setVitals(scenario.vitals);
    setElapsed(0);
    setHintsUsed(0);
    setNote("");
    setGraded(null);
    setTips([]);
    setSaveStatus(null);
    setFormatExample((prev) => pickChartingFormatExample(prev.index));
  }

  const p = scenario.patient;
  const remaining = requiredIds.length - doneRequired.length;

  return (
    <div className="sim">
      <PatientChart patient={p} vitals={vitals} />

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
            <FormatExample lines={formatExample.lines} />
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

            <ActionList
              actions={scenario.actions}
              taken={taken}
              onTake={takeAction}
              requiredCount={requiredIds.length}
              doneCount={doneRequired.length}
              hints={scenario.hints}
              hintsUsed={hintsUsed}
              onHint={() => setHintsUsed((h) => h + 1)}
            />

            <ShiftLog log={log} />

            <div className="gate">
              {allDone ? (
                <>
                  <p className="gate__text">
                    {note.trim()
                      ? "Reviewed what you needed? Back to your note."
                      : `${p.name} is stable and back in bed. Now chart it.`}
                  </p>
                  <button
                    className="btn btn--go"
                    onClick={() => setPhase("documentation")}
                  >
                    {note.trim() ? "Continue the note" : "Write the note"}
                  </button>
                </>
              ) : (
                <p className="gate__text gate__text--wait">
                  Finish caring for the patient before you document. Missing{" "}
                  {remaining} key step{remaining === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          </>
        )}

        {phase === "documentation" && (
          <NoteEditor
            documentation={scenario.documentation}
            note={note}
            onChange={setNote}
            onSubmit={submitNote}
            log={log}
            onBack={() => setPhase("care")}
          />
        )}

        {phase === "feedback" && graded && (
          <NoteFeedback
            graded={graded}
            tips={tips}
            saveStatus={saveStatus}
            missteps={missteps}
            note={note}
            documentation={scenario.documentation}
            onRestart={restart}
            onExit={onExit}
          />
        )}
      </main>

      {(phase === "care" || phase === "documentation") && (
        <FormatExampleBubble lines={formatExample.lines} />
      )}
    </div>
  );
}
