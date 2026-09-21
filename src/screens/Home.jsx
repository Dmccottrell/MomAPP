import { useEffect, useState } from "react";
import { listHistory } from "../utils/storage";
import { CARE_SETTINGS } from "../utils/careSettings";
import { ChevronIcon } from "../components/icons";

/**
 * The scenario picker. Each card shows the scenario's basics plus, once
 * the signed-in user has attempted it, their most recent score for it.
 */
export default function Home({
  scenarios,
  profile,
  onSelect,
  categoriesEnabled = false,
  careSettingsEnabled = false,
}) {
  const [lastByScenario, setLastByScenario] = useState({});
  const [setting, setSetting] = useState("");
  const [category, setCategory] = useState("");

  // Setting narrows first ("" = All, which also includes scenarios with no
  // setting yet), then category narrows within it.
  const inSetting =
    careSettingsEnabled && setting ? scenarios.filter((s) => s.setting === setting) : scenarios;

  // Only categories that have a scenario in the current setting, in the
  // order they first appear — an empty filter button would just lead to an
  // empty list. Filtering is pointless with a single category, so it stays
  // hidden until there are two. A category picked under a previous setting
  // that no longer exists here falls back to "All".
  const categories = [...new Set(inSetting.map((s) => s.category).filter(Boolean))];
  const showFilter = categoriesEnabled && categories.length > 1;
  const activeCategory = showFilter && categories.includes(category) ? category : "";
  const visible = activeCategory ? inSetting.filter((s) => s.category === activeCategory) : inSetting;

  // Cursor-follow spotlight on each card — position only, no animation loop,
  // so there's nothing here for prefers-reduced-motion to guard against.
  // Adapted from reactbits.dev's SpotlightCard (zero dependencies) onto the
  // existing <button class="case">  instead of introducing a wrapper div.
  function trackSpotlight(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  // The filter panel starts closed to keep Home uncluttered; the active
  // filters are summarized next to its button instead.
  const [filterOpen, setFilterOpen] = useState(false);
  const activeFilters = [careSettingsEnabled && setting, activeCategory].filter(Boolean);
  function clearFilters() {
    setSetting("");
    setCategory("");
  }

  useEffect(() => {
    let cancelled = false;
    listHistory(profile.id)
      .then((all) => {
        if (cancelled) return;
        const map = {};
        // Sorted newest-first, so the first entry seen per scenario is the most recent.
        for (const h of all) {
          if (!map[h.scenarioId]) map[h.scenarioId] = h;
        }
        setLastByScenario(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  return (
    <div className="home">
      <header className="home__head">
        <h1>Charting Practice</h1>
        <p>
          Work a patient scenario from start to finish, then write the note.
          Every patient here is fictional.
        </p>
      </header>

      {(careSettingsEnabled || showFilter) && (
        <div className="home-filter">
          <div className="home-filter__bar">
            <button
              type="button"
              className="btn btn--ghost btn--sm home-filter__toggle"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((o) => !o)}
            >
              <ChevronIcon className={filterOpen ? "home-filter__chev home-filter__chev--open" : "home-filter__chev"} />
              Filter
              {activeFilters.length > 0 && <span className="home-filter__count">{activeFilters.length}</span>}
            </button>
            {activeFilters.length > 0 && (
              <>
                <span className="home-filter__summary">{activeFilters.join(" · ")}</span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
                  Clear
                </button>
              </>
            )}
          </div>

          {filterOpen && (
            <div className="home-filter__panel">
              {careSettingsEnabled && (
                <label className="field">
                  <span className="field__label">Care setting</span>
                  <select className="field-input" value={setting} onChange={(e) => setSetting(e.target.value)}>
                    <option value="">All settings</option>
                    {CARE_SETTINGS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {showFilter && (
                <label className="field">
                  <span className="field__label">Category</span>
                  <select
                    className="field-input"
                    value={activeCategory}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 && (
        <p className="home__empty">
          No {setting || "matching"} scenarios yet. New ones show up here as soon as they're added
          with that care setting.
        </p>
      )}

      <ul className="cases">
        {visible.map((s) => {
          const history = lastByScenario[s.id];
          return (
            <li key={s.id}>
              <button className="case" onClick={() => onSelect(s)} onMouseMove={trackSpotlight}>
                <span className="case__cat">
                  {[careSettingsEnabled && s.setting, s.category].filter(Boolean).join(" · ")}
                </span>
                <span className="case__title">{s.title}</span>
                <span className="case__meta">
                  {s.unit} · {s.difficulty} · about {s.estimatedMinutes} min
                </span>
                <span className="case__objectives">{s.objectives[0]}</span>
                {history && (
                  <span className="case__history">
                    Last run: {history.score}/{history.total} ·{" "}
                    {new Date(history.completedAt).toLocaleDateString()}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
