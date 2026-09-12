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
   documentation elements, with an explanation of why each one matters, and an
   optional strong version of the note to compare against.

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
├── App.jsx                   Scenario list, and the switch into a scenario
├── ScenarioPlayer.jsx        Owns scenario state; decides which screen shows
├── index.css                 All styling
├── components/
│   ├── PatientChart.jsx      The pinned patient chart
│   ├── ActionList.jsx        Action buttons and hints
│   ├── ShiftLog.jsx          Running record of what happened
│   ├── NoteEditor.jsx        The writing screen
│   └── NoteFeedback.jsx      Score, rubric, model note
├── utils/
│   ├── grading.js            Note-checking rules
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

## Current limitations

Worth being honest about these:

- **Grading is keyword matching.** It checks whether the right concepts appear
  in the note. It cannot judge whether the note is clinically sound. A
  well-written note using unexpected phrasing may be marked as missing an
  element; a nonsense note containing the right words will pass.
- **Nothing persists.** Refreshing loses progress. No accounts, no history, no
  instructor view of who completed what.
- **No mobile layout testing beyond basic responsiveness.**
- **One scenario so far.** The engine is general, but the format hasn't been
  proven against note types other than an incident note.

## Possible next steps

- More scenarios, especially other note types (discharge, change of condition,
  new wound) to stress-test whether the JSON format generalizes
- Save progress to `localStorage` so a refresh doesn't lose a session
- AI-assisted grading that reads the note for clinical accuracy rather than
  keywords — contained to `utils/grading.js` by design
- An instructor view showing completion and common misses across learners
- Print or export a completed session for classroom review

## Built with

React, Vite, and plain CSS. No UI framework, no state management library, no
backend.
