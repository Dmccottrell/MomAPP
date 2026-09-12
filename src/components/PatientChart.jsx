/**
 * The pinned patient chart shown alongside every phase of a scenario.
 * Purely presentational: it just renders the patient record and the
 * current vitals, which change as the learner takes actions that
 * `reveal` new readings.
 */
export default function PatientChart({ patient, vitals }) {
  return (
    <aside className="chart">
      <div className="chart__id">
        <h2>{patient.name}</h2>
        <p className="chart__line">
          {patient.age} {patient.sex} &nbsp;·&nbsp; Room {patient.room}{" "}
          &nbsp;·&nbsp; {patient.mrn}
        </p>
        <p className="chart__dx">{patient.diagnosis}</p>
      </div>

      <dl className="vitals">
        {Object.entries(vitals).map(([k, v]) => (
          // Keying on the value (not just k) remounts a cell when its
          // reading changes, which replays the "just updated" flash
          // animation defined in index.css — no extra state needed.
          <div key={`${k}-${v}`} className="vitals__cell">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="chart__block">
        <h3>Allergies</h3>
        <p className="chart__alert">{patient.allergies.join(", ")}</p>
      </div>

      <div className="chart__block">
        <h3>History</h3>
        <ul>
          {patient.history.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>

      <div className="chart__block">
        <h3>Active medications</h3>
        <ul>
          {patient.medications.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>

      <div className="chart__block">
        <h3>Status</h3>
        <ul>
          <li>{patient.code}</li>
          <li>{patient.fallRisk}</li>
          <li>Hospital day {patient.admitted.replace("Day ", "")}</li>
        </ul>
      </div>
    </aside>
  );
}
