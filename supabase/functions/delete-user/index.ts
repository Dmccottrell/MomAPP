// Deletes a user's auth account. This is the one piece of this app that
// genuinely needs a server: deleting from auth.users requires Supabase's
// Admin API, which needs the service_role key — a credential that must
// never reach the browser. This function holds it only in its own
// (Supabase-managed) environment and never returns it to the caller.
//
// Deploy: `supabase functions deploy delete-user` (see README.md for the
// full setup). SUPABASE_URL, SUPABASE_ANON_KEY, and
// SUPABASE_SERVICE_ROLE_KEY are provided automatically by the Supabase
// platform to every Edge Function — nothing to configure by hand.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  let userId: string | undefined;
  try {
    ({ userId } = await req.json());
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!userId) return json({ error: "userId is required" }, 400);

  // Bound to the CALLER's own JWT — used only to find out who's asking,
  // never to perform the deletion itself. This is what makes it safe to
  // let any signed-in user call this function: they can only ever act as
  // themselves here, and the admin check below is what actually gates it.
  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Not signed in" }, 401);

  const { data: callerProfile, error: profileError } = await callerClient
    .from("profiles")
    .select("is_admin")
    .eq("id", caller.id)
    .single();
  if (profileError || !callerProfile?.is_admin) {
    return json({ error: "Admin access required" }, 403);
  }

  if (userId === caller.id) {
    return json({ error: "You can't delete your own account this way." }, 400);
  }

  // Only past this point — caller confirmed to be a real admin, deleting
  // someone else — does the service_role key ever get used, and only
  // inside this function's own server-side environment.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ ok: true });
});
