import { useState } from "react";
import Notice from "../components/Notice";
import ConfirmDialog from "../components/ConfirmDialog";
import CollapsibleSection from "../components/CollapsibleSection";
import { ChevronIcon } from "../components/icons";
import { slugify } from "../utils/customScenarios";
import { findPossiblePHI } from "../utils/phiCheck";
import { CATEGORIES, categoryDescription } from "../utils/categories";

/** Drops `removed` from an open-item index set and shifts the rest down. */
function withoutIndex(set, removed) {
  const next = new Set();
  set.forEach((i) => {
    if (i === removed) return;
    next.add(i > removed ? i - 1 : i);
  });
  return next;
}

/** A labeled, add/remove-able list of plain-text rows (objectives, hints, medications, ...). */
function StringListEditor({ label, values, onChange, placeholder }) {
  function update(i, value) {
    const next = [...values];
    next[i] = value;
    onChange(next);
  }
  function add() {
    onChange([...values, ""]);
  }
  function remove(i) {
    onChange(values.length > 1 ? values.filter((_, idx) => idx !== i) : [""]);
  }

  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {values.map((v, i) => (
        <div className="field-row" key={i}>
          <input
            className="field-input"
            value={v}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="field-row__remove"
            onClick={() => remove(i)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={add}>
        + Add
      </button>
    </div>
  );
}

function emptyAction(order) {
  return {
    id: "",
    label: "",
    detail: "",
    correct: true,
    order,
    response: "",
    timeCost: 2,
    critical: false,
    criticalWhy: "",
    penalty: "",
  };
}

function emptyRequirement() {
  return { id: "", label: "", keywords: [""], forbidden: [], why: "" };
}

/**
 * Creates or edits one scenario, in the same shape ScenarioPlayer expects
 * (see SCENARIOS.md for the full field reference — this form covers every
 * field that reference documents). Saving writes straight to
 * utils/customScenarios.js; there is no server round-trip to fail.
 */
export default function ScenarioBuilder({ initial, onSave, onCancel, categoriesEnabled = false }) {
  const [scenario, setScenario] = useState(initial);
  const [error, setError] = useState("");
  const [pendingSave, setPendingSave] = useState(null);
  // Which action/requirement editors are expanded, by current index — both
  // start fully collapsed so an existing scenario with several of each
  // doesn't open as one long scroll of fields.
  const [openActions, setOpenActions] = useState(() => new Set());
  const [openRequirements, setOpenRequirements] = useState(() => new Set());

  function toggleActionOpen(i) {
    setOpenActions((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  function toggleRequirementOpen(i) {
    setOpenRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function set(path, value) {
    setScenario((s) => {
      const next = structuredClone(s);
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }

  function updateAction(i, patch) {
    const next = scenario.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    set(["actions"], next);
  }
  function addAction() {
    const correctCount = scenario.actions.filter((a) => a.correct).length;
    const next = [...scenario.actions, emptyAction(correctCount + 1)];
    set(["actions"], next);
    setOpenActions((prev) => new Set(prev).add(next.length - 1));
  }
  function removeAction(i) {
    set(["actions"], scenario.actions.filter((_, idx) => idx !== i));
    setOpenActions((prev) => withoutIndex(prev, i));
  }

  function updateRequirement(i, patch) {
    const next = scenario.documentation.requirements.map((r, idx) =>
      idx === i ? { ...r, ...patch } : r
    );
    set(["documentation", "requirements"], next);
  }
  function addRequirement() {
    const next = [...scenario.documentation.requirements, emptyRequirement()];
    set(["documentation", "requirements"], next);
    setOpenRequirements((prev) => new Set(prev).add(next.length - 1));
  }
  function removeRequirement(i) {
    set(
      ["documentation", "requirements"],
      scenario.documentation.requirements.filter((_, idx) => idx !== i)
    );
    setOpenRequirements((prev) => withoutIndex(prev, i));
  }

  function handleTitleChange(title) {
    setScenario((s) => ({
      ...s,
      title,
      id: s._idTouched ? s.id : slugify(title),
    }));
  }

  function handleIdChange(id) {
    setScenario((s) => ({ ...s, id: slugify(id), _idTouched: true }));
  }

  function validate() {
    if (!scenario.id.trim()) return "Give the scenario a title so it can get an id.";
    if (!scenario.title.trim()) return "A title is required.";
    if (!scenario.opening.trim()) return "The opening narrative can't be empty.";
    if (scenario.actions.length === 0) return "Add at least one action.";
    if (scenario.actions.some((a) => !a.label.trim() || !a.response.trim())) {
      return "Every action needs a label and a response.";
    }
    if (scenario.actions.filter((a) => a.correct).length === 0) {
      return "At least one action needs to be marked correct, or the note screen can never unlock.";
    }
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    const { _idTouched, ...clean } = scenario;
    void _idTouched;

    // A format-based nudge, not a guarantee — see phiCheck.js for why a
    // fictional name can't be distinguished from a real one. Confirming
    // lets the author say "yes, this is deliberately in the scenario."
    const hits = findPossiblePHI(scenario);
    if (hits.length > 0) {
      setPendingSave({ clean, hits });
      return;
    }

    onSave(clean);
  }

  function confirmSaveAnyway() {
    if (pendingSave) onSave(pendingSave.clean);
    setPendingSave(null);
  }

  const p = scenario.patient;
  const doc = scenario.documentation;

  return (
    <form className="page builder" onSubmit={handleSubmit}>
      <header className="page__head">
        <h1>{initial.title ? "Edit scenario" : "New scenario"}</h1>
        <p>Everything here maps directly to a scenario JSON file — see SCENARIOS.md.</p>
      </header>

      <Notice>
        Fictional patients only — do not enter a real patient's name, MRN,
        or other identifying or health information. This is saved in plain
        text in this browser, which is not HIPAA-compliant storage.
      </Notice>

      <CollapsibleSection title="Basics">
        <div className="field-grid">
          <label className="field">
            <span className="field__label">Title</span>
            <input
              className="field-input"
              value={scenario.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Id (auto from title)</span>
            <input className="field-input" value={scenario.id} onChange={(e) => handleIdChange(e.target.value)} />
          </label>
          {categoriesEnabled ? (
            <label className="field">
              <span className="field__label">Category</span>
              <select
                className="field-input"
                value={scenario.category}
                onChange={(e) => set(["category"], e.target.value)}
              >
                <option value="">Choose a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {/* A category typed before the list existed stays selectable,
                    so opening an older scenario doesn't silently blank it. */}
                {scenario.category && !CATEGORIES.some((c) => c.name === scenario.category) && (
                  <option value={scenario.category}>{scenario.category} (current)</option>
                )}
              </select>
              {categoryDescription(scenario.category) && (
                <span className="field__hint">{categoryDescription(scenario.category)}</span>
              )}
            </label>
          ) : (
            <label className="field">
              <span className="field__label">Category</span>
              <input
                className="field-input"
                value={scenario.category}
                onChange={(e) => set(["category"], e.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span className="field__label">Unit</span>
            <input className="field-input" value={scenario.unit} onChange={(e) => set(["unit"], e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Difficulty</span>
            <input
              className="field-input"
              value={scenario.difficulty}
              onChange={(e) => set(["difficulty"], e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Estimated minutes</span>
            <input
              className="field-input"
              type="number"
              min="1"
              value={scenario.estimatedMinutes}
              onChange={(e) => set(["estimatedMinutes"], Number(e.target.value))}
            />
          </label>
        </div>
        <StringListEditor
          label="Objectives"
          values={scenario.objectives}
          onChange={(v) => set(["objectives"], v)}
          placeholder="What the learner should be able to do afterward"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Patient">
        <div className="field-grid">
          <label className="field">
            <span className="field__label">Name</span>
            <input className="field-input" value={p.name} onChange={(e) => set(["patient", "name"], e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Age</span>
            <input
              className="field-input"
              value={p.age}
              onChange={(e) => set(["patient", "age"], Number(e.target.value) || e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Sex</span>
            <input className="field-input" value={p.sex} onChange={(e) => set(["patient", "sex"], e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Room</span>
            <input className="field-input" value={p.room} onChange={(e) => set(["patient", "room"], e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">MRN</span>
            <input className="field-input" value={p.mrn} onChange={(e) => set(["patient", "mrn"], e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Admitted</span>
            <input
              className="field-input"
              value={p.admitted}
              onChange={(e) => set(["patient", "admitted"], e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Code status</span>
            <input className="field-input" value={p.code} onChange={(e) => set(["patient", "code"], e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Fall risk</span>
            <input
              className="field-input"
              value={p.fallRisk}
              onChange={(e) => set(["patient", "fallRisk"], e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Diagnosis</span>
          <input
            className="field-input"
            value={p.diagnosis}
            onChange={(e) => set(["patient", "diagnosis"], e.target.value)}
          />
        </label>
        <StringListEditor
          label="History"
          values={p.history}
          onChange={(v) => set(["patient", "history"], v)}
          placeholder="e.g. Hypertension"
        />
        <StringListEditor
          label="Active medications"
          values={p.medications}
          onChange={(v) => set(["patient", "medications"], v)}
          placeholder="e.g. Metoprolol 25 mg BID"
        />
        <StringListEditor
          label="Allergies"
          values={p.allergies}
          onChange={(v) => set(["patient", "allergies"], v)}
          placeholder="e.g. Penicillin, or NKDA"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Vitals at the start">
        <div className="field-grid field-grid--vitals">
          {Object.keys(scenario.vitals).map((k) => (
            <label className="field" key={k}>
              <span className="field__label">{k}</span>
              <input
                className="field-input"
                value={scenario.vitals[k]}
                onChange={(e) => set(["vitals", k], e.target.value)}
              />
            </label>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Opening">
        <div className="field-grid">
          <label className="field">
            <span className="field__label">Clock start (24h, e.g. 21:04)</span>
            <input
              className="field-input"
              value={scenario.clock.start}
              onChange={(e) => set(["clock", "start"], e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">Clock label</span>
            <input
              className="field-input"
              value={scenario.clock.label}
              onChange={(e) => set(["clock", "label"], e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Narrative — second person, present tense, stop before the assessment</span>
          <textarea
            className="field-input field-textarea"
            rows={4}
            value={scenario.opening}
            onChange={(e) => set(["opening"], e.target.value)}
          />
        </label>
      </CollapsibleSection>

      <CollapsibleSection
        title="Actions"
        hint="five to seven correct, two or three plausible wrong ones"
      >
        {scenario.actions.map((a, i) => {
          const isOpen = openActions.has(i);
          return (
          <div className="action-editor" key={i}>
            <div className="action-editor__head">
              <button
                type="button"
                className="action-editor__head--toggle"
                onClick={() => toggleActionOpen(i)}
                aria-expanded={isOpen}
              >
                <ChevronIcon
                  className={`collapsible__chevron${isOpen ? " collapsible__chevron--open" : ""}`}
                />
                <strong className="action-editor__title">
                  Action {i + 1}
                  {a.label && ` — ${a.label}`}
                </strong>
                {!a.correct && <span className="action-editor__badge">wrong option</span>}
              </button>
              <button type="button" className="field-row__remove" onClick={() => removeAction(i)} aria-label="Remove action">
                ×
              </button>
            </div>
            {isOpen && (
            <>
            <div className="field-grid">
              <label className="field">
                <span className="field__label">Id</span>
                <input
                  className="field-input"
                  value={a.id}
                  onChange={(e) => updateAction(i, { id: slugify(e.target.value) })}
                  placeholder="lowercase-with-dashes"
                />
              </label>
              <label className="field">
                <span className="field__label">Label (button text)</span>
                <input className="field-input" value={a.label} onChange={(e) => updateAction(i, { label: e.target.value })} />
              </label>
              <label className="field field--checkbox">
                <input
                  type="checkbox"
                  checked={a.correct}
                  onChange={(e) => updateAction(i, { correct: e.target.checked })}
                />
                <span>Correct action</span>
              </label>
              {a.correct && (
                <label className="field">
                  <span className="field__label">Order</span>
                  <input
                    className="field-input"
                    type="number"
                    min="1"
                    value={a.order}
                    onChange={(e) => updateAction(i, { order: Number(e.target.value) })}
                  />
                </label>
              )}
              <label className="field">
                <span className="field__label">Time cost (minutes)</span>
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  value={a.timeCost}
                  onChange={(e) => updateAction(i, { timeCost: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="field">
              <span className="field__label">Detail (small grey text under the label)</span>
              <input className="field-input" value={a.detail} onChange={(e) => updateAction(i, { detail: e.target.value })} />
            </label>
            <label className="field">
              <span className="field__label">Response — what happens; on a wrong action, explain the reasoning</span>
              <textarea
                className="field-input field-textarea"
                rows={3}
                value={a.response}
                onChange={(e) => updateAction(i, { response: e.target.value })}
              />
            </label>
            {a.correct ? (
              <>
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked={a.critical}
                    onChange={(e) => updateAction(i, { critical: e.target.checked })}
                  />
                  <span>Critical step (shown in amber as a teaching note)</span>
                </label>
                {a.critical && (
                  <label className="field">
                    <span className="field__label">Why it's critical</span>
                    <input
                      className="field-input"
                      value={a.criticalWhy}
                      onChange={(e) => updateAction(i, { criticalWhy: e.target.value })}
                    />
                  </label>
                )}
              </>
            ) : (
              <label className="field">
                <span className="field__label">Penalty label (short — names the mistake)</span>
                <input
                  className="field-input"
                  value={a.penalty}
                  onChange={(e) => updateAction(i, { penalty: e.target.value })}
                />
              </label>
            )}
            </>
            )}
          </div>
          );
        })}
        <button type="button" className="btn btn--ghost" onClick={addAction}>
          + Add action
        </button>
      </CollapsibleSection>

      <CollapsibleSection title="Hints">
        <StringListEditor
          label="Shown one at a time, gentlest first"
          values={scenario.hints}
          onChange={(v) => set(["hints"], v)}
          placeholder="A nudge toward the next right step"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Documentation">
        <label className="field">
          <span className="field__label">Prompt</span>
          <input
            className="field-input"
            value={doc.prompt}
            onChange={(e) => set(["documentation", "prompt"], e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Placeholder text</span>
          <input
            className="field-input"
            value={doc.placeholder}
            onChange={(e) => set(["documentation", "placeholder"], e.target.value)}
          />
        </label>

        <h3 className="field__label field__label--spaced">Requirements</h3>
        {doc.requirements.map((r, i) => {
          const isOpen = openRequirements.has(i);
          return (
          <div className="action-editor" key={i}>
            <div className="action-editor__head">
              <button
                type="button"
                className="action-editor__head--toggle"
                onClick={() => toggleRequirementOpen(i)}
                aria-expanded={isOpen}
              >
                <ChevronIcon
                  className={`collapsible__chevron${isOpen ? " collapsible__chevron--open" : ""}`}
                />
                <strong className="action-editor__title">
                  Requirement {i + 1}
                  {r.label && ` — ${r.label}`}
                </strong>
              </button>
              <button
                type="button"
                className="field-row__remove"
                onClick={() => removeRequirement(i)}
                aria-label="Remove requirement"
              >
                ×
              </button>
            </div>
            {isOpen && (
            <>
            <div className="field-grid">
              <label className="field">
                <span className="field__label">Id</span>
                <input
                  className="field-input"
                  value={r.id}
                  onChange={(e) => updateRequirement(i, { id: slugify(e.target.value) })}
                />
              </label>
              <label className="field">
                <span className="field__label">Label</span>
                <input
                  className="field-input"
                  value={r.label}
                  onChange={(e) => updateRequirement(i, { label: e.target.value })}
                />
              </label>
            </div>
            <StringListEditor
              label="Keywords (any one counts as a match)"
              values={r.keywords}
              onChange={(v) => updateRequirement(i, { keywords: v })}
              placeholder="a phrase a nurse might actually write"
            />
            <StringListEditor
              label="Forbidden phrases (optional — flips this into a violation check)"
              values={r.forbidden}
              onChange={(v) => updateRequirement(i, { forbidden: v })}
              placeholder="a conclusion the note shouldn't state"
            />
            <label className="field">
              <span className="field__label">Why (shown to the learner either way)</span>
              <input
                className="field-input"
                value={r.why}
                onChange={(e) => updateRequirement(i, { why: e.target.value })}
              />
            </label>
            </>
            )}
          </div>
          );
        })}
        <button type="button" className="btn btn--ghost" onClick={addRequirement}>
          + Add requirement
        </button>

        <label className="field field--spaced">
          <span className="field__label">Model note (should genuinely satisfy every requirement above)</span>
          <textarea
            className="field-input field-textarea"
            rows={6}
            value={doc.modelNote}
            onChange={(e) => set(["documentation", "modelNote"], e.target.value)}
          />
        </label>
        <StringListEditor
          label="Common pitfalls"
          values={doc.pitfalls}
          onChange={(v) => set(["documentation", "pitfalls"], v)}
          placeholder="A mistake worth naming"
        />
      </CollapsibleSection>

      {error && <p className="builder__error">{error}</p>}

      <div className="doc__foot">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--go">
          Save scenario
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(pendingSave)}
        message={
          pendingSave &&
          `This scenario looks like it might contain ${pendingSave.hits.join(" and ")}. ` +
            "Double-check every patient here is fictional before saving — " +
            "this can only flag formats like these, not verify a name is made up. Save anyway?"
        }
        confirmLabel="Save anyway"
        danger
        onConfirm={confirmSaveAnyway}
        onCancel={() => setPendingSave(null)}
      />
    </form>
  );
}
