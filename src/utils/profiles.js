// Profile records, one per real account. The database trigger in
// supabase/schema.sql creates a row here automatically on signup, and
// makes the first person to ever sign up the admin. Permission checks
// here are a UI convenience — the real enforcement is the row-level
// security policies in that same file, so a client bug here can't grant
// access the database would refuse.

import { supabase } from "./supabaseClient";

/** The signed-in user's own profile row. */
export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

/** Every profile — used by the admin's "who else can build scenarios" list. */
export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export function isAdminProfile(profile) {
  return Boolean(profile?.is_admin);
}

/** True if this profile can use the scenario builder — admins always can. */
export function canBuildScenarios(profile) {
  return isAdminProfile(profile) || Boolean(profile?.can_build_scenarios);
}

/** Admin-only in practice: RLS refuses this write for anyone else. */
export async function setCanBuildScenarios(id, allowed) {
  const { error } = await supabase.from("profiles").update({ can_build_scenarios: allowed }).eq("id", id);
  if (error) throw error;
}

/**
 * Promotes or demotes another account's admin status. Admin-only in
 * practice: the "Admins can update any profile" RLS policy is what
 * actually allows this — see supabase/schema.sql. Unlike account
 * deletion, this has no server-side self-check, so the UI is what stops
 * an admin from demoting themselves (see UserManagement.jsx) — doing it
 * anyway via a raw request would just leave the app with no admin at
 * all, recoverable only via a manual SQL update.
 */
export async function setAdminStatus(id, isAdmin) {
  const { error } = await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", id);
  if (error) throw error;
}

/** Lets a user rename themselves; RLS blocks changing anyone else's name or your own permission flags this way. */
export async function updateName(id, name) {
  const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

/** True until a profile has completed (or skipped) the one-time welcome tour. */
export function needsOnboarding(profile) {
  return !profile?.has_seen_onboarding;
}

/** Marks the welcome tour done so it never shows again for this account. */
export async function markOnboardingSeen(id) {
  const { error } = await supabase.from("profiles").update({ has_seen_onboarding: true }).eq("id", id);
  if (error) throw error;
}

/** Records that this account has seen a version's "what's new" — see WhatsNewModal.jsx and App.jsx. */
export async function markVersionSeen(id, version) {
  const { error } = await supabase.from("profiles").update({ last_seen_version: version }).eq("id", id);
  if (error) throw error;
}

/** Saves this account's social profile links — any of facebook/instagram/x/linkedin may be empty. */
export async function updateSocialLinks(id, links) {
  const { error } = await supabase.from("profiles").update({ social_links: links }).eq("id", id);
  if (error) throw error;
}
