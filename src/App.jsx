import { useState } from "react";
import NavBar from "./components/NavBar";
import ScenarioPlayer from "./ScenarioPlayer";
import Home from "./screens/Home";
import History from "./screens/History";
import Settings from "./screens/Settings";
import ProfilePicker from "./screens/ProfilePicker";
import { getCurrentProfile, signOut } from "./utils/profiles";
import fall01 from "./scenarios/fall-01.json";

// Add new scenarios here. One import line per file — that's the only
// code change needed when Mom writes a new case. See SCENARIOS.md for the
// full field reference for a scenario JSON file.
const SCENARIOS = [fall01];

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
      <History scenarios={SCENARIOS} onSelectScenario={setActiveScenario} />
    );
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
