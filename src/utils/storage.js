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

// A completed run whose insert failed — offline, a dropped connection —
// waits here, per user on this device, and is retried by
// flushPendingHistory() rather than silently lost. Each row carries its
// own id (made on this device), so a retry of an insert that actually
// landed the first time is just a duplicate-key error, treated as done.
function pendingKey(userId) {
  return scopedKey(userId, "pendingHistory");
}

function readPending(userId) {
  return read(pendingKey(userId)) || [];
}

function writePending(userId, rows) {
  if (rows.length) write(pendingKey(userId), rows);
  else remove(pendingKey(userId));
}

/**
 * Inserts one history row. Resolves true once it's in the table (or
 * already was), false if the server couldn't be reached, and throws if
 * the server refused it — a refusal won't succeed on retry either.
 */
async function insertHistoryRow(row) {
  const { error } = await supabase.from("history").insert(row);
  if (!error || error.code === "23505") return true;
  // supabase-js reports a failed fetch (offline, network drop) as an
  // error with no Postgres/PostgREST code; a real refusal (RLS, bad
  // data) always has one.
  if (!error.code) return false;
  throw error;
}

/**
 * Records a completed run to this user's history. Resolves "saved", or
 * "queued" when the server couldn't be reached — the run is then kept on
 * this device and added by flushPendingHistory() once it's back online.
 */
export async function addHistoryEntry(entry, userId) {
  const row = {
    id: crypto.randomUUID(),
    user_id: userId,
    scenario_id: entry.scenarioId,
    scenario_title: entry.scenarioTitle,
    score: entry.score,
    total: entry.total,
    missteps: entry.missteps,
    completed_at: new Date().toISOString(),
  };
  let saved = false;
  try {
    saved = await insertHistoryRow(row);
  } catch (err) {
    if (err?.code) throw err;
  }
  if (saved) return "saved";
  writePending(userId, [...readPending(userId), row]);
  return "queued";
}

/**
 * Retries every run still waiting on this device, oldest first. Stops at
 * the first one the server can't be reached for (the rest would fail the
 * same way); drops one the server refuses outright. Resolves the number
 * of runs that made it into history.
 */
export async function flushPendingHistory(userId) {
  const pending = readPending(userId);
  let done = 0;
  for (const row of pending) {
    let reached = true;
    try {
      reached = await insertHistoryRow(row);
    } catch {
      // Refused — drop it rather than retrying forever.
    }
    if (!reached) break;
    done += 1;
  }
  if (done) writePending(userId, readPending(userId).filter((r) => !pending.slice(0, done).some((p) => p.id === r.id)));
  return done;
}

/** This user's completed runs, newest first (admins get everyone's — see history.jsx and RLS). */
export async function listHistory(userId) {
  const { data, error } = await supabase
    .from("history")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) throw error;
  // Runs still waiting to be saved show up too, so a run finished offline
  // doesn't look lost in the meantime.
  const saved = new Set(data.map((r) => r.id));
  const waiting = readPending(userId).filter((r) => !saved.has(r.id));
  return [...waiting, ...data]
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
    .map(fromRow);
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
