import Avatar from "./Avatar";
import { HomeIcon, HistoryIcon, SettingsIcon, PencilIcon } from "./icons";
import { canBuildScenarios } from "../utils/profiles";
import { isBuilderEnabled } from "../utils/customScenarios";

const BASE_NAV_ITEMS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "history", label: "History", Icon: HistoryIcon },
];

const BUILDER_NAV_ITEM = { id: "scenarios", label: "My Scenarios", Icon: PencilIcon };

const SETTINGS_NAV_ITEM = { id: "settings", label: "Settings", Icon: SettingsIcon };

/**
 * The persistent top bar: brand, the top-level views, and the current
 * profile with a quick way to switch. "My Scenarios" only appears when the
 * builder is turned on and this profile has been granted access (see
 * utils/profiles.js and utils/customScenarios.js) — otherwise it's just
 * not there, rather than shown disabled. `view` is null while a scenario
 * is active, which just dims the nav links without hiding them — clicking
 * one exits the scenario (the run itself stays saved).
 */
export default function NavBar({ profile, view, onNavigate, onSwitchProfile }) {
  const showBuilder = isBuilderEnabled() && canBuildScenarios(profile);
  const items = showBuilder
    ? [...BASE_NAV_ITEMS, BUILDER_NAV_ITEM, SETTINGS_NAV_ITEM]
    : [...BASE_NAV_ITEMS, SETTINGS_NAV_ITEM];

  return (
    <header className="nav">
      <span className="nav__brand">Charting Practice</span>

      <nav className="nav__links" aria-label="Main">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav__link ${view === id ? "nav__link--active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon className="nav__link-icon" />
            {label}
          </button>
        ))}
      </nav>

      <button className="nav__profile" onClick={onSwitchProfile} title="Switch profile">
        <Avatar name={profile.name} size={22} />
        <span className="nav__profile-name">{profile.name}</span>
        <span className="nav__profile-switch">Switch</span>
      </button>
    </header>
  );
}
