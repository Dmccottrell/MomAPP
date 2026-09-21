// Note-checking rules. All local — no network call, no API key. See the
// "Current limitations" section of the README for what this can and can't
// judge.

// Common charting shorthand a nurse might write instead of the keyword a
// scenario lists. Only used by the "smart" matcher, and only when the
// scenario's own keyword is one of these keys — so a scenario that lists
// "hr" also accepts "pulse", without every scenario having to repeat them.
const ALIASES = {
  bp: ["b/p", "blood pressure"],
  hr: ["pulse", "heart rate"],
  rr: ["resp rate", "respirations", "respiratory rate"],
  spo2: ["oxygen saturation", "pulse ox"],
  temp: ["temperature"],
  md: ["doctor", "physician"],
  provider: ["doctor", "physician", "on-call", "on call"],
  np: ["nurse practitioner"],
};

// Words that, shortly before a forbidden phrase, mean the note is ruling
// it out ("did not climb over") rather than asserting it.
const NEGATION = /\b(no|not|never|without|denies|didn't|wasn't|isn't)\b[^.;]*$/;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A pattern for one keyword that only matches at the start of a word, so
 * "hr" no longer matches inside "through". Keywords of 3 characters or
 * fewer must also end at a word boundary ("md" won't match "medication");
 * longer ones stay prefix matches on purpose, so "anticoagul" still
 * matches "anticoagulated".
 */
function wordStartPattern(term) {
  const t = term.trim().toLowerCase();
  const end = t.length <= 3 ? "(?![a-z0-9])" : "";
  return new RegExp(`(?<![a-z0-9])${escapeRegex(t)}${end}`);
}

function keywordMatches(haystack, keyword) {
  const terms = [keyword, ...(ALIASES[keyword.trim().toLowerCase()] || [])];
  return terms.some((t) => wordStartPattern(t).test(haystack));
}

function forbiddenAsserted(haystack, phrase) {
  const found = wordStartPattern(phrase).exec(haystack);
  if (!found) return false;
  return !NEGATION.test(haystack.slice(Math.max(0, found.index - 30), found.index));
}

/**
 * Checks a learner's free-text note against a scenario's documentation
 * requirements and returns each requirement annotated with how it fared.
 *
 * Each requirement is graded independently, in this priority order:
 *   1. "violated" — the note contains one of the requirement's `forbidden`
 *      phrases (used for conclusions the learner shouldn't state, e.g. a
 *      fall's cause when no one witnessed it).
 *   2. "met"      — the requirement has no `keywords` to check (nothing to
 *      fail), or the note contains at least one of them.
 *   3. "missing"  — none of the keywords were found.
 *
 * By default matching is case-insensitive substring matching, so partial
 * words like "anticoagul" intentionally match both "anticoagulant" and
 * "anticoagulated". With `{ smart: true }` (behind the 'smart-note-grading'
 * feature flag) matching is word-aware instead: keywords match only at the
 * start of a word (short ones as whole words), common shorthand is
 * accepted, and a forbidden phrase that is negated ("did not climb over")
 * isn't counted.
 *
 * @param {string} text - the learner's note
 * @param {Array<{id: string, keywords?: string[], forbidden?: string[]}>} requirements
 *   - scenario.documentation.requirements
 * @param {{smart?: boolean}} [options]
 * @returns {Array} each requirement plus `status` ("met" | "missing" | "violated")
 *   and `matched` (the keywords or forbidden phrases that triggered the status)
 */
export function gradeNote(text, requirements, { smart = false } = {}) {
  const haystack = text.toLowerCase();
  const hasForbidden = (f) =>
    smart ? forbiddenAsserted(haystack, f) : haystack.includes(f.toLowerCase());
  const hasKeyword = (k) =>
    smart ? keywordMatches(haystack, k) : haystack.includes(k.toLowerCase());

  return requirements.map((req) => {
    const forbidden = (req.forbidden || []).filter(hasForbidden);
    if (forbidden.length) {
      return { ...req, status: "violated", matched: forbidden };
    }
    if (!req.keywords || req.keywords.length === 0) {
      return { ...req, status: "met", matched: [] };
    }
    const matched = req.keywords.filter(hasKeyword);
    return {
      ...req,
      status: matched.length ? "met" : "missing",
      matched,
    };
  });
}
