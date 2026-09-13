import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { HomeIcon, HistoryIcon, SettingsIcon, PencilIcon, InfoIcon, MenuIcon, CloseIcon } from "./icons";

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
 *
 * On narrow screens the links and profile move into a slide-in side
 * drawer behind a menu button, instead of wrapping into a second row —
 * see the `.nav__drawer` rules in index.css for the breakpoint.
 */
export default function NavBar({ profile, view, showBuilder, onNavigate, onSignOut }) {
  const [open, setOpen] = useState(false);

  // Closing on Escape and locking body scroll only matters while the
  // drawer is actually open, so the effect is a no-op (and detaches
  // itself) the rest of the time.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const items = showBuilder
    ? [...BASE_NAV_ITEMS, BUILDER_NAV_ITEM, ABOUT_NAV_ITEM, SETTINGS_NAV_ITEM]
    : [...BASE_NAV_ITEMS, ABOUT_NAV_ITEM, SETTINGS_NAV_ITEM];

  const handleNavigate = (id) => {
    setOpen(false);
    onNavigate(id);
  };

  const handleSignOut = () => {
    setOpen(false);
    onSignOut();
  };

  return (
    <header className="nav">
      <span className="nav__brand">Charting Practice</span>

      <button
        className="nav__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div
        className={`nav__backdrop ${open ? "nav__backdrop--visible" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className={`nav__drawer ${open ? "nav__drawer--open" : ""}`}>
        <nav className="nav__links" aria-label="Main">
          {items.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav__link ${view === id ? "nav__link--active" : ""}`}
              onClick={() => handleNavigate(id)}
            >
              <Icon className="nav__link-icon" />
              {label}
            </button>
          ))}
        </nav>

        <button className="nav__profile" onClick={handleSignOut} title="Sign out">
          <Avatar name={profile.name} size={22} />
          <span className="nav__profile-name">{profile.name}</span>
          <span className="nav__profile-switch">Sign out</span>
        </button>
      </div>
    </header>
  );
}
