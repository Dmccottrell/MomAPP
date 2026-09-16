// Real authentication, via Supabase Auth. This replaces the old
// password-less "type your name" profile picker — see README.md's
// "Accounts" section for why that changed.

import { createClient } from "@supabase/supabase-js";
import { supabase, url, anonKey } from "./supabaseClient";

/** Creates an account. `name` rides along as user metadata so the database trigger can seed the profile row. */
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** The current session, or null if signed out. Supabase persists this in localStorage itself. */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Subscribes to auth events. `callback(event, session)` — `event` is a
 * Supabase Auth event name (e.g. "SIGNED_IN", "SIGNED_OUT", and notably
 * "PASSWORD_RECOVERY" when someone lands back here from a reset-password
 * email). Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

/**
 * Emails a password-reset link to any address. Doesn't require being
 * signed in as that user — this is what an admin's "reset this person's
 * password" button calls. Supabase's redirect lands them back on this
 * app in a recovery session; see screens/ResetPassword.jsx for what
 * happens next.
 */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

/** Sets a new password for whoever's current session this is — used by the recovery-link flow. */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Starts an email change for whoever's current session this is. Supabase
 * emails a confirmation link before it actually takes effect — the address
 * doesn't change (and profiles.email doesn't sync, see schema.sql's
 * on_auth_user_email_updated trigger) until that's clicked.
 */
export async function updateEmail(newEmail) {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

/**
 * Confirms a password is correct — identity proof before letting someone
 * change it (see AccountTools.jsx) — without touching the app's real
 * signed-in session. Supabase has no dedicated "just check this" call, so
 * this signs in on a throwaway, non-persisting client instead of the
 * shared one: a real credential check, but one that never writes to
 * localStorage or fires the auth-state events the rest of the app
 * listens for. Returns false rather than throwing on a wrong password.
 */
export async function verifyPassword(email, password) {
  const verifyClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await verifyClient.auth.signInWithPassword({ email, password });
  return !error;
}
