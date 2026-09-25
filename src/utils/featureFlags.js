// Feature flags let a work-in-progress feature go live for just the admin
// ("in preview") before it's turned on for the whole household
// ("published"). Publishing writes a permanent row to `releases` too, so
// Settings → About / Previews has a real changelog — see
// supabase/schema.sql for both tables and their RLS policies.

import { supabase } from "./supabaseClient";

// Every flag is seeded directly in supabase/schema.sql (there's no
// "add a flag" UI in Previews — see its own comment). A flag still gating
// code gets a stable id here, so the feature can look itself up without
// matching on a label that might change; once a flag is published for
// good, its gate and id are removed from the code.
export const SCENARIO_BATCH_HN1_FLAG_ID = "scenario-batch-hn-1";

/** Every feature flag, oldest first. */
export async function listFeatureFlags() {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Moves a published flag back to preview — instantly hides it from
 * everyone but the admin again. If this was the last still-published
 * flag from whichever version it shipped in, that release's changelog
 * entry is deleted too — "unpublish" should mean it's gone, not stay
 * listed as something that shipped. A release that combined this flag
 * with others still live stays, since those others really did ship.
 */
export async function unpublishFeatureFlag(id) {
  const { data: current, error: fetchError } = await supabase
    .from("feature_flags")
    .select("published_in_version")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;
  const version = current?.published_in_version;

  const { error } = await supabase
    .from("feature_flags")
    .update({ status: "preview", published_at: null, published_in_version: null })
    .eq("id", id);
  if (error) throw error;

  if (!version) return;

  const { data: stillLive, error: checkError } = await supabase
    .from("feature_flags")
    .select("id")
    .eq("published_in_version", version)
    .eq("status", "published");
  if (checkError) throw checkError;

  if (!stillLive || stillLive.length === 0) {
    await supabase.from("releases").delete().eq("version", version);
  }
}

/**
 * Publishes one or more flags together as a single version: marks each
 * one live, then records the moment as a new `releases` row. Not a real
 * database transaction (the client has no way to do that here) — if the
 * release insert fails after the flag update succeeds, the flags are
 * already live but the changelog entry is missing. Worth knowing, not
 * worth building an RPC for at this app's scale.
 */
export async function publishFeatureFlags(flags, { version, changelog, publishedBy }) {
  const ids = flags.map((f) => f.id);
  const { error: flagError } = await supabase
    .from("feature_flags")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_in_version: version,
    })
    .in("id", ids);
  if (flagError) throw flagError;

  const { error: releaseError } = await supabase.from("releases").insert({
    version,
    changelog,
    // Each flag's own description rides along too, not just its name —
    // so the release history and the "what's new" popup can explain what
    // every published feature actually does, independent of whatever the
    // admin wrote as the overall changelog blurb (which might not
    // mention each one individually).
    published_flags: flags.map((f) => ({ id: f.id, label: f.label, description: f.description })),
    published_by: publishedBy,
  });
  if (releaseError) {
    if (releaseError.code === "23505") {
      throw new Error(`Version ${version} already exists — pick a different version number.`);
    }
    throw releaseError;
  }
}

/**
 * Whether a flag is switched on for this profile. Published flags are on
 * for everyone; preview flags are on only for the admin, so they can try
 * a work-in-progress feature in the live app before anyone else sees it.
 * A flag that doesn't exist (e.g. never created) is treated as off.
 */
export function isFeatureEnabled(flag, profile) {
  if (!flag) return false;
  return flag.status === "published" || Boolean(profile?.is_admin);
}

/**
 * The changelog text for whichever flags are about to be published, from
 * their own names and descriptions — template text, not anything
 * AI-written. One line per flag so every feature being published explains
 * its own change. PublishDialog shows this list read-only (see its own
 * comment) and this is what actually lands in the `releases` row —
 * there's no separate "what changed" field to write by hand.
 */
export function suggestChangelog(flags) {
  if (!flags || flags.length === 0) return "";
  return flags
    .map((f) => (f.description ? `${f.label} — ${f.description}` : `Added ${f.label}.`))
    .join("\n");
}

/**
 * Every scheduled (not-yet-fired) publish, soonest first — see
 * Previews.jsx's "Scheduled" list and PublishDialog's "Later" option.
 * A row moves to 'completed' or 'failed' once the cron job runs it and
 * drops out of this list either way — this is only what's still waiting.
 */
export async function listPendingSchedules() {
  const { data, error } = await supabase
    .from("scheduled_publishes")
    .select("*")
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Queues a publish for a future time instead of running it now — same
 * shape as publishFeatureFlags(), plus when. A database-level cron job
 * (see supabase/schema.sql's run_due_scheduled_publishes()) picks it up
 * once `scheduledFor` has passed and runs the actual publish, so this
 * works even if nobody has the app open at that moment.
 */
export async function schedulePublish(flags, { version, changelog, scheduledFor, createdBy }) {
  const { error } = await supabase.from("scheduled_publishes").insert({
    flag_ids: flags.map((f) => f.id),
    version,
    changelog,
    scheduled_for: scheduledFor,
    created_by: createdBy,
  });
  if (error) throw error;
}

/** Cancels a still-pending scheduled publish — it just never runs. */
export async function cancelSchedule(id) {
  const { error } = await supabase.from("scheduled_publishes").delete().eq("id", id).eq("status", "pending");
  if (error) throw error;
}
