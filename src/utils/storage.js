// In-progress runs stay in localStorage — they're ephemeral, change on
// every click, and don't need to sync across devices or be visible to an
// admin. Completed history moves to the `history` table (see
// supabase/schema.sql) so it's tied to a real account and syncs anywhere
// that account signs in.

import { supabase } from "./supabaseClient";

function scopedKey(userId, name) {
  return `momapp:${userId}:${name}`;
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

/** Loads a scenario's in-progress run for this user on this device, or null. */
export function loadRun(userId, scenarioId) {
  return read(scopedKey(userId, `run:${scenarioId}`));
}

/** Saves an in-progress run so a refresh can pick up where the learner left off. */
export function saveRun(userId, scenarioId, run) {
  write(scopedKey(userId, `run:${scenarioId}`), run);
}

/** Clears a scenario's in-progress run — used once it's graded, or reset to the brief. */
export function clearRun(userId, scenarioId) {
  remove(scopedKey(userId, `run:${scenarioId}`));
}

function fromRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    score: row.score,
    total: row.total,
    missteps: row.missteps,
    completedAt: row.completed_at,
  };
}

/** Records a completed run to this user's history. */
export async function addHistoryEntry(entry, userId) {
  const { error } = await supabase.from("history").insert({
    user_id: userId,
    scenario_id: entry.scenarioId,
    scenario_title: entry.scenarioTitle,
    score: entry.score,
    total: entry.total,
    missteps: entry.missteps,
  });
  if (error) throw error;
}

/** This user's completed runs, newest first (admins get everyone's — see history.jsx and RLS). */
export async function listHistory(userId) {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data.map(fromRow);
}

/** Every learner's history — only actually returns rows for an admin; RLS filters it to "own only" otherwise. */
export async function listAllHistory() {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .order("completed_at", { ascending: false });
  if (error) throw error;
  return data.map(fromRow);
}

/** The most recent completed run for one scenario, or null if it's never been finished. */
export async function lastHistoryFor(userId, scenarioId) {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("user_id", userId)
    .eq("scenario_id", scenarioId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

/** Deletes this user's history rows. Does not touch their in-progress runs on this device. */
export async function clearMyHistory(userId) {
  const { error } = await supabase.from("history").delete().eq("user_id", userId);
  if (error) throw error;
}

/** Groups history rows (as returned by listAllHistory) into a per-user {count, lastCompletedAt} map — used by the admin's User management list. */
export function summarizeHistoryByUser(rows) {
  const map = {};
  for (const row of rows) {
    const summary = map[row.userId] || { count: 0, lastCompletedAt: null };
    summary.count += 1;
    if (!summary.lastCompletedAt || row.completedAt > summary.lastCompletedAt) {
      summary.lastCompletedAt = row.completedAt;
    }
    map[row.userId] = summary;
  }
  return map;
}
