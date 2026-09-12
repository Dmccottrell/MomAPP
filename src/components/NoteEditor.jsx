/**
 * The free-text note editor shown once the learner has finished caring for
 * the patient. Shows a live word count and gates submission on a minimum
 * length, with a collapsible recall panel of the shift log in case they
 * need to check a finding while writing.
 */
export default function NoteEditor({ documentation, note, onChange, onSubmit, log }) {
  const wordCount = note.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section className="panel">
      <h3 className="section-head">{documentation.prompt}</h3>
      <p className="doc__hint">
        Write it the way you would in the chart. Your shift log is below if
        you need to check a finding.
      </p>
      <textarea
        className="notepad"
        value={note}
        onChange={(e) => onChange(e.target.value)}
        placeholder={documentation.placeholder}
        rows={16}
        autoFocus
      />
      <div className="doc__foot">
        <span className="doc__count">{wordCount} words</span>
        <button
          className="btn btn--go"
          onClick={onSubmit}
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
  );
}
