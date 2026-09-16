// Feature flags let a work-in-progress feature go live for just the admin
// ("in preview") before it's turned on for the whole household
// ("published"). Publishing writes a permanent row to `releases` too, so
// Settings → About / Previews has a real changelog — see
// supabase/schema.sql for both tables and their RLS policies.

import { supabase } from "./supabaseClient";
import { slugify } from "./customScenarios";

// Flags seeded directly in supabase/schema.sql (rather than created
// through the Previews tab) get a stable id here, so the feature they
// gate can look itself up without matching on a label that might change.
export const ACCOUNT_PROFILE_TOOLS_FLAG_ID = "account-profile-tools";

/** Every feature flag, oldest first. */
export async function listFeatureFlags() {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Creates a new flag in "preview". RLS requires admin. */
export async function createFeatureFlag(label, description) {
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Give the feature a name.");
  const id = slugify(trimmed);
  const { error } = await supabase
    .from("feature_flags")
    .insert({ id, label: trimmed, description: description.trim() });
  if (error) {
    if (error.code === "23505") throw new Error("A feature with that name already exists.");
    throw error;
  }
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
 * A starting-point description for a new flag, from its name alone —
 * template text, not anything AI-written (this app has no LLM
 * integration). Shown as a live suggestion while adding a flag in
 * Previews.jsx; freely editable, same as the version number suggested
 * when publishing.
 */
export function suggestFlagDescription(label) {
  const trimmed = label.trim();
  if (!trimmed) return "";
  return `Try out ${trimmed} before it ships to everyone.`;
}

/**
 * A starting-point changelog blurb for whichever flags are about to be
 * published, from their names and descriptions — template text, not
 * anything AI-written. One line per flag so every feature being
 * published explains its own change, not just a list of names; freely
 * editable before actually publishing. Prefills PublishDialog's "What
 * changed" field.
 */
export function suggestChangelog(flags) {
  if (!flags || flags.length === 0) return "";
  return flags
    .map((f) => (f.description ? `${f.label} — ${f.description}` : `Added ${f.label}.`))
    .join("\n");
}
