import { useState } from "react";
import { getThemePreference, setThemePreference } from "../utils/theme";
import { clearProfileData } from "../utils/storage";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Appearance and local-data controls: the light/dark/system theme picker,
 * who the current profile is (with a way to switch), and a way to wipe
 * this profile's saved runs and history.
 */
export default function Settings({ profile, onSwitchProfile }) {
  const [theme, setTheme] = useState(getThemePreference);
  const [cleared, setCleared] = useState(false);

  function handleThemeChange(value) {
    setThemePreference(value);
    setTheme(value);
  }

  function handleClearData() {
    const ok = window.confirm(
      `Clear all saved progress for ${profile.name}? This can't be undone.`
    );
    if (!ok) return;
    clearProfileData();
    setCleared(true);
  }

  return (
    <div className="page">
      <header className="page__head">
        <h1>Settings</h1>
        <p>Appearance and your local data.</p>
      </header>

      <section className="settings-section">
        <h2 className="settings-section__title">Appearance</h2>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={theme === opt.value}
              className={`segmented__option ${
                theme === opt.value ? "segmented__option--active" : ""
              }`}
              onClick={() => handleThemeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Profile</h2>
        <p className="settings-row">
          Practicing as <strong>{profile.name}</strong>
        </p>
        <button className="btn btn--ghost" onClick={onSwitchProfile}>
          Switch profile
        </button>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Data</h2>
        <p className="settings-row settings-row--muted">
          Progress and scores are saved only in this browser, under your
          profile.
        </p>
        <button
          className="btn btn--danger"
          onClick={handleClearData}
          disabled={cleared}
        >
          {cleared ? "Cleared" : "Clear my saved progress"}
        </button>
      </section>
    </div>
  );
}
