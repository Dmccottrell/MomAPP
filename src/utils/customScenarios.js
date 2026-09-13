// Scenarios created in the in-app builder. Stored separately from the
// preset scenarios shipped in src/scenarios/ (which live in the source
// code, not localStorage) and shared across every profile on this browser
// — a scenario is content, like the presets, not one person's personal
// history.

const KEY = "momapp:customScenarios";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — the scenario just won't be saved.
  }
}

/** Every scenario created in the builder on this browser. */
export function listCustomScenarios() {
  return read();
}

/** One custom scenario by id, or null. */
export function getCustomScenario(id) {
  return read().find((s) => s.id === id) || null;
}

/** Creates or updates a custom scenario (matched by id). */
export function saveCustomScenario(scenario) {
  const list = read();
  const idx = list.findIndex((s) => s.id === scenario.id);
  if (idx >= 0) {
    list[idx] = scenario;
  } else {
    list.push(scenario);
  }
  write(list);
}

/** Removes a custom scenario. Does not touch any history already recorded for it. */
export function deleteCustomScenario(id) {
  write(read().filter((s) => s.id !== id));
}

/** Turns a title into a URL/id-safe slug, e.g. for a default scenario id. */
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ENABLED_KEY = "momapp:builderEnabled";

/** Whether the scenario builder is turned on at all, for every profile. Defaults on. */
export function isBuilderEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Admin-only kill switch: hides "My Scenarios" for everyone, including the admin, until re-enabled. */
export function setBuilderEnabled(enabled) {
  try {
    localStorage.setItem(ENABLED_KEY, enabled ? "on" : "off");
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
