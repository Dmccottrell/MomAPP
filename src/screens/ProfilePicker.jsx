import { useState } from "react";
import Avatar from "../components/Avatar";
import { LockIcon, TrashIcon } from "../components/icons";
import {
  listProfiles,
  createProfile,
  findProfileByName,
  setCurrentProfileId,
  profileHasPin,
  verifyProfilePin,
  deleteProfile,
} from "../utils/profiles";

/**
 * Shown before anything else when no profile is active. Stands in for
 * sign-in/sign-up without a backend: pick a name that's used this browser
 * before, or type a new one. Typing a name that already exists reconnects
 * to that same profile (and its history) instead of creating a duplicate.
 *
 * There are no real passwords — a profile's optional PIN (set in Settings)
 * is a privacy lock against someone else on the same computer, not
 * encryption, and this screen is the one place it's actually enforced:
 * both picking a profile from the list and retyping its name route
 * through `requestEntry` below, so the PIN can't be skipped either way.
 */
export default function ProfilePicker({ onSelect }) {
  const [profiles, setProfiles] = useState(listProfiles);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  function requestEntry(profile) {
    if (profileHasPin(profile)) {
      setPending(profile);
      setPin("");
      setPinError("");
    } else {
      setCurrentProfileId(profile.id);
      onSelect(profile);
    }
  }

  function handleCreate(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = findProfileByName(trimmed);
    if (existing) {
      requestEntry(existing);
    } else {
      onSelect(createProfile(trimmed));
    }
  }

  async function handleUnlock(e) {
    e.preventDefault();
    const ok = await verifyProfilePin(pending.id, pin);
    if (!ok) {
      setPinError("That PIN doesn't match.");
      return;
    }
    setCurrentProfileId(pending.id);
    onSelect(pending);
  }

  function handleRemove(e, profile) {
    e.stopPropagation();
    const ok = window.confirm(
      `Remove "${profile.name}" and everything saved under it? This can't be undone.`
    );
    if (!ok) return;
    deleteProfile(profile.id);
    setProfiles(listProfiles());
  }

  if (pending) {
    return (
      <div className="profile-gate">
        <div className="profile-gate__card">
          <Avatar name={pending.name} size={48} />
          <h1>{pending.name}</h1>
          <p className="profile-gate__lede">Enter your PIN to continue.</p>
          <form className="profile-gate__pin-form" onSubmit={handleUnlock}>
            <input
              className="profile-gate__input profile-gate__input--pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setPinError("");
              }}
              placeholder="4-digit PIN"
              autoFocus
            />
            {pinError && <p className="profile-gate__error">{pinError}</p>}
            <div className="profile-gate__pin-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPending(null)}>
                Back
              </button>
              <button type="submit" className="btn btn--go" disabled={pin.length !== 4}>
                Unlock
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-gate">
      <div className="profile-gate__card">
        <h1>Charting Practice</h1>
        <p className="profile-gate__lede">Who's practicing today?</p>

        {profiles.length > 0 && (
          <ul className="profile-gate__list">
            {profiles.map((p) => (
              <li key={p.id} className="profile-gate__row">
                <button className="profile-gate__profile" onClick={() => requestEntry(p)}>
                  <Avatar name={p.name} />
                  <span className="profile-gate__profile-name">{p.name}</span>
                  {profileHasPin(p) && <LockIcon className="profile-gate__lock" />}
                </button>
                <button
                  className="profile-gate__remove"
                  onClick={(e) => handleRemove(e, p)}
                  aria-label={`Remove ${p.name}`}
                  title={`Remove ${p.name}`}
                >
                  <TrashIcon />
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
            {profiles.length > 0 ? "Continue" : "Get started"}
          </button>
        </form>
        <p className="profile-gate__note">
          No password required — typing a name already on this browser signs
          back into that profile. An optional PIN (set in Settings) can lock
          a profile from casual snooping on a shared computer, but this
          isn't a real account system: everything stays in this browser.
        </p>
      </div>
    </div>
  );
}
