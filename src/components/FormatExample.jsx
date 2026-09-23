import { CHARTING_FORMAT_SAMPLE_LINES } from "../utils/chartingFormatExample";

/**
 * A quick "here's the shape of a good note" reference shown before a
 * scenario begins — one timestamp per entry, in the order things actually
 * happened, not everything noticed dumped at the end. Deliberately generic
 * (see utils/chartingFormatExample.js) so it teaches the convention
 * without giving away any real scenario's content. The same content stays
 * reachable once the scenario is under way via FormatExampleBubble.
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
        {CHARTING_FORMAT_SAMPLE_LINES.map((line) => (
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
