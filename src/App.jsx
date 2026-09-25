import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import NavBar from "./components/NavBar";
import ScenarioPlayer from "./ScenarioPlayer";
import Home from "./screens/Home";
import History from "./screens/History";
import Settings from "./screens/Settings";
import MyScenarios from "./screens/MyScenarios";
import About from "./screens/About";
import Auth from "./screens/Auth";
import SupabaseSetupNotice from "./screens/SupabaseSetupNotice";
import Onboarding from "./screens/Onboarding";
import ResetPassword from "./screens/ResetPassword";
import WhatsNewModal from "./components/WhatsNewModal";
import InstallHint from "./components/InstallHint";
import { isSupabaseConfigured } from "./utils/supabaseClient";
import { getSession, onAuthChange, signOut } from "./utils/auth";
import {
  getProfile,
  canBuildScenarios,
  needsOnboarding,
  markOnboardingSeen,
  markVersionSeen,
} from "./utils/profiles";
import { listCustomScenarios, isBuilderEnabled } from "./utils/customScenarios";
import { latestRelease } from "./utils/releases";
import { listFeatureFlags, isFeatureEnabled, SCENARIO_BATCH_HN1_FLAG_ID } from "./utils/featureFlags";
import { withViewTransition } from "./utils/viewTransition";
import fall01 from "./scenarios/fall-01.json";
import changeOfCondition01 from "./scenarios/change-of-condition-01.json";
import labUti01 from "./scenarios/lab-uti-01.json";
import medHypoglycemia01 from "./scenarios/med-hypoglycemia-01.json";
import painPostop01 from "./scenarios/pain-postop-01.json";
import respSob01 from "./scenarios/resp-sob-01.json";
import providerNotifyChestpain01 from "./scenarios/provider-notify-chestpain-01.json";
import admission01 from "./scenarios/admission-01.json";
import transfer01 from "./scenarios/transfer-01.json";
import hospitalReturn01 from "./scenarios/hospital-return-01.json";
import ams01 from "./scenarios/ams-01.json";
import foley01 from "./scenarios/foley-01.json";

// Add new preset scenarios here. One import line per file — that's the
// only code change needed when Mom writes a new case. See SCENARIOS.md for
// the full field reference. Scenarios built in-app (My Scenarios) live in
// the shared database instead — see utils/customScenarios.js.
const SCENARIOS = [fall01, changeOfCondition01];

// AI-drafted, not yet clinically reviewed — gated behind
// SCENARIO_BATCH_HN1_FLAG_ID (preview/admin-only until published) rather
// than added straight to SCENARIOS like a reviewed scenario would be.
const SCENARIO_BATCH_HN1 = [
  labUti01,
  medHypoglycemia01,
  painPostop01,
  respSob01,
  providerNotifyChestpain01,
  admission01,
  transfer01,
  hospitalReturn01,
  ams01,
  foley01,
];

/**
 * App shell. Waits for a Supabase session, loads that session's profile
 * row, then renders a persistent NavBar over whichever of Home / History /
 * Settings / My Scenarios / an active ScenarioPlayer is current. `view`
 * and `activeScenario` are mutually exclusive — picking a scenario or a
 * nav item clears the other.
 */
