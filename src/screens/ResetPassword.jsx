import { useState } from "react";
import { updatePassword } from "../utils/auth";

/**
 * Shown instead of the normal app when the session is a password-recovery
 * one — i.e. someone just clicked a reset link from their email. App.jsx
 * detects this via the "PASSWORD_RECOVERY" auth event (see utils/auth.js).
 */
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="profile-gate">
      <div className="profile-gate__card">
        <h1>Charting Practice</h1>
        <p className="profile-gate__lede">Choose a new password.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="profile-gate__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            minLength={6}
            autoFocus
          />
          <input
            className="profile-gate__input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            minLength={6}
          />
          {error && <p className="profile-gate__error">{error}</p>}
          <button type="submit" className="btn btn--go" disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
