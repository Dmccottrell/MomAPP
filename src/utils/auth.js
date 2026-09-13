// Real authentication, via Supabase Auth. This replaces the old
// password-less "type your name" profile picker — see README.md's
// "Accounts" section for why that changed.

import { supabase } from "./supabaseClient";

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
