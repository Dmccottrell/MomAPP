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

/**
 * The higher of two "x.y.z" version strings, comparing numerically part by
 * part (so "1.2.10" beats "1.2.9"). An invalid or missing version loses to
 * a valid one. Used to keep a re-published version number from colliding
 * with one someone (often the admin themself) already has recorded as
 * seen — see suggestNextVersion's caller in Previews.jsx: unpublishing a
 * flag deletes its release row, so the *next* release's version would
 * otherwise get suggested from the prior row again, which can reissue a
 * version number someone already dismissed the "what's new" popup for.
 */
export function maxVersion(a, b) {
  const pa = /^(\d+)\.(\d+)\.(\d+)$/.exec(a || "");
  const pb = /^(\d+)\.(\d+)\.(\d+)$/.exec(b || "");
  if (!pa) return b || a;
  if (!pb) return a;
  for (let i = 1; i <= 3; i++) {
    const na = Number(pa[i]);
    const nb = Number(pb[i]);
    if (na !== nb) return na > nb ? a : b;
  }
  return a;
}
