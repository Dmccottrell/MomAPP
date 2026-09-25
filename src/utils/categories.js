// The note types a scenario can be filed under, from the nurse who writes
// the cases. The scenario builder's Category is a dropdown of these (with
// each one's description underneath) and Home can filter by category.
//
// A scenario's `category` is stored as plain text — the name below — so
// scenarios saved before this list existed ("Risk management", "Clinical
// judgment", or anything typed in the builder) keep working unchanged.

export const CATEGORIES = [
  {
    name: "Lab/Diagnostic",
    description: "New orders, specimen collection, results (e.g., UA/C&S).",
  },
  {
    name: "Medication",
    description: "New meds, response, refusal, adverse effects.",
  },
  {
    name: "Admission/Readmission",
    description: "Resident admitted or returning to the facility.",
  },
  {
    name: "Transfer",
    description: "Resident sent out to hospital or another facility.",
  },
  {
    name: "Hospital Return",
    description: "Resident coming back from the hospital.",
  },
  {
    name: "Pain",
    description: "Assessment and interventions.",
  },
  {
    name: "SOB/Respiratory",
    description: "Shortness of breath or respiratory changes.",
  },
  {
    name: "Altered Mental Status (AMS)",
    description: "Confusion or mental status changes.",
  },
  {
    name: "Catheter/Foley",
    description: "Insertion, removal, replacement, catheter care.",
  },
  {
    name: "Provider Notification",
    description: "Documents notifying the physician/NP and any new orders.",
  },
  {
    name: "Routine",
    description: "General condition and care, day-to-day.",
  },
  {
    name: "Quarterly",
    description: "Periodic summary of overall condition.",
  },
];

/** The description for a category name, or "" for anything not on the list. */
export function categoryDescription(name) {
  return CATEGORIES.find((c) => c.name === name)?.description ?? "";
}
