import { useState } from "react";
import { ChevronIcon } from "./icons";

/**
 * A `.settings-section` card whose body can be folded away — for pages like
 * ScenarioBuilder where every section is long enough that seeing all of
 * them at once is more scrolling than reading. Uncontrolled by default
 * (`defaultOpen`); pass `open`/`onToggle` when the caller needs to drive
 * the state itself (e.g. auto-opening a newly added item).
 */
export default function CollapsibleSection({
  title,
  hint,
  defaultOpen = true,
  open: openProp,
  onToggle,
  headExtra,
  children,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp === undefined ? internalOpen : openProp;

  function toggle() {
    if (onToggle) onToggle(!open);
    else setInternalOpen((o) => !o);
  }

  return (
    <section className="settings-section collapsible">
      <div className="collapsible__head">
        <button
          type="button"
          className="collapsible__toggle"
          onClick={toggle}
          aria-expanded={open}
        >
          <ChevronIcon
            className={`collapsible__chevron${open ? " collapsible__chevron--open" : ""}`}
          />
          <h2 className="settings-section__title">
            {title}
            {hint && <span className="settings-section__hint"> — {hint}</span>}
          </h2>
        </button>
        {headExtra}
      </div>
      {open && <div className="collapsible__body">{children}</div>}
    </section>
  );
}
