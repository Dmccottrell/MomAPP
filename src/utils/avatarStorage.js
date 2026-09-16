// Profile photos, stored in Supabase Storage's "avatars" bucket — a
// public bucket (same trust level as a name; see supabase/schema.sql)
// where storage RLS restricts writes to each user's own folder, keyed by
// their user id, not just this code.

import { supabase } from "./supabaseClient";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Uploads a new avatar image for this user, replacing any previous one
 * (a fixed path per user, not per file, so there's nothing old left
 * behind), and saves its URL on their profile. Returns the new URL.
 */
export async function uploadAvatar(file, userId) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Images must be 2 MB or smaller.");

  const path = `${userId}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-busted so the new image shows immediately instead of whatever
  // the browser already cached at this same URL.
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);
  if (profileError) throw profileError;

  return url;
}

/** Removes this user's avatar, reverting to the initials fallback. */
export async function removeAvatar(userId) {
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([`${userId}/avatar`]).catch(() => {});
}
