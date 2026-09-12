// Note-checking rules. All local — no network call, no API key. See the
// "Current limitations" section of the README for what this can and can't
// judge.

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
 * Matching is case-insensitive substring matching, so partial words like
 * "anticoagul" intentionally match both "anticoagulant" and
 * "anticoagulated".
 *
 * @param {string} text - the learner's note
 * @param {Array<{id: string, keywords?: string[], forbidden?: string[]}>} requirements
 *   - scenario.documentation.requirements
 * @returns {Array} each requirement plus `status` ("met" | "missing" | "violated")
 *   and `matched` (the keywords or forbidden phrases that triggered the status)
 */
export function gradeNote(text, requirements) {
  const haystack = text.toLowerCase();
  return requirements.map((req) => {
    const forbidden = (req.forbidden || []).filter((f) =>
      haystack.includes(f.toLowerCase())
    );
    if (forbidden.length) {
      return { ...req, status: "violated", matched: forbidden };
    }
    if (!req.keywords || req.keywords.length === 0) {
      return { ...req, status: "met", matched: [] };
    }
    const matched = req.keywords.filter((k) =>
      haystack.includes(k.toLowerCase())
    );
    return {
      ...req,
      status: matched.length ? "met" : "missing",
      matched,
    };
  });
}
