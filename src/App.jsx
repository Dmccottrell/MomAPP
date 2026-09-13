import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import ScenarioPlayer from "./ScenarioPlayer";
import Home from "./screens/Home";
import History from "./screens/History";
import Settings from "./screens/Settings";
import MyScenarios from "./screens/MyScenarios";
import Auth from "./screens/Auth";
import SupabaseSetupNotice from "./screens/SupabaseSetupNotice";
import { isSupabaseConfigured } from "./utils/supabaseClient";
import { getSession, onAuthChange, signOut } from "./utils/auth";
import { getProfile, canBuildScenarios } from "./utils/profiles";
import { listCustomScenarios, isBuilderEnabled } from "./utils/customScenarios";
import fall01 from "./scenarios/fall-01.json";
import changeOfCondition01 from "./scenarios/change-of-condition-01.json";

// Add new preset scenarios here. One import line per file — that's the
// only code change needed when Mom writes a new case. See SCENARIOS.md for
// the full field reference. Scenarios built in-app (My Scenarios) live in
// the shared database instead — see utils/customScenarios.js.
const SCENARIOS = [fall01, changeOfCondition01];

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
  const [view, setView] = useState("home");
  const [activeScenario, setActiveScenario] = useState(null);
  const [customScenarios, setCustomScenarios] = useState([]);
  const [builderEnabled, setBuilderEnabledState] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSession().then((s) => {
      setSession(s);
      setCheckingSession(false);
    });
    return onAuthChange((s) => {
      setSession(s);
      if (!s) setProfile(null);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [session]);

  // Re-checked on every nav switch — cheap, and keeps "who else can build
  // scenarios" changes from Settings reflected without extra plumbing.
  useEffect(() => {
    if (!session) return;
    listCustomScenarios().then(setCustomScenarios).catch(() => setCustomScenarios([]));
    isBuilderEnabled().then(setBuilderEnabledState).catch(() => setBuilderEnabledState(false));
  }, [session, view]);

  if (!isSupabaseConfigured) return <SupabaseSetupNotice />;
  if (checkingSession) return null;
  if (!session) return <Auth />;
  if (!profile) return null;

  function navigate(nextView) {
    setActiveScenario(null);
    setView(nextView);
  }

  async function handleSignOut() {
    await signOut();
    setActiveScenario(null);
    setView("home");
  }

  const showBuilder = builderEnabled && canBuildScenarios(profile);

  // History needs to resolve a completed run's scenario id back to a
  // playable scenario object even when that scenario was built in-app, so
  // "Practice again" works for custom scenarios too — Home and My Scenarios
  // otherwise keep the two lists deliberately separate.
  const allScenarios = [...SCENARIOS, ...customScenarios];

  let content;
  if (activeScenario) {
    content = (
      <ScenarioPlayer
        scenario={activeScenario}
        profile={profile}
        onExit={() => setActiveScenario(null)}
      />
    );
  } else if (view === "history") {
    content = <History scenarios={allScenarios} profile={profile} onSelectScenario={setActiveScenario} />;
  } else if (view === "scenarios" && showBuilder) {
    // Guards the same access check the nav bar uses — if it changed since
    // this view was selected (e.g. the admin just revoked access), this
    // falls through to Home instead of rendering the builder anyway.
    content = <MyScenarios profile={profile} onPlay={setActiveScenario} />;
  } else if (view === "settings") {
    content = <Settings profile={profile} onProfileChange={setProfile} onSignOut={handleSignOut} />;
  } else {
    content = <Home scenarios={SCENARIOS} profile={profile} onSelect={setActiveScenario} />;
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
    </div>
  );
}
