import { useEffect, useRef, useState } from "react";
import { getThemePreference, setThemePreference } from "../utils/theme";
import { clearMyHistory } from "../utils/storage";
import {
  isAdminProfile,
  listProfiles,
  setCanBuildScenarios,
  updateName,
} from "../utils/profiles";
import { isBuilderEnabled, setBuilderEnabled } from "../utils/customScenarios";
import { sendPasswordReset } from "../utils/auth";
import { deleteAccount } from "../utils/admin";
import ConfirmDialog from "../components/ConfirmDialog";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/**
 * Appearance and account controls: the light/dark/system theme picker,
 * your display name, admin-only scenario-builder access management, and a
 * way to clear your own history.
 */
export default function Settings({ profile, onProfileChange, onSignOut }) {
  const [theme, setTheme] = useState(getThemePreference);
  const optionRefs = useRef({});

  const admin = isAdminProfile(profile);
  const [builderEnabled, setBuilderEnabledState] = useState(true);
  const [otherProfiles, setOtherProfiles] = useState([]);
  const [accessError, setAccessError] = useState("");

  const [name, setName] = useState(profile.name);
  const [nameStatus, setNameStatus] = useState("");

  const [cleared, setCleared] = useState(false);
  const [clearError, setClearError] = useState("");

  const [accountStatus, setAccountStatus] = useState({});

  // Holds the pending action while a ConfirmDialog is up — null means no
  // dialog is showing. Replaces window.confirm(), which iOS silently
  // no-ops once this app is added to the home screen (see ConfirmDialog.jsx).
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (!admin) return;
    isBuilderEnabled().then(setBuilderEnabledState).catch(() => {});
    listProfiles()
      .then((all) => setOtherProfiles(all.filter((p) => p.id !== profile.id)))
      .catch(() => {});
  }, [admin, profile.id]);

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

  async function handleSaveName(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await updateName(profile.id, name);
      onProfileChange({ ...profile, name: name.trim() });
      setNameStatus("Saved.");
    } catch (err) {
      setNameStatus(err.message || "Couldn't save that.");
    }
  }

  async function toggleBuilderEnabled() {
    const next = !builderEnabled;
    try {
      await setBuilderEnabled(next);
      setBuilderEnabledState(next);
    } catch (err) {
      setAccessError(err.message || "Couldn't change that.");
    }
  }

  async function toggleProfileAccess(id, allowed) {
    try {
      await setCanBuildScenarios(id, allowed);
      setOtherProfiles((list) =>
        list.map((p) => (p.id === id ? { ...p, can_build_scenarios: allowed } : p))
      );
    } catch (err) {
      setAccessError(err.message || "Couldn't change that.");
    }
  }

  async function handleResetPassword(p) {
    setAccountStatus((s) => ({ ...s, [p.id]: "Sending…" }));
    try {
      await sendPasswordReset(p.email);
      setAccountStatus((s) => ({ ...s, [p.id]: "Reset email sent." }));
    } catch (err) {
      setAccountStatus((s) => ({ ...s, [p.id]: err.message || "Couldn't send that." }));
    }
  }

  function handleDeleteAccount(p) {
    setConfirmState({
      message: `Permanently delete ${p.name}'s account, including their history? This can't be undone.`,
      confirmLabel: "Delete account",
      onConfirm: () => runDeleteAccount(p),
    });
  }

  async function runDeleteAccount(p) {
    setConfirmState(null);
    setAccountStatus((s) => ({ ...s, [p.id]: "Deleting…" }));
    try {
      await deleteAccount(p.id);
      setOtherProfiles((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setAccountStatus((s) => ({ ...s, [p.id]: err.message || "Couldn't delete that account." }));
    }
  }

  function handleClearHistory() {
    setConfirmState({
      message: `Clear all of ${profile.name}'s saved history? This can't be undone.`,
      confirmLabel: "Clear history",
      onConfirm: runClearHistory,
    });
  }

  async function runClearHistory() {
    setConfirmState(null);
    try {
      await clearMyHistory(profile.id);
      setCleared(true);
    } catch (err) {
      setClearError(err.message || "Couldn't clear that.");
    }
  }

  return (
    <div className="page">
      <header className="page__head">
        <h1>Settings</h1>
        <p>Appearance and your account.</p>
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

      {admin && (
        <section className="settings-section">
          <h2 className="settings-section__title">Scenario builder access</h2>
          <p className="settings-row settings-row--muted">
            You're the admin for this app — the first person to create an
            account. This is enforced by the database, not just the UI, so
            it can't be bypassed from the browser.
          </p>
          <label className="field field--checkbox settings-row">
            <input type="checkbox" checked={builderEnabled} onChange={toggleBuilderEnabled} />
            <span>Scenario builder turned on for everyone</span>
          </label>
          {builderEnabled && (
            <div className="settings-row">
              <p className="field__label">Who else can build scenarios</p>
              {otherProfiles.length === 0 ? (
                <p className="settings-row--muted">No other accounts yet.</p>
              ) : (
                otherProfiles.map((p) => (
                  <label className="field field--checkbox" key={p.id}>
                    <input
                      type="checkbox"
                      checked={Boolean(p.can_build_scenarios)}
                      onChange={(e) => toggleProfileAccess(p.id, e.target.checked)}
                    />
                    <span>{p.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
          {accessError && <p className="settings-row settings-row--muted">{accessError}</p>}
        </section>
      )}

      {admin && (
        <section className="settings-section">
          <h2 className="settings-section__title">Manage accounts</h2>
          <p className="settings-row settings-row--muted">
            Send a password reset, or permanently delete an account.
            Deleting is real server-side deletion — a Supabase Edge
            Function checks you're an admin, then removes the account
            using a key this app's browser code never has access to. Not
            a client-side trick.
          </p>
          {otherProfiles.length === 0 ? (
            <p className="settings-row--muted">No other accounts yet.</p>
          ) : (
            otherProfiles.map((p) => (
              <div className="account-row" key={p.id}>
                <div className="account-row__info">
                  <p className="account-row__name">{p.name}</p>
                  {p.email && <p className="account-row__email">{p.email}</p>}
                </div>
                <div className="account-row__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => handleResetPassword(p)}>
                    Reset password
                  </button>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDeleteAccount(p)}>
                    Delete
                  </button>
                </div>
                {accountStatus[p.id] && (
                  <p className="account-row__status">{accountStatus[p.id]}</p>
                )}
              </div>
            ))
          )}
        </section>
      )}

      <section className="settings-section">
        <h2 className="settings-section__title">Profile</h2>
        <form className="inline-form" onSubmit={handleSaveName}>
          <input
            className="field-input"
            style={{ flex: 1, minWidth: "12rem" }}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameStatus("");
            }}
          />
          <button type="submit" className="btn btn--ghost" disabled={!name.trim()}>
            Save name
          </button>
        </form>
        {nameStatus && <p className="settings-row settings-row--muted">{nameStatus}</p>}
        <button className="btn btn--ghost settings-row" onClick={onSignOut}>
          Sign out
        </button>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Danger zone</h2>
        <p className="settings-row settings-row--muted">
          Deletes {profile.name}'s saved history. Scenarios you've built
          aren't affected.
        </p>
        <button className="btn btn--danger" onClick={handleClearHistory} disabled={cleared}>
          {cleared ? "Cleared" : "Clear my history"}
        </button>
        {clearError && <p className="settings-row settings-row--muted">{clearError}</p>}
      </section>

      <ConfirmDialog
        open={Boolean(confirmState)}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
