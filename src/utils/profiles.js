// Local, password-less "who's practicing" profiles. This is not an
// authentication system — it's a per-browser name picker so charting
// history and scores stay separate when more than one person uses the
// same computer. See storage.js for how the current profile scopes what
// gets read and written.

const PROFILES_KEY = "momapp:profiles";
const CURRENT_KEY = "momapp:currentProfile";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

/** Lists every profile ever created on this browser. */
export function listProfiles() {
  return read(PROFILES_KEY, []);
}

/** Creates a new profile, makes it the current one, and returns it. */
export function createProfile(name) {
  const profile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  write(PROFILES_KEY, [...listProfiles(), profile]);
  setCurrentProfileId(profile.id);
  return profile;
}

/** Removes a profile and everything saved under it. */
export function deleteProfile(id) {
  write(PROFILES_KEY, listProfiles().filter((p) => p.id !== id));
  const prefix = `momapp:${id}:`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
  if (getCurrentProfileId() === id) signOut();
}

/** The id of whichever profile is currently active, or null if none has been picked yet. */
export function getCurrentProfileId() {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

/** Marks a profile as the active one. */
export function setCurrentProfileId(id) {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // The picker will just be shown again next visit.
  }
}

/** The full active profile record, or null if none is active or it was deleted. */
export function getCurrentProfile() {
  const id = getCurrentProfileId();
  return listProfiles().find((p) => p.id === id) || null;
}

/** Clears the active profile so the picker shows again, without deleting any saved data. */
export function signOut() {
  try {
    localStorage.removeItem(CURRENT_KEY);
  } catch {
    // ignore
  }
}
