import { useEffect, useState } from "react";
import { getThemePreference, setThemePreference } from "../utils/theme";
import {
  getAccentPreference,
  setAccentPreference,
  getCustomAccentColor,
  setCustomAccentColor,
  ACCENT_OPTIONS,
} from "../utils/accent";
import { getTextSizePreference, setTextSizePreference, TEXT_SIZE_OPTIONS } from "../utils/textSize";
import { getDensityPreference, setDensityPreference } from "../utils/density";
import { getCornerRadiusPreference, setCornerRadiusPreference } from "../utils/cornerRadius";
import {
  getAnimationsPreference,
  setAnimationsPreference,
  getReduceMotionPreference,
  setReduceMotionPreference,
} from "../utils/motion";
import { getHighContrastPreference, setHighContrastPreference } from "../utils/contrast";
import { resetAppearance } from "../utils/appearanceReset";
import { clearMyHistory } from "../utils/storage";
import { isAdminProfile, updateName } from "../utils/profiles";
import ConfirmDialog from "../components/ConfirmDialog";
import ReleaseHistoryList from "../components/ReleaseHistoryList";
import AppearanceSettings from "./AppearanceSettings";
import UserManagement from "./UserManagement";
import Previews from "./Previews";
import AccountTools from "./AccountTools";
import { listReleases } from "../utils/releases";
import { ChevronIcon } from "../components/icons";
const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const BASE_TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "account", label: "Account" },
  { id: "whatsnew", label: "What's new" },
];
const ADMIN_TABS = [
  { id: "users", label: "User management" },
  { id: "previews", label: "Previews" },
];

/**
 * Settings, split into tabs: Appearance (see AppearanceSettings.jsx),
 * Account (your name, sign out, clear your history, plus a photo, email,
 * password, and social links from AccountTools.jsx), What's new (the full
 * release history), and — admin only — User management (access +
 * accounts) and Previews (feature flags + publishing). About lives only
 * on the top-level About screen.
 * Everything admin-only is gated both here (so the tab doesn't even
 * render) and again by RLS in Supabase, so a client-side bug here can't
 * grant access the database would refuse. The current version shows only
 * once, as a quiet footer at the bottom of the page — not repeated per tab.
 *
 * Settings' own navigation is a row list with chevrons (a sidebar on a
 * wide screen, stacked above the content on a narrow one), same
 * responsive pattern as Home's care-setting sidebar.
 */
export default function Settings({ profile, onProfileChange, onSignOut }) {
  const admin = isAdminProfile(profile);
  const tabs = admin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS;
  const [tab, setTab] = useState("appearance");

  const [theme, setTheme] = useState(getThemePreference);
  const [accent, setAccent] = useState(getAccentPreference);
  const [customAccentHex, setCustomAccentHexState] = useState(getCustomAccentColor);
  const [textSize, setTextSize] = useState(getTextSizePreference);
  const [density, setDensity] = useState(getDensityPreference);
  const [cornerRadius, setCornerRadius] = useState(getCornerRadiusPreference);
  const [animationsEnabled, setAnimationsEnabledState] = useState(getAnimationsPreference);
  const [reduceMotion, setReduceMotionState] = useState(getReduceMotionPreference);
  const [highContrast, setHighContrastState] = useState(getHighContrastPreference);

  const [name, setName] = useState(profile.name);
  const [nameStatus, setNameStatus] = useState("");

  const [cleared, setCleared] = useState(false);
  const [clearError, setClearError] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const [releases, setReleases] = useState(null);

  useEffect(() => {
    listReleases()
      .then(setReleases)
      .catch(() => setReleases([]));
  }, []);

  function handleThemeChange(value) {
    setThemePreference(value);
    setTheme(value);
  }

  function handleAccentChange(value) {
    setAccentPreference(value);
    setAccent(value);
  }

  function handleCustomAccentHex(hex) {
    setCustomAccentColor(hex);
    setCustomAccentHexState(hex);
  }

  function handleTextSizeChange(value) {
    setTextSizePreference(value);
    setTextSize(value);
  }

  function handleDensityChange(value) {
    setDensityPreference(value);
    setDensity(value);
  }

  function handleCornerRadiusChange(value) {
    setCornerRadiusPreference(value);
    setCornerRadius(value);
  }

  function handleAnimationsChange(enabled) {
    setAnimationsPreference(enabled);
    setAnimationsEnabledState(enabled);
  }

  function handleReduceMotionChange(enabled) {
    setReduceMotionPreference(enabled);
    setReduceMotionState(enabled);
  }

  function handleHighContrastChange(enabled) {
    setHighContrastPreference(enabled);
    setHighContrastState(enabled);
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

  function handleResetAppearance() {
    setConfirmState({
      message: "Restore all appearance settings to their defaults?",
      confirmLabel: "Reset appearance",
      danger: false,
      onConfirm: runResetAppearance,
    });
  }

  function runResetAppearance() {
    setConfirmState(null);
    resetAppearance();
    setTheme("system");
    setAccent("forest");
    setTextSize("medium");
    setDensity("comfortable");
    setCornerRadius("rounded");
    setAnimationsEnabledState(true);
    setReduceMotionState(false);
    setHighContrastState(false);
  }

  const activeTabContent = (
    <>
      {tab === "appearance" && (
        <AppearanceSettings
          theme={theme}
          themeOptions={THEME_OPTIONS}
          onThemeChange={handleThemeChange}
          accent={accent}
          accentOptions={ACCENT_OPTIONS}
          customAccentHex={customAccentHex}
          onAccentChange={handleAccentChange}
          onCustomAccentHex={handleCustomAccentHex}
          textSize={textSize}
          textSizeOptions={TEXT_SIZE_OPTIONS}
          onTextSizeChange={handleTextSizeChange}
          density={density}
          onDensityChange={handleDensityChange}
          cornerRadius={cornerRadius}
          onCornerRadiusChange={handleCornerRadiusChange}
          animationsEnabled={animationsEnabled}
          onAnimationsChange={handleAnimationsChange}
          reduceMotion={reduceMotion}
          onReduceMotionChange={handleReduceMotionChange}
          highContrast={highContrast}
          onHighContrastChange={handleHighContrastChange}
          onReset={handleResetAppearance}
        />
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

          <AccountTools profile={profile} onProfileChange={onProfileChange} />

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

      {tab === "whatsnew" && (
        <section className="settings-section">
          <h2 className="settings-section__title">What's new</h2>
          <ReleaseHistoryList releases={releases} />
        </section>
      )}

      {admin && tab === "users" && <UserManagement profile={profile} />}

      {admin && tab === "previews" && <Previews profile={profile} />}
    </>
  );

  return (
    <div className="page">
      <header className="page__head">
        <h1>Settings</h1>
        <p>Appearance and your account.</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`settings-nav__row ${tab === t.id ? "settings-nav__row--active" : ""}`}
              aria-current={tab === t.id ? "true" : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <ChevronIcon className="settings-nav__chev" />
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {activeTabContent}
          {releases?.[0] && <p className="settings-footer">Charting Practice v{releases[0].version}</p>}
        </div>
      </div>

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
