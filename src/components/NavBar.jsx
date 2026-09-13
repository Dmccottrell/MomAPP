import Avatar from "./Avatar";
import { HomeIcon, HistoryIcon, SettingsIcon, PencilIcon, InfoIcon } from "./icons";

const BASE_NAV_ITEMS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "history", label: "History", Icon: HistoryIcon },
];

const BUILDER_NAV_ITEM = { id: "scenarios", label: "My Scenarios", Icon: PencilIcon };
const ABOUT_NAV_ITEM = { id: "about", label: "About", Icon: InfoIcon };
const SETTINGS_NAV_ITEM = { id: "settings", label: "Settings", Icon: SettingsIcon };

/**
 * The persistent top bar: brand, the top-level views, and the current
 * profile with sign-out. `showBuilder` is decided by App.jsx (it needs an
 * async database read, so it can't be computed in here). `view` is null
 * while a scenario is active, which just dims the nav links without
 * hiding them — clicking one exits the scenario (the run itself stays
 * saved on this device).
 */
export default function NavBar({ profile, view, showBuilder, onNavigate, onSignOut }) {
  const items = showBuilder
    ? [...BASE_NAV_ITEMS, BUILDER_NAV_ITEM, ABOUT_NAV_ITEM, SETTINGS_NAV_ITEM]
    : [...BASE_NAV_ITEMS, ABOUT_NAV_ITEM, SETTINGS_NAV_ITEM];

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

      <button className="nav__profile" onClick={onSignOut} title="Sign out">
        <Avatar name={profile.name} size={22} />
        <span className="nav__profile-name">{profile.name}</span>
        <span className="nav__profile-switch">Sign out</span>
      </button>
    </header>
  );
}
