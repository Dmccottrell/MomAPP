// Scenarios created in the in-app builder. Shared across every signed-in
// user (a scenario is content, like the presets, not one person's
// personal history) via the `scenarios` table — see supabase/schema.sql.

import { supabase } from "./supabaseClient";

/** Every scenario created in the builder, newest first. */
export async function listCustomScenarios() {
  const { data, error } = await supabase
    .from("scenarios")
    .select("data")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.data);
}

/** Creates or updates a custom scenario (matched by id). RLS requires builder access to insert. */
export async function saveCustomScenario(scenario, userId) {
  const { error } = await supabase
    .from("scenarios")
    .upsert({ id: scenario.id, data: scenario, created_by: userId });
  if (error) throw error;
}

/** Removes a custom scenario. Does not touch any history already recorded for it. */
export async function deleteCustomScenario(id) {
  const { error } = await supabase.from("scenarios").delete().eq("id", id);
  if (error) throw error;
}

/** Turns a title into a URL/id-safe slug, e.g. for a default scenario id. */
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const BUILDER_KEY = "builder_enabled";

/** Whether the scenario builder is turned on at all, for every profile. Defaults on if the row is ever missing. */
export async function isBuilderEnabled() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", BUILDER_KEY)
    .maybeSingle();
  if (error || !data) return true;
  return data.value === true;
}

/** Admin-only in practice: RLS refuses this write for anyone else. */
export async function setBuilderEnabled(enabled) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: BUILDER_KEY, value: enabled });
  if (error) throw error;
}
