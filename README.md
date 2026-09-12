# Charting Practice

A browser-based training simulator for nursing documentation. A learner works a
clinical scenario from start to finish, then writes the progress note for it and
gets feedback on what the note covered and what it missed.

Every patient in this app is fictional. No real patient information is stored,
transmitted, or entered anywhere in it.

## Why it exists

Nursing programs teach what to chart. They spend much less time letting people
practice charting under the conditions where it actually goes wrong: after a
messy event, from memory, at the end of a shift. This app puts the learner
through the event first so the note has something real to describe.

The scenarios are written by a practicing nurse. The code is a delivery
mechanism for her content, not the point of the project.

## How a scenario works

Four screens, in order:

1. **Brief** — the situation, and the learning objectives.
2. **Care** — a set of possible actions. Some are correct and have a required
   order; some are traps. Wrong choices explain the clinical reasoning rather
   than just marking the answer wrong. Actions cost time, reveal findings, and
   change the patient's vitals.
3. **Note** — a free-text editor. Locked until the patient has actually been
   cared for, which enforces the real-world sequence: treat first, chart second.
4. **Feedback** — the note is checked against the scenario's required
   documentation elements, with an explanation of why each one matters shown
   highlighted in place in the note itself, and an optional strong version of
   the note to compare against.

## Profiles, history, and appearance

Above the scenario itself, the app has a small shell:

- **Profiles** — the first thing anyone sees is a name picker (`ProfilePicker`),
  not a scenario. There's no password; it exists only so two people sharing a
  browser don't see each other's history. See "Accounts" below for what this
  is and isn't.
- **History** — every completed run is recorded, newest first, with a
  "Practice again" shortcut back into that scenario.
- **Settings** — a light/dark/system theme choice, who's currently practicing,
  and a way to wipe your own saved progress.

A persistent nav bar switches between Home, History, and Settings, and stays
visible during a scenario so you can back out early — the in-progress run
stays saved either way (see `utils/storage.js`).

## Running it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the URL it prints, usually `http://localhost:5173`.

Other commands:

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npx eslint .      # lint
```

## Project structure

```
src/
├── App.jsx                   App shell: profile gate, nav, view switch
├── ScenarioPlayer.jsx        Owns scenario state; decides which screen shows
├── index.css                 All styling, incl. light/dark theme tokens
├── main.jsx                  Entry point; applies the saved theme before render
├── screens/
│   ├── ProfilePicker.jsx     Pick or create a local profile ("sign in")
│   ├── Home.jsx              Scenario list
│   ├── History.jsx           Every completed run, newest first
│   └── Settings.jsx          Theme, profile, clear-my-data
├── components/
│   ├── NavBar.jsx            Persistent top nav
│   ├── PatientChart.jsx      The pinned patient chart
│   ├── ActionList.jsx        Action buttons and hints
│   ├── ShiftLog.jsx          Running record of what happened
│   ├── NoteEditor.jsx        The writing screen
│   └── NoteFeedback.jsx      Score, rubric, model note
├── utils/
│   ├── grading.js            Note-checking rules
│   ├── highlight.js          Marks up a note with its grading matches
│   ├── storage.js            localStorage persistence and run history
│   ├── profiles.js           Local, password-less profile picker
│   ├── theme.js              Light/dark/system theme preference
│   └── time.js               Clock helpers
└── scenarios/
    └── fall-01.json          One scenario, entirely as data
```

The organizing rule is that each file has one reason to change. Styling lives in
CSS, grading rules live in `grading.js`, clinical content lives in the scenario
JSON, and the components only draw.

## Adding a scenario

Scenarios are plain JSON — no code. See [SCENARIOS.md](SCENARIOS.md) for the
full field reference. The short version:

1. Write the file into `src/scenarios/`.
2. Add two lines to `src/App.jsx` — one `import`, one entry in the `SCENARIOS`
   array.

That is the only code change required, by design.

## Accounts: what "profiles" are and aren't

The name picker at startup (`ProfilePicker` / `utils/profiles.js`) is **not
authentication**. There's no password, no server, and nothing leaves the
browser. It exists only so history and scores stay separate when more than
one person practices on the same computer — a convenience, not a login.

Everything (`utils/storage.js`, `utils/profiles.js`) is namespaced under
whichever profile is active and lives in `localStorage`. Two consequences
follow directly from that: a profile only exists on the device it was created
on (no cross-device sync), and nothing here should be treated as sensitive —
this was a deliberate choice to ship something useful now rather than take on
a backend before it was needed.

The natural next step, when it's actually needed, is real accounts: a backend
with a database, password or OAuth handling, and hosting for all of it —
which also unlocks the cross-device sync and instructor-view features listed
below. That's a materially bigger project than the rest of this app combined,
so it's deliberately not started until the local-profile version has proven
the rest of the app is worth that investment.

## Current limitations

Worth being honest about these:

- **Grading is keyword matching.** It checks whether the right concepts appear
  in the note. It cannot judge whether the note is clinically sound. A
  well-written note using unexpected phrasing may be marked as missing an
  element; a nonsense note containing the right words will pass.
- **Profiles are local, not accounts.** See "Accounts" above — no password, no
  cross-device sync, no instructor view of who completed what.
- **No mobile layout testing beyond basic responsiveness.**
- **One scenario so far.** The engine is general, but the format hasn't been
  proven against note types other than an incident note.

## Possible next steps

- Real accounts with a backend (see "Accounts" above) — unlocks cross-device
  sync and an instructor view of completion and common misses across learners
- More scenarios, especially other note types (discharge, change of condition,
  new wound) to stress-test whether the JSON format generalizes
- A guided, in-browser scenario builder so a non-developer can create a
  scenario without hand-editing JSON
- AI-assisted grading that reads the note for clinical accuracy rather than
  keywords — contained to `utils/grading.js` by design
- Print or export a completed session for classroom review

## Built with

React, Vite, and plain CSS. No UI framework, no state management library, no
backend.
