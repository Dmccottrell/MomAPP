import { useEffect, useRef } from "react";

/**
 * The running record of what happened during the "care" phase — one entry
 * per action the learner has taken, in the order they took it. Renders
 * nothing until the first action is logged, and auto-scrolls to the newest
 * entry whenever the log grows.
 */
export default function ShiftLog({ log }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

  if (log.length === 0) return null;

  return (
    <section className="log">
      <h3 className="section-head">Shift log</h3>
      {log.map((e, i) => (
        <article key={i} className={`entry ${e.penalty ? "entry--bad" : ""}`}>
          <span className="entry__time">{e.at}</span>
          <div className="entry__body">
            <p className="entry__action">{e.label}</p>
            <p className="entry__response">{e.response}</p>
            {e.critical && <p className="entry__critical">{e.criticalWhy}</p>}
            {e.penalty && <p className="entry__penalty">{e.penalty}</p>}
          </div>
        </article>
      ))}
      <div ref={endRef} />
    </section>
  );
}