export default function App() {
  // Nothing to check without config — start "not checking" in that case
  // instead of setting it inside the effect below.
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [view, setView] = useState("home");
  const [activeScenario, setActiveScenario] = useState(null);
  const [customScenarios, setCustomScenarios] = useState([]);
  const [builderEnabled, setBuilderEnabledState] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [whatsNew, setWhatsNew] = useState(null);
  const [scenarioBatchHN1Enabled, setScenarioBatchHN1Enabled] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSession().then((s) => {
      setSession(s);
      setCheckingSession(false);
    });
    return onAuthChange((event, s) => {
      // A reset-password email link lands here as a normal sign-in, but
      // tagged with this event — show the "choose a new password" screen
      // instead of dropping them straight into the app.
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      // Wrapped so signing in/out cross-fades between the Auth screen and
      // the app shell instead of snapping — see utils/viewTransition.js.
      withViewTransition(() => {
        setSession(s);
        if (!s) setProfile(null);
      });
    });
  }, []);

  // profileAttempt exists only so the "Try again" button below can force
  // this to re-run without needing a full page reload.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getProfile(session.user.id)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setProfileError(false);
      })
      .catch(() => {
        if (!cancelled) setProfileError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session, profileAttempt]);

  // Re-checked on every nav switch — cheap, and keeps "who else can build
  // scenarios" changes from Settings reflected without extra plumbing.
  useEffect(() => {
    if (!session) return;
    listCustomScenarios().then(setCustomScenarios).catch(() => setCustomScenarios([]));
    isBuilderEnabled().then(setBuilderEnabledState).catch(() => setBuilderEnabledState(false));
  }, [session, view]);

  // 'scenario-batch-hn-1' adds SCENARIO_BATCH_HN1's 10 scenarios to what
  // Home and History show — kept as a flag (unlike features that shipped
  // and had their flag checks removed) so unreviewed clinical content can
  // be pulled back at any time. Re-checked on each nav switch so
  // publishing/unpublishing shows up without a reload.
  useEffect(() => {
    if (!session || !profile) return;
    let cancelled = false;
    listFeatureFlags()
      .then((flags) => {
        if (cancelled) return;
        const flag = flags.find((f) => f.id === SCENARIO_BATCH_HN1_FLAG_ID);
        setScenarioBatchHN1Enabled(isFeatureEnabled(flag, profile));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, profile, view]);

  // Shows the "what's new" popup once per account per version — see
  // WhatsNewModal.jsx. A profile that's never been checked
  // (last_seen_version is null, e.g. right after signup, or the first
  // load after this feature shipped) gets silently caught up to the
  // current version instead of seeing the popup — there's nothing "new"
  // to someone seeing the app for the first time.
  useEffect(() => {
    if (!profile || needsOnboarding(profile)) return;
    let cancelled = false;
    latestRelease().then((release) => {
      if (cancelled || !release) return;
      if (!profile.last_seen_version) {
        markVersionSeen(profile.id, release.version).catch(() => {});
        setProfile((p) => (p ? { ...p, last_seen_version: release.version } : p));
      } else if (profile.last_seen_version !== release.version) {
        setWhatsNew(release);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!isSupabaseConfigured) return <SupabaseSetupNotice />;
  if (checkingSession) return null;
  if (!session) return <Auth />;
  if (passwordRecovery) {
    return <ResetPassword onDone={() => setPasswordRecovery(false)} />;
  }
  if (profileError) {
    return (
      <div className="profile-gate">
        <div className="profile-gate__card">
          <h1>Charting Practice</h1>
          <p className="profile-gate__lede">Couldn't load your account.</p>
          <button className="btn btn--go" onClick={() => setProfileAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!profile) return null;

  if (needsOnboarding(profile)) {
    return (
      <Onboarding
        profile={profile}
        onDone={() => {
          withViewTransition(() => {
            setProfile((p) => ({ ...p, has_seen_onboarding: true }));
          });
          markOnboardingSeen(profile.id).catch(() => {
            // If this fails, the tour just shows again next sign-in — not harmful.
          });
        }}
      />
    );
  }

  function navigate(nextView) {
    withViewTransition(() => {
      setActiveScenario(null);
      setView(nextView);
    });
  }

  function selectScenario(scenario) {
    withViewTransition(() => setActiveScenario(scenario));
  }

  function exitScenario() {
    withViewTransition(() => setActiveScenario(null));
  }

  function dismissWhatsNew() {
    const version = whatsNew?.version;
    setWhatsNew(null);
    if (!version) return;
    markVersionSeen(profile.id, version).catch(() => {});
    setProfile((p) => (p ? { ...p, last_seen_version: version } : p));
  }

  async function handleSignOut() {
    await signOut();
    setActiveScenario(null);
    setView("home");
    setWhatsNew(null);
  }

  const showBuilder = builderEnabled && canBuildScenarios(profile);

  // Reviewed presets plus, only once published (or for the admin previewing
  // it), the unreviewed batch — see SCENARIO_BATCH_HN1's comment above.
  const visibleScenarios = scenarioBatchHN1Enabled
    ? [...SCENARIOS, ...SCENARIO_BATCH_HN1]
    : SCENARIOS;

  // History needs to resolve a completed run's scenario id back to a
  // playable scenario object even when that scenario was built in-app, so
  // "Practice again" works for custom scenarios too — Home and My Scenarios
  // otherwise keep the two lists deliberately separate.
  const allScenarios = [...visibleScenarios, ...customScenarios];

  let content;
  if (activeScenario) {
    content = (
      <ScenarioPlayer scenario={activeScenario} profile={profile} onExit={exitScenario} />
    );
  } else if (view === "history") {
    content = <History scenarios={allScenarios} profile={profile} onSelectScenario={selectScenario} />;
  } else if (view === "scenarios" && showBuilder) {
    // Guards the same access check the nav bar uses — if it changed since
    // this view was selected (e.g. the admin just revoked access), this
    // falls through to Home instead of rendering the builder anyway.
    content = <MyScenarios profile={profile} onPlay={selectScenario} />;
  } else if (view === "about") {
    content = <About />;
  } else if (view === "settings") {
    content = <Settings profile={profile} onProfileChange={setProfile} onSignOut={handleSignOut} />;
  } else {
    content = <Home scenarios={visibleScenarios} profile={profile} onSelect={selectScenario} />;
  }

  return (
    <div className="app-shell">
      <NavBar
        profile={profile}
        view={activeScenario ? null : view}
        showBuilder={showBuilder}
        onNavigate={navigate}
        onSignOut={handleSignOut}
      />
      {/* Keying on the current screen restarts its entrance animation on every switch. */}
      <div className="app-content" key={activeScenario ? `scenario-${activeScenario.id}` : view}>
        {content}
      </div>
      <WhatsNewModal release={whatsNew} onDismiss={dismissWhatsNew} />
      <InstallHint />
      <Analytics />
    </div>
  );
}
