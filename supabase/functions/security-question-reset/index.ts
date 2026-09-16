// Lets someone reset a forgotten password by answering one of their own
// security questions, instead of (or alongside) the email-link flow in
// utils/auth.js's sendPasswordReset(). Needs the service_role key for two
// reasons an anon key can never do: looking a user up by email at all,
// and setting a password for someone with no active session — so, like
// delete-user, this holds that key only in its own environment.
//
// Deploy: `supabase functions deploy security-question-reset` (see
// README.md). Two actions in one function, chosen by body.action:
//   "start"  { email } -> { questionIndex, question }
//   "verify" { email, questionIndex, answerHash, newPassword } -> { ok: true }
// answerHash is computed client-side (see utils/securityQuestions.js) from
// the trimmed, lowercased answer, so this function only ever compares
// hashes — it never sees a plaintext answer, and the "not case-sensitive"
// normalization happens the same way on both the setup and reset sides.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Always HTTP 200, success or failure, distinguished only by whether the
// body has an `error` key. The Supabase JS client's functions.invoke()
// treats any non-2xx as a generic "Edge Function returned a non-2xx
// status code" and discards the actual response body — so a real status
// code here would silently swallow every error message below.
function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// One message for "no such account" and "wrong answer" alike, so this
// can't be used to probe which emails have accounts here.
const GENERIC_ERROR = "That didn't match. Check the email and answer, or use the email reset link instead.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: {
    action?: string;
    email?: string;
    questionIndex?: number;
    answerHash?: string;
    newPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" });
  }

  const { action, email } = body;
  if (!action || !email) return json({ error: "email is required" });

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // No admin.getUserByEmail in this SDK version — fine at this app's
  // scale (a handful of accounts), not something to page through for a
  // real userbase.
  const { data: userList, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) return json({ error: "Something went wrong." });
  const user = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (action === "start") {
    if (user) {
      const { data: rows } = await adminClient
        .from("security_answers")
        .select("question_index, question")
        .eq("user_id", user.id);
      if (rows && rows.length > 0) {
        const pick = rows[Math.floor(Math.random() * rows.length)];
        return json({ questionIndex: pick.question_index, question: pick.question });
      }
    }
    return json({ error: GENERIC_ERROR });
  }

  if (action === "verify") {
    const { questionIndex, answerHash, newPassword } = body;
    if (questionIndex === undefined || !answerHash || !newPassword) {
      return json({ error: "Missing fields." });
    }
    if (!user) return json({ error: GENERIC_ERROR });

    const { data: row } = await adminClient
      .from("security_answers")
      .select("answer_hash")
      .eq("user_id", user.id)
      .eq("question_index", questionIndex)
      .maybeSingle();
    if (!row || row.answer_hash !== answerHash) {
      return json({ error: GENERIC_ERROR });
    }

    const { error: pwError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (pwError) return json({ error: pwError.message });
    return json({ ok: true });
  }

  return json({ error: "Unknown action." });
});
