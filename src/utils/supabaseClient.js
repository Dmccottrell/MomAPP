// The one Supabase client instance for the whole app. Reads its config
// from env vars (see .env.example) so the anon key never lives in source.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. The app
 * uses this to show a clear setup message instead of a blank page or a
 * cryptic network error when someone runs it before configuring Supabase.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;
