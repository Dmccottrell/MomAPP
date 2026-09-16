// Security-question account recovery: set up at signup, used by the
// "forgot password" flow on the sign-in screen. Answers are never sent or
// stored as plain text — see hashAnswer() — and this file is the one
// place that normalization happens, so setup and reset always agree.

import { supabase } from "./supabaseClient";

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood best friend's name?",
  "What was the make of your first car?",
  "What elementary school did you attend?",
  "What is your mother's maiden name?",
  "What was the name of your first employer?",
  "What street did you grow up on?",
];

/**
 * Normalizes an answer (trimmed, lowercased — so it isn't case-sensitive
 * the way a password is) and hashes it with SHA-256, hex-encoded. Runs in
 * the browser via the Web Crypto API; the server never sees a plaintext
 * answer, only this hash.
 */
export async function hashAnswer(answer) {
  const normalized = answer.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Saves this account's 3 security questions right after signup. Requires
 * an active session (RLS: user_id = auth.uid()) — with email confirmation
 * off, signUp() establishes one immediately; if that setting ever changes,
 * this silently does nothing until their first real sign-in, since there's
 * no session to attach the rows to yet.
 */
export async function saveSecurityAnswers(userId, answers) {
  const rows = answers.map((a, i) => ({
    user_id: userId,
    question_index: i,
    question: a.question,
    answer_hash: a.answerHash,
  }));
  const { error } = await supabase.from("security_answers").insert(rows);
  if (error) throw error;
}
