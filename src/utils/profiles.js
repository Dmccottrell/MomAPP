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

/** Finds an existing profile by name (trimmed, case-insensitive), or null. */
export function findProfileByName(name) {
  const target = name.trim().toLowerCase();
  return listProfiles().find((p) => p.name.toLowerCase() === target) || null;
}

/**
 * Creates a new profile, makes it the current one, and returns it. The
 * very first profile ever created on this browser becomes the admin and
 * starts with scenario-builder access; everyone after that starts without
 * it, and needs the admin to grant it in Settings.
 */
export function createProfile(name) {
  const existing = listProfiles();
  const isFirst = existing.length === 0;
  const profile = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    pinHash: null,
    isAdmin: isFirst,
    canBuildScenarios: isFirst,
  };
  write(PROFILES_KEY, [...existing, profile]);
  setCurrentProfileId(profile.id);
  return profile;
}

/**
 * True if this profile is the admin for this browser. There's no real
 * access control behind this — it's a soft, local-only distinction (see
 * setCanBuildScenarios below) — but it lets one profile gate a feature for
 * the others sharing this computer. Profiles created before this existed
 * have no `isAdmin` field, so as a fallback the earliest-created profile is
 * treated as admin until one is explicitly flagged.
 */
export function isAdminProfile(profile) {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  const all = listProfiles();
  if (all.some((p) => p.isAdmin)) return false;
  const earliest = [...all].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  return earliest?.id === profile.id;
}

/** True if this profile can use the scenario builder — admins always can. */
export function canBuildScenarios(profile) {
  return isAdminProfile(profile) || Boolean(profile?.canBuildScenarios);
}

/** Admin-only: grants or revokes another profile's scenario-builder access. */
export function setCanBuildScenarios(id, allowed) {
  write(
    PROFILES_KEY,
    listProfiles().map((p) => (p.id === id ? { ...p, canBuildScenarios: allowed } : p))
  );
}

/** True if a profile has a PIN set. */
export function profileHasPin(profile) {
  return Boolean(profile?.pinHash);
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sets, changes, or (with pin=null) removes a profile's PIN. This is a
 * privacy lock against someone else on the same computer casually opening
 * your profile — not real encryption. The PIN is hashed (salted with the
 * profile id) rather than stored as plain text, but anyone with access to
 * this browser's storage and dev tools could still bypass it.
 */
export async function setProfilePin(id, pin) {
  const profiles = listProfiles();
  const updated = await Promise.all(
    profiles.map(async (p) =>
      p.id === id ? { ...p, pinHash: pin ? await sha256Hex(`${id}:${pin}`) : null } : p
    )
  );
  write(PROFILES_KEY, updated);
}

/** Checks a PIN against a profile. Returns true if the profile has no PIN set. */
export async function verifyProfilePin(id, pin) {
  const profile = listProfiles().find((p) => p.id === id);
  if (!profile?.pinHash) return true;
  return (await sha256Hex(`${id}:${pin}`)) === profile.pinHash;
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
