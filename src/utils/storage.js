// Wrappers around localStorage for saving progress between visits.
// Reads and writes are defensive — a private window, cleared site data, or
// disabled storage should mean "nothing saved," never a thrown error.
//
// Everything is scoped under the current profile (see profiles.js) so two
// people sharing a browser don't see each other's runs or scores.

import { getCurrentProfileId } from "./profiles";

const HISTORY_LIMIT = 50;

function scopedKey(name) {
  const profileId = getCurrentProfileId() || "guest";
  return `momapp:${profileId}:${name}`;
}

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full, disabled, or unavailable — progress just isn't saved.
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

/** Loads a scenario's in-progress run, or null if there isn't one saved. */
export function loadRun(scenarioId) {
  return read(scopedKey(`run:${scenarioId}`));
}

/** Saves an in-progress run so a refresh can pick up where the learner left off. */
export function saveRun(scenarioId, run) {
  write(scopedKey(`run:${scenarioId}`), run);
}

/** Clears a scenario's in-progress run — used once it's graded, or reset to the brief. */
export function clearRun(scenarioId) {
  remove(scopedKey(`run:${scenarioId}`));
}

/**
 * Records a completed run to this profile's history, newest first, capped
 * at HISTORY_LIMIT entries so localStorage doesn't grow without bound.
 */
export function addHistoryEntry(entry) {
  const key = scopedKey("history");
  const existing = read(key) || [];
  const withId = { id: crypto.randomUUID(), ...entry };
  write(key, [withId, ...existing].slice(0, HISTORY_LIMIT));
}

/** Every completed run for the current profile, newest first. */
export function listHistory() {
  return read(scopedKey("history")) || [];
}

/** The most recent completed run for one scenario, or null if it's never been finished. */
export function lastHistoryFor(scenarioId) {
  return listHistory().find((h) => h.scenarioId === scenarioId) || null;
}

/** Deletes every run and history entry saved for the current profile. */
export function clearProfileData() {
  const prefix = `momapp:${getCurrentProfileId() || "guest"}:`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
}

const APP_PREFIX = "momapp:";

/**
 * Bundles every profile, its history and in-progress runs, and the theme
 * preference into one plain object suitable for JSON.stringify — a full
 * backup of everything this app has saved in this browser. Nothing here
 * ever leaves the browser on its own; this exists so a person can save a
 * copy of their own data before clearing site data or switching devices.
 */
export function exportAllData() {
  const data = {};
  Object.keys(localStorage)
    .filter((k) => k.startsWith(APP_PREFIX))
    .forEach((k) => {
      data[k] = localStorage.getItem(k);
    });
  return { app: "charting-practice", version: 1, exportedAt: new Date().toISOString(), data };
}

/**
 * Restores a bundle produced by exportAllData, overwriting any keys it
 * contains. Throws if the payload doesn't look like one of our backups, so
 * the caller can show a clear error instead of silently corrupting storage.
 *
 * Values are written back with the plain localStorage API, not the
 * JSON-encoding `write()` helper above — exportAllData captured them
 * with `getItem`, and not every key here is itself JSON (the current
 * profile id and the theme preference are stored as plain strings), so
 * re-stringifying would corrupt those.
 */
export function importAllData(payload) {
  if (!payload || typeof payload !== "object" || payload.app !== "charting-practice" || !payload.data) {
    throw new Error("That file doesn't look like a Charting Practice backup.");
  }
  Object.entries(payload.data).forEach(([key, value]) => {
    if (key.startsWith(APP_PREFIX) && typeof value === "string") {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage full or unavailable — that one key won't be restored.
      }
    }
  });
}
