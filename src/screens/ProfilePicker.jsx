import { useState } from "react";
import { listProfiles, createProfile, setCurrentProfileId } from "../utils/profiles";

/**
 * Shown before anything else when no profile is active. Stands in for
 * sign-in/sign-up without a backend: pick a name that's used this browser
 * before, or type a new one. There are no passwords — this only keeps
 * separate people's history apart on a shared computer.
 */
export default function ProfilePicker({ onSelect }) {
  const [profiles] = useState(listProfiles);
  const [name, setName] = useState("");

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSelect(createProfile(name));
  }

  function handlePick(profile) {
    setCurrentProfileId(profile.id);
    onSelect(profile);
  }

  return (
    <div className="profile-gate">
      <div className="profile-gate__card">
        <h1>Charting Practice</h1>
        <p className="profile-gate__lede">Who's practicing today?</p>

        {profiles.length > 0 && (
          <ul className="profile-gate__list">
            {profiles.map((p) => (
              <li key={p.id}>
                <button className="profile-gate__profile" onClick={() => handlePick(p)}>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="profile-gate__form" onSubmit={handleCreate}>
          <input
            className="profile-gate__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          <button type="submit" className="btn btn--go" disabled={!name.trim()}>
            {profiles.length > 0 ? "Add profile" : "Get started"}
          </button>
        </form>
        <p className="profile-gate__note">
          No password — this just keeps your history separate if someone
          else uses this browser too.
        </p>
      </div>
    </div>
  );
}
