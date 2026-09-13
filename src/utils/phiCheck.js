// Lightweight, local pattern checks for text that looks like real personal
// data. This is a nudge to double-check before saving, not a HIPAA
// compliance system: no algorithm can tell a fictional patient name from a
// real one (they're structurally identical), so this only catches a
// handful of unambiguous formats — SSNs, phone numbers, emails, and
// birthdate-shaped dates. Everything stays local; nothing here is sent
// anywhere for checking, which is deliberate — a real PII-detection
// service would mean transmitting potentially real patient data to a
// third party to find out if it's real patient data.

const PATTERNS = [
  { label: "a Social Security Number", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { label: "a phone number", re: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { label: "an email address", re: /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i },
  {
    label: "a birthdate-shaped date",
    re: /\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/,
  },
];

/**
 * Scans a scenario's free-text fields for the patterns above.
 * @returns {string[]} plain-language labels for whatever matched, e.g.
 *   ["a phone number", "an email address"] — empty if nothing did.
 */
export function findPossiblePHI(scenario) {
  const fields = [
    scenario.patient?.name,
    scenario.patient?.mrn,
    scenario.opening,
    scenario.documentation?.modelNote,
    ...(scenario.actions || []).flatMap((a) => [a.label, a.detail, a.response]),
  ].filter(Boolean);

  const text = fields.join("\n");
  return PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}
