import { useState } from "react";
import { InfoIcon, CloseIcon } from "./icons";

/**
 * A small floating reference, reachable throughout "care" and
 * "documentation", for anyone who wants to re-check the charting-format
 * example (see FormatExample.jsx, shown once on the scenario's brief
 * screen) without leaving where they are or losing a note in progress —
 * it's just local open/closed state, no navigation involved. `lines` is
 * the same set ScenarioPlayer picked and showed on the brief screen for
 * this run, passed down so the two stay consistent with each other.
 */
export default function FormatExampleBubble({ lines }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="format-bubble">
      {open && (
        <div className="format-bubble__popover" role="dialog" aria-label="Charting format example">
          <div className="format-bubble__head">
            <span className="format-bubble__title">Charting format</span>
            <button
              type="button"
              className="format-bubble__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="format-example__sample">
            {lines.map((line) => (
              <p className="format-example__line" key={line.at}>
                <span className="entry__time">{line.at}</span> {line.text}
              </p>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        className="format-bubble__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide charting format example" : "Show charting format example"}
        aria-expanded={open}
      >
        <InfoIcon />
      </button>
    </div>
  );
}
