// Where a scenario takes place. Home's sidebar splits scenarios into
// Hospital and Nursing home, and the scenario builder asks which one a
// scenario is for.
//
// A scenario's `setting` is stored as plain text — one of the names below,
// or missing for scenarios that predate this. Missing counts as "not
// assigned yet": it shows under Home's "All" tab but under neither
// specific setting.

export const CARE_SETTINGS = ["Hospital", "Nursing home"];
