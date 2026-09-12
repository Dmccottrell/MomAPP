// Splits note text around the keyword/phrase matches the grader found, so
// the "Your note" view can highlight exactly what earned or cost credit
// instead of just listing matches separately from the text.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits `text` into segments, tagging the ones that match one of `terms`
 * (case-insensitive) with that term's `kind`. Longer phrases are matched
 * first so a phrase is never partially swallowed by a shorter one it
 * contains (e.g. "skin tear" wins over a bare "tear").
 *
 * @param {string} text
 * @param {Array<{ phrase: string, kind: string }>} terms
 * @returns {Array<{ text: string, kind: string|null }>} segments in order;
 *   `kind` is null for text that matched nothing.
 */
export function splitByMatches(text, terms) {
  const active = terms.filter((t) => t.phrase && t.phrase.trim());
  if (active.length === 0) return [{ text, kind: null }];

  const sorted = [...active].sort((a, b) => b.phrase.length - a.phrase.length);
  const kindByLower = new Map(sorted.map((t) => [t.phrase.toLowerCase(), t.kind]));
  const pattern = sorted.map((t) => escapeRegExp(t.phrase)).join("|");
  const regex = new RegExp(pattern, "gi");

  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), kind: null });
    }
    segments.push({
      text: match[0],
      kind: kindByLower.get(match[0].toLowerCase()),
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), kind: null });
  }
  return segments;
}
