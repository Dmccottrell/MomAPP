import { useState } from "react";
import { signIn, signUp } from "../utils/auth";
import { SECURITY_QUESTIONS, hashAnswer, saveSecurityAnswers } from "../utils/securityQuestions";
import ForgotPassword from "./ForgotPassword";

const BLANK_QUESTIONS = [
  { question: "", answer: "" },
  { question: "", answer: "" },
  { question: "", answer: "" },
];

/**
 * Real sign-in / sign-up via Supabase Auth. Replaces the old password-less
 * name picker (see README.md's "Accounts" section for why). On success
 * this doesn't need to do anything else — App.jsx listens for the auth
 * state change and takes it from there.
 *
 * Sign-up also collects 3 distinct security questions (see
 * utils/securityQuestions.js), saved right after the account is created —
 * these back the "forgot password" flow (ForgotPassword.jsx), a mode of
 * this same screen, as an alternative to the email-link reset.
 */
export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [questions, setQuestions] = useState(BLANK_QUESTIONS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function setQuestionAt(i, patch) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function pickedElsewhere(i, value) {
    return questions.some((q, idx) => idx !== i && q.question === value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!name.trim()) return setError("Enter your name.");
      if (questions.some((q) => !q.question || !q.answer.trim())) {
        return setError("Pick 3 different security questions and answer each one.");
      }
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { user } = await signUp(email.trim(), password, name.trim());
        if (user) {
          const hashed = await Promise.all(
            questions.map(async (q) => ({ question: q.question, answerHash: await hashAnswer(q.answer) }))
          );
          // Best-effort — with email confirmation off there's already a
          // session here to attach these to, but if that setting ever
          // changes, there isn't yet, and this just quietly doesn't happen.
          await saveSecurityAnswers(user.id, hashed).catch(() => {});
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  }

  if (mode === "forgot") {
    return (
      <div className="profile-gate">
        <div className="profile-gate__card">
          <h1>Charting Practice</h1>
          <p className="profile-gate__lede">Reset your password</p>
          <ForgotPassword onDone={() => setMode("signin")} onCancel={() => setMode("signin")} />
        </div>
      </div>
    );
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

          {mode === "signup" && (
            <>
              <p className="auth-hint">
                3 security questions, in case you ever need to reset your
                password without your email. Answers aren't case-sensitive
                — your password is.
              </p>
              {questions.map((q, i) => (
                <div className="auth-security-question" key={i}>
                  <select
                    className="profile-gate__input"
                    value={q.question}
                    onChange={(e) => setQuestionAt(i, { question: e.target.value })}
                    required
                  >
                    <option value="" disabled>
                      Security question {i + 1}
                    </option>
                    {SECURITY_QUESTIONS.map((text) => (
                      <option key={text} value={text} disabled={pickedElsewhere(i, text)}>
                        {text}
                      </option>
                    ))}
                  </select>
                  <input
                    className="profile-gate__input"
                    value={q.answer}
                    onChange={(e) => setQuestionAt(i, { answer: e.target.value })}
                    placeholder="Your answer"
                  />
                </div>
              ))}
            </>
          )}

          {error && <p className="profile-gate__error">{error}</p>}
          <button type="submit" className="btn btn--go" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        {mode === "signin" && (
          <button type="button" className="btn btn--ghost auth-switch" onClick={() => setMode("forgot")}>
            Forgot password?
          </button>
        )}

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
