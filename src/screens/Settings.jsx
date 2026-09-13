import { useRef, useState } from "react";
import { getThemePreference, setThemePreference } from "../utils/theme";
import { clearProfileData, exportAllData, importAllData } from "../utils/storage";
import {
  setProfilePin,
  profileHasPin,
  isAdminProfile,
  listProfiles,
  setCanBuildScenarios,
} from "../utils/profiles";
import { isBuilderEnabled, setBuilderEnabled } from "../utils/customScenarios";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Appearance and data controls: the light/dark/system theme picker, an
 * optional PIN for the current profile, a full backup export/import, who's
 * practicing (with a way to switch), and a way to wipe this profile's data.
 */
export default function Settings({ profile, onSwitchProfile }) {
  const [theme, setTheme] = useState(getThemePreference);
  const optionRefs = useRef({});

  const [hasPin, setHasPin] = useState(() => profileHasPin(profile));
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinStatus, setPinStatus] = useState("");

  const [cleared, setCleared] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const fileInputRef = useRef(null);

  const admin = isAdminProfile(profile);
  const [builderEnabled, setBuilderEnabledState] = useState(isBuilderEnabled);
  const [otherProfiles, setOtherProfiles] = useState(() =>
    listProfiles().filter((p) => p.id !== profile.id)
  );

  function handleThemeChange(value) {
    setThemePreference(value);
    setTheme(value);
  }

  // Arrow-key navigation for the theme segmented control, per the ARIA
  // "radio group" pattern: selection follows focus, and only the selected
  // option is normally tab-stoppable (roving tabindex, set in the JSX below).
  function handleThemeKeyDown(e) {
    const idx = THEME_OPTIONS.findIndex((o) => o.value === theme);
    let nextIdx = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIdx = (idx + 1) % THEME_OPTIONS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIdx = (idx - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = THEME_OPTIONS.length - 1;
    }
    if (nextIdx === null) return;
    e.preventDefault();
    const nextValue = THEME_OPTIONS[nextIdx].value;
    handleThemeChange(nextValue);
    optionRefs.current[nextValue]?.focus();
  }

  async function handleSetPin(e) {
    e.preventDefault();
    if (pinDraft.length !== 4) {
      setPinStatus("PIN must be 4 digits.");
      return;
    }
    if (pinDraft !== pinConfirm) {
      setPinStatus("Those two PINs don't match.");
      return;
    }
    await setProfilePin(profile.id, pinDraft);
    setHasPin(true);
    setPinDraft("");
    setPinConfirm("");
    setPinStatus("PIN set.");
  }

  async function handleRemovePin() {
    await setProfilePin(profile.id, null);
    setHasPin(false);
    setPinStatus("PIN removed.");
  }

  function toggleBuilderEnabled() {
    const next = !builderEnabled;
    setBuilderEnabled(next);
    setBuilderEnabledState(next);
  }

  function toggleProfileAccess(id, allowed) {
    setCanBuildScenarios(id, allowed);
    setOtherProfiles(listProfiles().filter((p) => p.id !== profile.id));
  }

  function handleClearData() {
    const ok = window.confirm(
      `Clear all saved progress for ${profile.name}? This can't be undone.`
    );
    if (!ok) return;
    clearProfileData();
    setCleared(true);
  }

  function handleExport() {
    const payload = exportAllData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `charting-practice-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        const ok = window.confirm(
          "Import this backup? It will overwrite any matching profiles, history, and settings already saved in this browser."
        );
        if (!ok) return;
        importAllData(payload);
        window.location.reload();
      } catch {
        setImportStatus("That file couldn't be read as a Charting Practice backup.");
      }
    };
    reader.readAsText(file);
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
              ref={(el) => {
                optionRefs.current[opt.value] = el;
              }}
              type="button"
              role="radio"
              aria-checked={theme === opt.value}
              tabIndex={theme === opt.value ? 0 : -1}
              className={`segmented__option ${
                theme === opt.value ? "segmented__option--active" : ""
              }`}
              onClick={() => handleThemeChange(opt.value)}
              onKeyDown={handleThemeKeyDown}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Security</h2>
        <p className="settings-row settings-row--muted">
          An optional PIN so someone else on this computer can't open your
          profile by mistake. This is a privacy lock, not encryption — it's
          stored only in this browser and isn't a substitute for a real
          account.
        </p>
        {hasPin ? (
          <div className="settings-row">
            <p className="settings-row">A PIN is set for this profile.</p>
            <button className="btn btn--ghost" onClick={handleRemovePin}>
              Remove PIN
            </button>
          </div>
        ) : (
          <form className="pin-form" onSubmit={handleSetPin}>
            <input
              className="profile-gate__input profile-gate__input--pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinDraft}
              onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ""))}
              placeholder="New 4-digit PIN"
            />
            <input
              className="profile-gate__input profile-gate__input--pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirm PIN"
            />
            <button type="submit" className="btn btn--go" disabled={pinDraft.length !== 4}>
              Set PIN
            </button>
          </form>
        )}
        {pinStatus && <p className="settings-row settings-row--muted">{pinStatus}</p>}
      </section>

      {admin && (
        <section className="settings-section">
          <h2 className="settings-section__title">Scenario builder access</h2>
          <p className="settings-row settings-row--muted">
            You created the first profile on this browser, which makes you
            the admin here. This isn't real access control — it's a local,
            soft gate — but it keeps the builder out of the way for people
            who shouldn't be using it day to day.
          </p>
          <label className="field field--checkbox settings-row">
            <input type="checkbox" checked={builderEnabled} onChange={toggleBuilderEnabled} />
            <span>Scenario builder turned on for everyone</span>
          </label>
          {builderEnabled && (
            <div className="settings-row">
              <p className="field__label">Who else can build scenarios</p>
              {otherProfiles.length === 0 ? (
                <p className="settings-row--muted">No other profiles on this browser yet.</p>
              ) : (
                otherProfiles.map((p) => (
                  <label className="field field--checkbox" key={p.id}>
                    <input
                      type="checkbox"
                      checked={Boolean(p.canBuildScenarios)}
                      onChange={(e) => toggleProfileAccess(p.id, e.target.checked)}
                    />
                    <span>{p.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </section>
      )}

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
        <h2 className="settings-section__title">Backup</h2>
        <p className="settings-row settings-row--muted">
          Everything saved in this browser — every profile, their history,
          and this device's theme — as one file you can keep or move to
          another browser.
        </p>
        <div className="settings-row settings-actions">
          <button className="btn btn--ghost" onClick={handleExport}>
            Export a backup
          </button>
          <button className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
            Import a backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImportFile}
          />
        </div>
        {importStatus && <p className="settings-row settings-row--muted">{importStatus}</p>}
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Danger zone</h2>
        <p className="settings-row settings-row--muted">
          Deletes {profile.name}'s saved runs and history. Export a backup
          first if you might want it later.
        </p>
        <button className="btn btn--danger" onClick={handleClearData} disabled={cleared}>
          {cleared ? "Cleared" : "Clear my saved progress"}
        </button>
      </section>
    </div>
  );
}
