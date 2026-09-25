// Note-checking rules. All local — no network call, no API key. See the
// "Current limitations" section of the README for what this can and can't
// judge.

// Common charting shorthand a nurse might write instead of the keyword a
// scenario lists. Only applies when the scenario's own keyword is one of
// these keys — so a scenario that lists
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

// "Evidence" a requirement can demand alongside its keyword (`needs` on the
// requirement). A number is a digit run that isn't part of a word, so the 2
// in "SpO2" doesn't count. A time is 21:18, 2118 or 2 pm — not 128/76.
const EVIDENCE = {
  number: {
    test: /(?<![a-z])\d+(?:[/.:]\d+)?/,
    hint: "You mentioned it, but with no numbers — add the actual values or measurements.",
  },
  time: {
    test: /(?<![\d/.])(?:[01]\d|2[0-3]):[0-5]\d(?!\d)|(?<![\d/.:])(?:[01]\d|2[0-3])[0-5]\d(?![\d/%])|\b\d{1,2}\s?(?:am|pm)\b/,
    hint: "You mentioned it, but with no time — add when it happened.",
  },
};

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

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * A misspelling of a long, single-word keyword ("neurlogical"). Deliberately
 * conservative so it can't turn a different real word into a match: the
 * keyword must be 7+ letters, the first letters must agree ("decision" is
 * not "incision"), and only 1 edit is allowed (2 for 11+ letters).
 * Compares against the start of each note word, so stems like "anticoagul"
 * keep working. Returns the note word that matched, or null.
 */
function fuzzyMatch(words, keyword) {
  const k = keyword.trim().toLowerCase();
  if (k.length < 7 || /[^a-z]/.test(k)) return null;
  const max = k.length >= 11 ? 2 : 1;
  for (const w of words) {
    if (w[0] !== k[0]) continue;
    const head = w.slice(0, k.length);
    if (Math.abs(head.length - k.length) > 1) continue;
    if (editDistance(head, k) <= max) return w;
  }
  return null;
}

/** The note text that satisfied a keyword (the keyword, an alias, or the misspelt word), or null. */
function findKeyword(haystack, words, keyword) {
  const terms = [keyword, ...(ALIASES[keyword.trim().toLowerCase()] || [])];
  const exact = terms.find((t) => wordStartPattern(t).test(haystack));
  return exact ?? fuzzyMatch(words, keyword);
}

function forbiddenAsserted(haystack, phrase) {
  const found = wordStartPattern(phrase).exec(haystack);
  if (!found) return false;
  return !NEGATION.test(haystack.slice(Math.max(0, found.index - 30), found.index));
}

/**
 * Whether every kind of evidence in `needs` sits in the same sentence as a
 * matched term, or the sentence right after it ("Notified provider. 2118.").
 * Returns the hint for the first kind that's missing, or null if all present.
 */
function missingEvidence(haystack, matchedTerms, needs) {
  const sentences = haystack.split(/(?<=[.!?;])\s+|\n+/);
  const near = new Set();
  sentences.forEach((s, i) => {
    if (matchedTerms.some((t) => wordStartPattern(t).test(s))) {
      near.add(i);
      near.add(i + 1);
    }
  });
  const nearby = [...near].map((i) => sentences[i] || "");
  for (const kind of needs) {
    const rule = EVIDENCE[kind];
    if (rule && !nearby.some((s) => rule.test.test(s))) return rule.hint;
  }
  return null;
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
 * Matching is case-insensitive and word-aware: keywords match only at the
 * start of a word (short ones as whole words), so partial stems like
 * "anticoagul" still match "anticoagulated"; common shorthand is accepted,
 * long keywords tolerate a typo, a forbidden phrase that is negated ("did
 * not climb over") isn't counted, and a requirement's `needs` (["time"],
 * ["number"]) must be backed up by an actual time or number next to the
 * keyword — otherwise it's "missing" with a `hint`.
 *
 * @param {string} text - the learner's note
 * @param {Array<{id: string, keywords?: string[], smartKeywords?: string[], forbidden?: string[]}>} requirements
 *   - scenario.documentation.requirements
 * @returns {Array} each requirement plus `status` ("met" | "missing" | "violated"),
 *   `matched` (the words in the note that triggered the status), and an
 *   optional `hint` explaining why a mentioned item wasn't credited
 */
export function gradeNote(text, requirements) {
  const haystack = text.toLowerCase();
  const words = haystack.match(/[a-z]+/g) || [];

  return requirements.map((req) => {
    const forbidden = (req.forbidden || []).filter((f) => forbiddenAsserted(haystack, f));
    if (forbidden.length) {
      return { ...req, status: "violated", matched: forbidden };
    }
    // `smartKeywords`, when a requirement lists them, replace `keywords` —
    // for tightening a keyword that's too broad (e.g. a bare "notified"
    // also credits telling the provider).
    const keywords = req.smartKeywords || req.keywords;
    if (!keywords || keywords.length === 0) {
      return { ...req, status: "met", matched: [] };
    }
    const matched = keywords.map((k) => findKeyword(haystack, words, k)).filter((m) => m !== null);
    if (!matched.length) return { ...req, status: "missing", matched };

    if (req.needs?.length) {
      const hint = missingEvidence(haystack, matched, req.needs);
      if (hint) return { ...req, status: "missing", matched, hint };
    }
    return { ...req, status: "met", matched };
  });
}

const VAGUE_WORDS = /\b(appears?|appeared|seems?|seemed|apparently|probably|possibly)\b/g;

/**
 * Wording to tighten in a note — not scored, just advice, shown on the
 * feedback screen. Flags guessy words (charting
 * what you observed beats what things "seem") and a note with no times.
 *
 * @param {string} text - the learner's note
 * @returns {string[]} short tips, empty if there's nothing to flag
 */
export function noteTips(text) {
  const haystack = text.toLowerCase();
  const tips = [];
  const seen = new Set();
  for (const [, word] of haystack.matchAll(VAGUE_WORDS)) {
    if (seen.has(word)) continue;
    seen.add(word);
    tips.push(`"${word}" is a guess. Chart what you observed or measured instead.`);
  }
  if (haystack.trim() && !EVIDENCE.time.test.test(haystack)) {
    tips.push("No times in the note. Start with when you found the patient, and time the key actions.");
  }
  return tips;
}
