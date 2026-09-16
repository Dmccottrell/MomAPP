// Calls the security-question-reset Edge Function — see that function's
// own comment for why this needs a server at all (looking a user up by
// email, and setting a password with no active session, both need the
// service_role key). Used by the "forgot password" flow on the sign-in
// screen, as an alternative to utils/auth.js's email-link reset.

import { supabase } from "./supabaseClient";

/** Starts a reset: returns one randomly chosen security question for this email. Throws a generic message if the email or its questions can't be found. */
export async function startSecurityQuestionReset(email) {
  const { data, error } = await supabase.functions.invoke("security-question-reset", {
    body: { action: "start", email },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Verifies the (already-hashed) answer and, if it matches, sets the new password. */
export async function verifySecurityQuestionReset({ email, questionIndex, answerHash, newPassword }) {
  const { data, error } = await supabase.functions.invoke("security-question-reset", {
    body: { action: "verify", email, questionIndex, answerHash, newPassword },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
