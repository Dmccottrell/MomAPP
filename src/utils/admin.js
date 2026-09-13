// Actions that need the service_role key, which this app's browser code
// never holds — routed through the delete-user Supabase Edge Function
// instead (see supabase/functions/delete-user/index.ts). The function
// re-checks admin status server-side using the caller's own session, so
// this isn't relying on the client to behave.

import { supabase } from "./supabaseClient";

/** Admin-only: permanently deletes another user's account. Throws if the function rejects it (not an admin, deleting self, etc). */
export async function deleteAccount(userId) {
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
