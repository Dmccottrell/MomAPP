// A made-up event, unrelated to any real scenario in the app — this is a
// generic illustration of the *format*, not an answer key. Swapping it for
// a scenario's own modelNote would spoil that scenario before the learner
// even starts it.
const SAMPLE_LINES = [
  {
    at: "0912",
    text: "Resident reports brief dizziness on standing; found seated, skin pale and diaphoretic. VS: BP 108/64, HR 92, RR 18, SpO2 97% RA.",
  },
  { at: "0915", text: "Assisted to bed, raised HOB 30°, remained at bedside." },
  {
    at: "0922",
    text: "Reassessed: dizziness resolved, color improved, VS stable. Denies chest pain, SOB, or further symptoms.",
  },
  { at: "0925", text: "Charge nurse notified of event and current status; no new orders at this time." },
];

/**
 * A quick "here's the shape of a good note" reference shown before a
 * scenario begins — one timestamp per entry, in the order things actually
 * happened, not everything noticed dumped at the end. Deliberately generic
 * (see SAMPLE_LINES above) so it teaches the convention without giving
 * away any real scenario's content.
 *
 * Doesn't apply to how the *care* steps get clicked through below — those
 * can be taken in whatever order makes sense in the moment; it's only the
 * note afterward that should read chronologically.
 */
export default function FormatExample() {
  return (
    <div className="format-example">
      <h3 className="format-example__title">Charting format</h3>
      <p className="format-example__lede">
        Chart in the order things happened, with its own timestamp on each
        entry — not everything at once, at the end. For example:
      </p>
      <div className="format-example__sample">
        {SAMPLE_LINES.map((line) => (
          <p className="format-example__line" key={line.at}>
            <span className="entry__time">{line.at}</span> {line.text}
          </p>
        ))}
      </div>
      <p className="format-example__note">
        You don't have to care for the patient in this order below — do
        whatever makes sense first. It's the note afterward that should
        read chronologically.
      </p>
    </div>
  );
}
