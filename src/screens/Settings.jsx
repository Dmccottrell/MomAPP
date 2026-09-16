import { useEffect, useRef, useState } from "react";
import { getThemePreference, setThemePreference } from "../utils/theme";
import { clearMyHistory } from "../utils/storage";
import { isAdminProfile, updateName } from "../utils/profiles";
import ConfirmDialog from "../components/ConfirmDialog";
import ReleaseHistoryList from "../components/ReleaseHistoryList";
import AboutContent from "../components/AboutContent";
import UserManagement from "./UserManagement";
import Previews from "./Previews";
import AccountTools from "./AccountTools";
import { listReleases } from "../utils/releases";
import {
  listFeatureFlags,
  isFeatureEnabled,
  ACCOUNT_PROFILE_TOOLS_FLAG_ID,
} from "../utils/featureFlags";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const BASE_TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "account", label: "Account" },
  { id: "about", label: "About" },
  { id: "whatsnew", label: "What's new" },
];
const ADMIN_TABS = [
  { id: "users", label: "User management" },
  { id: "previews", label: "Previews" },
];

/**
 * Settings, split into tabs: Appearance (theme), Account (your name, sign
 * out, clear your history — plus a photo, email, password, and social
 * links from AccountTools.jsx, live only once the 'account-profile-tools'
 * feature flag is published), About (the full mission/credits write-up,
 * shared with the top-level About screen — see AboutContent.jsx), What's
 * new (the full release history), and — admin only — User management
 * (access + accounts) and Previews (feature flags + publishing).
 * Everything admin-only is gated both here (so the tab doesn't even
 * render) and again by RLS in Supabase, so a client-side bug here can't
 * grant access the database would refuse. The current version shows only
 * once, as a quiet footer at the bottom of the page — not repeated per tab.
 */
export default function Settings({ profile, onProfileChange, onSignOut }) {
  const admin = isAdminProfile(profile);
  const tabs = admin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS;
  const [tab, setTab] = useState("appearance");

  const [theme, setTheme] = useState(getThemePreference);
  const optionRefs = useRef({});

  const [name, setName] = useState(profile.name);
  const [nameStatus, setNameStatus] = useState("");

  const [cleared, setCleared] = useState(false);
  const [clearError, setClearError] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const [releases, setReleases] = useState(null);
  const [accountToolsFlag, setAccountToolsFlag] = useState(null);

  useEffect(() => {
    Promise.all([listReleases(), listFeatureFlags()])
      .then(([r, flags]) => {
        setReleases(r);
        setAccountToolsFlag(flags.find((f) => f.id === ACCOUNT_PROFILE_TOOLS_FLAG_ID) || null);
      })
      .catch(() => setReleases([]));
  }, []);

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

  function handleClearHistory() {
    setConfirmState({
      message: `Clear all of ${profile.name}'s saved history? This can't be undone.`,
      confirmLabel: "Clear history",
      danger: true,
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

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`settings-tab ${tab === t.id ? "settings-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "appearance" && (
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
      )}

      {tab === "account" && (
        <>
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

          {isFeatureEnabled(accountToolsFlag, profile) && (
            <AccountTools profile={profile} onProfileChange={onProfileChange} />
          )}

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
        </>
      )}

      {tab === "about" && <AboutContent />}

      {tab === "whatsnew" && (
        <section className="settings-section">
          <h2 className="settings-section__title">What's new</h2>
          <ReleaseHistoryList releases={releases} />
        </section>
      )}

      {admin && tab === "users" && <UserManagement profile={profile} />}

      {admin && tab === "previews" && <Previews profile={profile} />}

      {releases?.[0] && (
        <p className="settings-footer">Charting Practice v{releases[0].version}</p>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        danger={Boolean(confirmState?.danger)}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
