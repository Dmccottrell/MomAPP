import { useState } from "react";
import { signIn, signUp } from "../utils/auth";

/**
 * Real sign-in / sign-up via Supabase Auth. Replaces the old password-less
 * name picker (see README.md's "Accounts" section for why). On success
 * this doesn't need to do anything else — App.jsx listens for the auth
 * state change and takes it from there.
 */
export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Enter your name.");
        await signUp(email.trim(), password, name.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="profile-gate">
      <div className="profile-gate__card">
        <h1>Charting Practice</h1>
        <p className="profile-gate__lede">
          {mode === "signup" ? "Create your account" : "Sign in to practice"}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className="profile-gate__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          )}
          <input
            className="profile-gate__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
          />
          <input
            className="profile-gate__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
          {error && <p className="profile-gate__error">{error}</p>}
          <button type="submit" className="btn btn--go" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn--ghost auth-switch"
          onClick={() => {
            setMode((m) => (m === "signup" ? "signin" : "signup"));
            setError("");
          }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
