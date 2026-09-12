import Avatar from "./Avatar";
import { HomeIcon, HistoryIcon, SettingsIcon } from "./icons";

const NAV_ITEMS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "history", label: "History", Icon: HistoryIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

/**
 * The persistent top bar: brand, the three top-level views, and the
 * current profile with a quick way to switch. `view` is null while a
 * scenario is active, which just dims the nav links without hiding them —
 * clicking one exits the scenario (the run itself stays saved).
 */
export default function NavBar({ profile, view, onNavigate, onSwitchProfile }) {
  return (
    <header className="nav">
      <span className="nav__brand">Charting Practice</span>

      <nav className="nav__links" aria-label="Main">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
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
