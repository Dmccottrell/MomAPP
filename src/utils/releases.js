// The changelog. Read-only from here — rows are written by
// featureFlags.js's publishFeatureFlags() as part of publishing a flag.
// Everyone can read this (see the RLS policy in supabase/schema.sql), so
// it powers both the admin-only Previews tab and the About tab everyone
// sees.

import { supabase } from "./supabaseClient";

/** Every release, newest first. */
export async function listReleases() {
  const { data, error } = await supabase
    .from("releases")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** The most recently published release (version + changelog), or null if none exist yet. */
export async function latestRelease() {
  const { data, error } = await supabase
    .from("releases")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/** Suggests the next patch version from a "x.y.z" string — a starting point, not a constraint; the admin can type anything. */
export function suggestNextVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version || "");
  if (!match) return "1.0.0";
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}
