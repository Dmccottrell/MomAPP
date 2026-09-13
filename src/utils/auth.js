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

/** Subscribes to sign-in/sign-out/token-refresh events. Returns an unsubscribe function. */
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
