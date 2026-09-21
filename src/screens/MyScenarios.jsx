import { useEffect, useState } from "react";
import ScenarioBuilder from "./ScenarioBuilder";
import Notice from "../components/Notice";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  listCustomScenarios,
  saveCustomScenario,
  deleteCustomScenario,
} from "../utils/customScenarios";

function blankScenario() {
  return {
    id: "",
    title: "",
    category: "",
    unit: "",
    difficulty: "Foundational",
    estimatedMinutes: 10,
    objectives: [""],
    patient: {
      name: "",
      age: "",
      sex: "",
      room: "",
      mrn: "",
      admitted: "Day 1",
      diagnosis: "",
      history: [""],
      medications: [""],
      allergies: [""],
      code: "Full code",
      fallRisk: "",
    },
    vitals: { bp: "", hr: "", rr: "", temp: "", spo2: "", pain: "" },
    opening: "",
    clock: { start: "08:00", label: "Time since found" },
    actions: [],
    hints: [""],
    documentation: {
      prompt: "Write your note for this scenario.",
      placeholder: "Begin with the time and what you found...",
      requirements: [],
      modelNote: "",
      pitfalls: [""],
    },
  };
}

/**
 * Scenarios created in the builder, kept on their own screen and
 * deliberately separate from the Home list of preset scenarios — these
 * are shared, editable, deletable content, not the shipped set.
 */
export default function MyScenarios({ profile, onPlay, categoriesEnabled = false }) {
  const [scenarios, setScenarios] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    listCustomScenarios()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }

  async function handleSave(scenario) {
    try {
      await saveCustomScenario(scenario, profile.id);
      refresh();
      setEditing(null);
    } catch (err) {
      setError(err.message || "Couldn't save that scenario.");
    }
  }

  function handleDelete(id) {
    setDeleteId(id);
  }

  async function runDelete() {
    const id = deleteId;
    setDeleteId(null);
    try {
      await deleteCustomScenario(id);
      refresh();
    } catch (err) {
      setError(err.message || "Couldn't delete that scenario.");
    }
  }

  if (editing) {
    return (
      <ScenarioBuilder
        initial={editing}
        categoriesEnabled={categoriesEnabled}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="page">
      <header className="page__head">
        <h1>My scenarios</h1>
        <p>Scenarios built in-app, shared with everyone here. Not the preset list on Home.</p>
      </header>

      <Notice>
        Fictional patients only. Do not enter a real patient's name, MRN, or
        any other identifying or health information here — this is saved in
        a shared database, not a HIPAA-compliant medical record system.
      </Notice>

      {error && <p className="builder__error">{error}</p>}

      <button className="btn btn--go" onClick={() => setEditing(blankScenario())}>
        + New scenario
      </button>

      {scenarios === null ? null : scenarios.length === 0 ? (
        <p className="empty" style={{ marginTop: "1.5rem" }}>
          Nothing here yet — build one and it'll show up on this page, playable
          just like the presets.
        </p>
      ) : (
        <ul className="cases" style={{ marginTop: "1.5rem" }}>
          {scenarios.map((s) => (
            <li key={s.id}>
              <div className="case case--custom">
                <span className="case__cat">{s.category || "Custom"}</span>
                <span className="case__title">{s.title || "Untitled scenario"}</span>
                <span className="case__meta">
                  {s.unit || "—"} · {s.difficulty} · about {s.estimatedMinutes} min
                </span>
                <div className="case__actions">
                  <button className="btn btn--go btn--sm" onClick={() => onPlay(s)}>
                    Play
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(s)}>
                    Edit
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDelete(s.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        message="Delete this scenario? This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={runDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
