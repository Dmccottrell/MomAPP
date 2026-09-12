// Wrappers around localStorage for saving progress between visits.
// Reads and writes are defensive — a private window, cleared site data, or
// disabled storage should mean "nothing saved," never a thrown error.

const RUN_PREFIX = "momapp:run:";
const HISTORY_PREFIX = "momapp:history:";

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
  return read(RUN_PREFIX + scenarioId);
}

/** Saves an in-progress run so a refresh can pick up where the learner left off. */
export function saveRun(scenarioId, run) {
  write(RUN_PREFIX + scenarioId, run);
}

/** Clears a scenario's in-progress run — used once it's graded, or reset to the brief. */
export function clearRun(scenarioId) {
  remove(RUN_PREFIX + scenarioId);
}

/** Records the result of a completed run, for the "last run" line on the home screen. */
export function saveHistory(scenarioId, result) {
  write(HISTORY_PREFIX + scenarioId, result);
}

/** Loads the most recent completed result for a scenario, or null if it's never been finished. */
export function loadHistory(scenarioId) {
  return read(HISTORY_PREFIX + scenarioId);
}
