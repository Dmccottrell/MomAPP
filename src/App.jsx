import { useState } from "react";
import NavBar from "./components/NavBar";
import ScenarioPlayer from "./ScenarioPlayer";
import Home from "./screens/Home";
import History from "./screens/History";
import Settings from "./screens/Settings";
import MyScenarios from "./screens/MyScenarios";
import ProfilePicker from "./screens/ProfilePicker";
import { getCurrentProfile, signOut, canBuildScenarios } from "./utils/profiles";
import { listCustomScenarios, isBuilderEnabled } from "./utils/customScenarios";
import fall01 from "./scenarios/fall-01.json";
import changeOfCondition01 from "./scenarios/change-of-condition-01.json";

// Add new preset scenarios here. One import line per file — that's the
// only code change needed when Mom writes a new case. See SCENARIOS.md for
// the full field reference. Scenarios built in-app (My Scenarios) live
// separately in localStorage — see utils/customScenarios.js.
const SCENARIOS = [fall01, changeOfCondition01];

/**
 * App shell: gates everything behind a profile, then renders a persistent
 * NavBar over whichever of Home / History / Settings / an active
 * ScenarioPlayer is current. `view` and `activeScenario` are mutually
 * exclusive — picking a scenario or a nav item clears the other.
 */
export default function App() {
  const [profile, setProfile] = useState(getCurrentProfile);
  const [view, setView] = useState("home");
  const [activeScenario, setActiveScenario] = useState(null);

  if (!profile) {
    return <ProfilePicker onSelect={setProfile} />;
  }

  function navigate(nextView) {
    setActiveScenario(null);
    setView(nextView);
  }

  function switchProfile() {
    signOut();
    setProfile(null);
    setActiveScenario(null);
    setView("home");
  }

  // History needs to resolve a completed run's scenario id back to a
  // playable scenario object even when that scenario was built in-app, so
  // "Practice again" works for custom scenarios too — Home and My Scenarios
  // otherwise keep the two lists deliberately separate.
  const allScenarios = [...SCENARIOS, ...listCustomScenarios()];

  let content;
  if (activeScenario) {
    content = (
      <ScenarioPlayer
        scenario={activeScenario}
        onExit={() => setActiveScenario(null)}
      />
    );
  } else if (view === "history") {
    content = (
      <History scenarios={allScenarios} onSelectScenario={setActiveScenario} />
    );
  } else if (view === "scenarios" && isBuilderEnabled() && canBuildScenarios(profile)) {
    // Guards the same access check the nav bar uses — if it changed since
    // this view was selected (e.g. the admin just revoked access), this
    // falls through to Home instead of rendering the builder anyway.
    content = <MyScenarios onPlay={setActiveScenario} />;
  } else if (view === "settings") {
    content = <Settings profile={profile} onSwitchProfile={switchProfile} />;
  } else {
    content = <Home scenarios={SCENARIOS} onSelect={setActiveScenario} />;
  }

  return (
    <div className="app-shell">
      <NavBar
        profile={profile}
        view={activeScenario ? null : view}
        onNavigate={navigate}
        onSwitchProfile={switchProfile}
      />
      {/* Keying on the current screen restarts its entrance animation on every switch. */}
      <div className="app-content" key={activeScenario ? `scenario-${activeScenario.id}` : view}>
        {content}
      </div>
    </div>
  );
}
