// Feature flags let a work-in-progress feature go live for just the admin
// ("in preview") before it's turned on for the whole household
// ("published"). Publishing writes a permanent row to `releases` too, so
// Settings → About / Previews has a real changelog — see
// supabase/schema.sql for both tables and their RLS policies.

import { supabase } from "./supabaseClient";
import { slugify } from "./customScenarios";

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

/** Moves a published flag back to preview — instantly hides it from everyone but the admin again. */
export async function unpublishFeatureFlag(id) {
  const { error } = await supabase
    .from("feature_flags")
    .update({ status: "preview", published_at: null, published_in_version: null })
    .eq("id", id);
  if (error) throw error;
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
    published_flags: flags.map((f) => ({ id: f.id, label: f.label })),
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
