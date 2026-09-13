# Charting Practice

A browser-based training simulator for nursing documentation. A learner works a
clinical scenario from start to finish, then writes the progress note for it and
gets feedback on what the note covered and what it missed.

Every patient in the built-in scenarios is fictional. **Only ever enter
fictional patients** — see "Accounts and data" below for what that means in
practice now that this has a real database behind it.

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

## Accounts and data

This app has a real backend now: [Supabase](https://supabase.com) (Postgres +
Auth). Signing up creates a real account with a real password — see "Setting
up Supabase" below to run your own instance.

- **The first person to ever sign up becomes the admin.** Admin status and
  scenario-builder permissions are enforced by database row-level security
  policies (`supabase/schema.sql`), not just the UI — a client-side bug can't
  grant access the database itself would refuse.
- **My Scenarios** (the in-app builder) is off by default for everyone except
  the admin, who can turn it on globally and grant it to specific other
  accounts in Settings. Scenarios built there are shared across everyone
  signed in, same as the presets on Home.
- **History syncs.** Completed runs are tied to your account, not a browser,
  so they follow you to another device. An admin sees everyone's history on
  the History page; everyone else sees only their own.
- **In-progress runs stay local.** Mid-scenario state (which actions you've
  taken, your note draft) lives in that device's `localStorage` and doesn't
  sync — it's ephemeral and change-heavy enough that syncing it isn't worth
  the complexity. Finishing a scenario is what gets recorded permanently.
- **Fictional patients only, everywhere.** The scenario builder shows a
  standing warning about this, and flags obvious real-data formats (SSNs,
  phone numbers, emails, birthdate-shaped dates) before saving — see
  `utils/phiCheck.js` for exactly what that can and can't catch. It cannot
  tell a fictional name from a real one; no algorithm can. Treat every
  scenario as something a stranger with database access could read, because
  with a shared Supabase project, several people now can.

### Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers → Email**, turn off "Confirm email" if you
   want people to be able to sign in immediately after signing up (fine for a
   small testing group; turn it back on for anything more public).
3. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once.
4. Copy `.env.example` to `.env.local` and fill in your project's URL and
   anon public key, both found in **Project Settings → Data API**. Never use
   the `service_role` key here — it must stay server-side only, and this app
   has no server side.
5. `npm run dev` (or restart it, if it was already running — Vite only reads
   `.env.local` at startup).

Without `.env.local` configured, the app shows a setup notice instead of a
blank page or a confusing network error.

## Running it locally

Requires [Node.js](https://nodejs.org) 18 or newer, and a configured Supabase
project (see above).

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
├── App.jsx                   App shell: auth gate, nav, view switch
├── ScenarioPlayer.jsx        Owns scenario state; decides which screen shows
├── index.css                 All styling, incl. light/dark theme tokens
├── main.jsx                  Entry point; applies the saved theme before render
├── screens/
│   ├── Auth.jsx               Sign in / sign up
│   ├── SupabaseSetupNotice.jsx Shown when .env.local isn't configured
│   ├── Home.jsx                Preset scenario list
│   ├── History.jsx             Completed runs — own, or everyone's if admin
│   ├── MyScenarios.jsx         List of in-app-built scenarios
│   ├── ScenarioBuilder.jsx     The scenario-authoring form
│   └── Settings.jsx            Theme, account, admin access controls
├── components/
│   ├── NavBar.jsx             Persistent top nav
│   ├── Avatar.jsx             Initials-in-a-circle, colored per name
│   ├── icons.jsx              The handful of line icons used in the nav etc.
│   ├── Notice.jsx              The warning banner used on builder screens
│   ├── PatientChart.jsx       The pinned patient chart
│   ├── ActionList.jsx         Action buttons and hints
│   ├── ShiftLog.jsx           Running record of what happened
│   ├── NoteEditor.jsx         The writing screen
│   └── NoteFeedback.jsx       Score, rubric, model note
├── utils/
│   ├── grading.js             Note-checking rules
│   ├── highlight.js           Marks up a note with its grading matches
│   ├── phiCheck.js            Flags obvious real-data formats before saving
│   ├── supabaseClient.js      The one Supabase client instance
│   ├── auth.js                Sign up / sign in / sign out
│   ├── profiles.js            Profile rows: admin + builder-access checks
│   ├── customScenarios.js     Shared scenarios table + builder on/off switch
│   ├── storage.js             Local in-progress runs + synced history
│   ├── avatar.js              Deterministic color + initials for Avatar.jsx
│   ├── theme.js                Light/dark/system theme preference
│   └── time.js                Clock helpers
└── scenarios/
    ├── fall-01.json                  Preset: unwitnessed fall
    └── change-of-condition-01.json   Preset: post-op change of condition
```

The organizing rule is that each file has one reason to change. Styling lives in
CSS, grading rules live in `grading.js`, clinical content lives in the scenario
JSON, and the components only draw.

## Adding a scenario

Two ways: hand-write JSON, or use the in-app builder (My Scenarios, once an
admin has enabled it for your account).

For hand-written scenarios — see [SCENARIOS.md](SCENARIOS.md) for the full
field reference. The short version:

1. Write the file into `src/scenarios/`.
2. Add two lines to `src/App.jsx` — one `import`, one entry in the `SCENARIOS`
   array.

Scenarios built in the app need no code change — they're saved straight to
the database and show up for everyone immediately.

## Current limitations

Worth being honest about these:

- **Grading is keyword matching.** It checks whether the right concepts appear
  in the note. It cannot judge whether the note is clinically sound. A
  well-written note using unexpected phrasing may be marked as missing an
  element; a nonsense note containing the right words will pass.
- **The real-data check is a format filter, not a guarantee.** It catches
  SSN/phone/email/date-shaped patterns; it can't verify a patient name is
  fictional, because a fictional name and a real one look identical. Whoever
  runs this Supabase project is trusting whoever it's shared with.
- **Admin is "whoever signed up first," not something you choose.** If you
  need a different person to be admin, that's a manual row edit in the
  Supabase dashboard for now, not a UI control.
- **No mobile layout testing beyond basic responsiveness.**
- **Two scenarios so far**, covering two different note types (an incident
  note and a change-of-condition note) — a reasonable but still small sample
  for "the format generalizes."

## Possible next steps

- Admin transfer / multiple admins, from a UI instead of a manual DB edit
- Password reset flow (Supabase supports it; not wired into the UI yet)
- AI-assisted grading that reads the note for clinical accuracy rather than
  keywords — contained to `utils/grading.js` by design
- Print or export a completed session for classroom review
- More scenarios, especially other note types (discharge, new wound), and
  more real use of the in-app builder to find its rough edges

## Built with

React, Vite, plain CSS, and Supabase (Postgres + Auth). No UI framework, no
state management library, no custom server — Supabase's row-level security
does the enforcement a hand-rolled backend would otherwise need to.
