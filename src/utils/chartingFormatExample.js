// Made-up events, unrelated to any real scenario in the app — generic
// illustrations of the *format*, not an answer key. Using a scenario's own
// modelNote here instead would spoil that scenario before the learner
// even starts it. Several variants so the same example doesn't repeat
// every time (see pickChartingFormatExample below) — shared by
// components/FormatExample.jsx (shown before a scenario begins) and
// components/FormatExampleBubble.jsx (the same lines, on demand, while
// caring for the patient or writing the note).
export const CHARTING_FORMAT_EXAMPLES = [
  [
    {
      at: "0912",
      text: "Resident reports brief dizziness on standing; found seated, skin pale and diaphoretic. VS: BP 108/64, HR 92, RR 18, SpO2 97% RA.",
    },
    { at: "0915", text: "Assisted to bed, raised HOB 30°, remained at bedside." },
    {
      at: "0922",
      text: "Reassessed: dizziness resolved, color improved, VS stable. Denies chest pain, SOB, or further symptoms.",
    },
    { at: "0925", text: "Charge nurse notified of event and current status; no new orders at this time." },
  ],
  [
    {
      at: "1340",
      text: "Resident bumped left forearm on wheelchair footrest while transferring; skin tear noted, approx. 2 cm, minimal bleeding.",
    },
    {
      at: "1343",
      text: "Bleeding controlled with gentle pressure. Wound cleansed with normal saline, steri-strips applied, non-adherent dressing secured.",
    },
    { at: "1348", text: "Resident denies pain, tolerated dressing well. No other injuries noted on exam." },
    { at: "1350", text: "Charge nurse notified; incident report completed per facility policy." },
  ],
  [
    {
      at: "0615",
      text: "Routine AM vitals: temp 100.8°F, HR 88, RR 16, BP 128/76, SpO2 98% RA. Resident denies chills, cough, or pain.",
    },
    {
      at: "0618",
      text: "Provider notified of temperature; order received for acetaminophen 650 mg PO and recheck in 1 hour.",
    },
    { at: "0620", text: "Acetaminophen administered as ordered." },
    { at: "0720", text: "Temp rechecked: 99.4°F. Resident resting comfortably, no acute distress." },
  ],
  [
    {
      at: "1450",
      text: "Resident's daughter reports he \"seems more tired than usual\" during visit; no other concerns voiced.",
    },
    {
      at: "1455",
      text: "Assessed: alert and oriented x4, VS within normal limits for resident, no acute changes noted on exam.",
    },
    { at: "1500", text: "Reviewed recent sleep pattern and activity log with daughter; no red flags identified." },
    { at: "1505", text: "Daughter reassured; will continue routine monitoring. Encouraged to report any new symptoms." },
  ],
];

/**
 * Picks one example (its line set and index), optionally never the same
 * index as `excludeIndex` — pass the index of whatever was last actually
 * *shown*, e.g. on a restart, so hitting Begin again on a scenario
 * already in progress reliably shows something different. Deliberately
 * pure (no shared module-level state to mutate) — a stateful "remember
 * the last pick" version here looked right but broke under React
 * StrictMode's development-mode double-invocation of state initializers,
 * which calls this twice per mount and discards one result, corrupting
 * any exclusion tracked as a side effect of the call itself.
 */
export function pickChartingFormatExample(excludeIndex = -1) {
  let index;
  do {
    index = Math.floor(Math.random() * CHARTING_FORMAT_EXAMPLES.length);
  } while (CHARTING_FORMAT_EXAMPLES.length > 1 && index === excludeIndex);
  return { lines: CHARTING_FORMAT_EXAMPLES[index], index };
}
