/**
 * Shown instead of the whole app when VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY aren't set, so a missing .env.local reads as a
 * clear setup step instead of a blank page or a cryptic network error.
 */
export default function SupabaseSetupNotice() {
  return (
    <div className="profile-gate">
      <div className="profile-gate__card">
        <h1>Charting Practice</h1>
        <p className="profile-gate__lede">Supabase isn't configured yet.</p>
        <p style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: "0.92rem" }}>
          Copy <code>.env.example</code> to <code>.env.local</code> and fill in your
          project's URL and anon key from Supabase Project Settings → Data API,
          then restart the dev server.
        </p>
      </div>
    </div>
  );
}
