import { useEffect, useRef, useState } from "react";
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
import AboutContent from "../components/AboutContent";
import AppearanceSettings from "./AppearanceSettings";
import UserManagement from "./UserManagement";
import Previews from "./Previews";
import AccountTools from "./AccountTools";
import { listReleases } from "../utils/releases";
import { ChevronIcon } from "../components/icons";
import {
  listFeatureFlags,
  isFeatureEnabled,
  ACCOUNT_PROFILE_TOOLS_FLAG_ID,
  APPEARANCE_REDESIGN_FLAG_ID,
} from "../utils/featureFlags";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Arrow-key navigation for a segmented/swatch radiogroup, per the ARIA
// "radio group" pattern: selection follows focus, and only the selected
// option is normally tab-stoppable (roving tabindex, set alongside each
// use of this below). Takes the event handler does the ref lookup itself,
// rather than a factory called during render with the ref as an argument
// — the react-hooks/refs rule (rightly) won't allow a ref value anywhere
// near a render-time function call, even just passed through unread.
function rovingKeyDown(options, current, onChange, refs, e) {
  const idx = options.findIndex((o) => o.value === current);
  let nextIdx = null;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIdx = (idx + 1) % options.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIdx = (idx - 1 + options.length) % options.length;
  else if (e.key === "Home") nextIdx = 0;
  else if (e.key === "End") nextIdx = options.length - 1;
  if (nextIdx === null) return;
  e.preventDefault();
  const nextValue = options[nextIdx].value;
  onChange(nextValue);
  refs.current[nextValue]?.focus();
}

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
 * Settings, split into tabs: Appearance (theme, accent color, text size,
 * and — behind the 'appearance-redesign' flag — Density, Corner radius,
 * Animations, Reduce motion, High contrast, a custom accent color, a
 * live preview, and Reset appearance; see AppearanceSettings.jsx),
 * Account (your name, sign out, clear your history — plus a photo,
 * email, password, and social
 * links from AccountTools.jsx, live only once the 'account-profile-tools'
 * feature flag is published), About (the full mission/credits write-up,
 * shared with the top-level About screen — see AboutContent.jsx; dropped
 * once the 'single-about' flag is on), What's
 * new (the full release history), and — admin only — User management
 * (access + accounts) and Previews (feature flags + publishing).
 * Everything admin-only is gated both here (so the tab doesn't even
 * render) and again by RLS in Supabase, so a client-side bug here can't
 * grant access the database would refuse. The current version shows only
 * once, as a quiet footer at the bottom of the page — not repeated per tab.
 *
 * Settings' own navigation is pill tabs by default, or — behind the
 * 'appearance-redesign' flag — a row list with chevrons (a sidebar on a
 * wide screen, stacked above the content on a narrow one), same
 * responsive pattern as Home's care-setting sidebar.
 */
export default function Settings({ profile, onProfileChange, onSignOut, hideAboutTab = false }) {
  const admin = isAdminProfile(profile);
  // With the 'single-about' flag the nav bar's About page is the only About,
  // so the tab here is dropped rather than duplicating it.
  const baseTabs = hideAboutTab ? BASE_TABS.filter((t) => t.id !== "about") : BASE_TABS;
  const tabs = admin ? [...baseTabs, ...ADMIN_TABS] : baseTabs;
  const [tab, setTab] = useState("appearance");

  const [theme, setTheme] = useState(getThemePreference);
  const themeRefs = useRef({});
  const [accent, setAccent] = useState(getAccentPreference);
  const accentRefs = useRef({});
  const [customAccentHex, setCustomAccentHexState] = useState(getCustomAccentColor);
  const [textSize, setTextSize] = useState(getTextSizePreference);
  const sizeRefs = useRef({});
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
  const [accountToolsFlag, setAccountToolsFlag] = useState(null);
  const [redesignFlag, setRedesignFlag] = useState(null);
  const redesignOn = isFeatureEnabled(redesignFlag, profile);

  useEffect(() => {
    Promise.all([listReleases(), listFeatureFlags()])
      .then(([r, flags]) => {
        setReleases(r);
        setAccountToolsFlag(flags.find((f) => f.id === ACCOUNT_PROFILE_TOOLS_FLAG_ID) || null);
        setRedesignFlag(flags.find((f) => f.id === APPEARANCE_REDESIGN_FLAG_ID) || null);
      })
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

  function handleThemeKeyDown(e) {
    rovingKeyDown(THEME_OPTIONS, theme, handleThemeChange, themeRefs, e);
  }

  function handleAccentKeyDown(e) {
    rovingKeyDown(ACCENT_OPTIONS, accent, handleAccentChange, accentRefs, e);
  }

  function handleTextSizeKeyDown(e) {
    rovingKeyDown(TEXT_SIZE_OPTIONS, textSize, handleTextSizeChange, sizeRefs, e);
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

  // Everything except Appearance renders the same regardless of the
  // redesign flag — only Appearance's own content and Settings' nav
  // chrome differ.
  const otherTabContent = (
    <>
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

      {tab === "about" && !hideAboutTab && <AboutContent />}

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

  const appearanceContent = redesignOn ? (
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
  ) : (
    <section className="settings-section">
      <h2 className="settings-section__title">Appearance</h2>

      <p className="field__label">Theme</p>
      <div className="segmented settings-row" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            ref={(el) => {
              themeRefs.current[opt.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={theme === opt.value}
            tabIndex={theme === opt.value ? 0 : -1}
            className={`segmented__option ${theme === opt.value ? "segmented__option--active" : ""}`}
            onClick={() => handleThemeChange(opt.value)}
            onKeyDown={handleThemeKeyDown}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="field__label field__label--spaced">Accent color</p>
      <div className="swatch-picker settings-row" role="radiogroup" aria-label="Accent color">
        {ACCENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            ref={(el) => {
              accentRefs.current[opt.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={accent === opt.value}
            tabIndex={accent === opt.value ? 0 : -1}
            className={`swatch ${accent === opt.value ? "swatch--active" : ""}`}
            style={{ background: opt.swatch }}
            onClick={() => handleAccentChange(opt.value)}
            onKeyDown={handleAccentKeyDown}
          >
            <span className="sr-only">{opt.label}</span>
          </button>
        ))}
      </div>

      <p className="field__label field__label--spaced">Text size</p>
      <div className="segmented" role="radiogroup" aria-label="Text size">
        {TEXT_SIZE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            ref={(el) => {
              sizeRefs.current[opt.value] = el;
            }}
            type="button"
            role="radio"
            aria-checked={textSize === opt.value}
            tabIndex={textSize === opt.value ? 0 : -1}
            className={`segmented__option ${textSize === opt.value ? "segmented__option--active" : ""}`}
            onClick={() => handleTextSizeChange(opt.value)}
            onKeyDown={handleTextSizeKeyDown}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );

  const activeTabContent = tab === "appearance" ? appearanceContent : otherTabContent;

  return (
    <div className="page">
      <header className="page__head">
        <h1>Settings</h1>
        <p>Appearance and your account.</p>
      </header>

      {redesignOn ? (
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
      ) : (
        <>
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
          {activeTabContent}
          {releases?.[0] && <p className="settings-footer">Charting Practice v{releases[0].version}</p>}
        </>
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
