import { useState } from "react";
import { hashAnswer } from "../utils/securityQuestions";
import { startSecurityQuestionReset, verifySecurityQuestionReset } from "../utils/passwordRecovery";

/**
 * The security-question alternative to the email-link reset
 * (utils/auth.js's sendPasswordReset) — for signing in when you don't
 * have access to your email, or just don't want to wait on it. Three
 * steps: enter the email, answer the one security question the server
 * randomly picked for it, then set a new password. See
 * supabase/functions/security-question-reset/ for why this needs a
 * server at all.
 */
export default function ForgotPassword({ onDone, onCancel }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [questionIndex, setQuestionIndex] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFindQuestion(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await startSecurityQuestionReset(email.trim());
      setQuestionIndex(result.questionIndex);
      setQuestion(result.question);
      setStep("question");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const answerHash = await hashAnswer(answer);
      await verifySecurityQuestionReset({
        email: email.trim(),
        questionIndex,
        answerHash,
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <>
        <p className="profile-gate__lede">
          Password reset. Sign in with your new password.
        </p>
        <button type="button" className="btn btn--go auth-switch" onClick={onDone}>
          Back to sign in
        </button>
      </>
    );
  }

  if (step === "question") {
    return (
      <form className="auth-form" onSubmit={handleReset}>
        <p className="auth-hint">{question}</p>
        <input
          className="profile-gate__input"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer"
          autoFocus
          required
        />
        <input
          className="profile-gate__input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <input
          className="profile-gate__input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Retype new password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <p className="auth-hint">Your answer isn't case-sensitive. Your new password is.</p>
        {error && <p className="profile-gate__error">{error}</p>}
        <button type="submit" className="btn btn--go" disabled={busy}>
          {busy ? "Checking…" : "Reset password"}
        </button>
        <button type="button" className="btn btn--ghost auth-switch" onClick={onCancel}>
          Cancel
        </button>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleFindQuestion}>
      <input
        className="profile-gate__input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        autoFocus
        required
      />
      {error && <p className="profile-gate__error">{error}</p>}
      <button type="submit" className="btn btn--go" disabled={busy}>
        {busy ? "Looking…" : "Find my security question"}
      </button>
      <button type="button" className="btn btn--ghost auth-switch" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}
