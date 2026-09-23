// A made-up event, unrelated to any real scenario in the app — a generic
// illustration of the *format*, not an answer key. Using a scenario's own
// modelNote here instead would spoil that scenario before the learner
// even starts it. Shared by components/FormatExample.jsx (shown before a
// scenario begins) and components/FormatExampleBubble.jsx (the same
// content, on demand, while caring for the patient or writing the note).
export const CHARTING_FORMAT_SAMPLE_LINES = [
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
];
