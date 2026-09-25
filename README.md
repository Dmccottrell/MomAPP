# Charting Practice

**Status: Prod — trials and testing.** Live at the deployed URL with a real
Supabase backend, currently being tried out by real users (starting with
the nurse who writes the scenarios) to surface what needs to change before
it's used more broadly.

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

A first-time sign-up sees a short welcome tour before any of this (Home,
History, My Scenarios if they have access, Settings) — see "First-time tour"
below. Signing in, signing out, and switching between nav tabs all cross-fade
via the browser's View Transitions API rather than snapping instantly; see
`utils/viewTransition.js`.

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
  accounts in Settings → User management. Scenarios built there are shared
  across everyone signed in, same as the presets on Home.
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
- **An admin can reset another account's password, promote or demote
  another admin, or delete an account outright**, all from Settings → User
  management. Password reset just emails a normal Supabase reset link
  (`utils/auth.js`'s `sendPasswordReset`) — no special privileges needed.
  Promoting/demoting is a plain profile update, allowed by the "admins can
  update any profile" RLS policy. Deletion is different: removing a row
  from `auth.users` requires Supabase's Admin API, which needs the
  `service_role` key — a credential that must never reach the browser. That's
  one of this app's two pieces of server-side code, a Supabase Edge
  Function (`supabase/functions/delete-user/`) that re-checks the caller is
  really an admin before touching anything, and refuses to delete yourself.
  See "Setting up the Edge Functions" below.
- **Signing up also sets up 3 security questions**, picked from a fixed
  list so they can't be left blank or duplicated — the "Forgot password?"
  link on the sign-in screen uses one, randomly chosen, as an alternative
  to the email-link reset for whoever doesn't want to wait on email. Only
  a SHA-256 hash of the (trimmed, lowercased) answer is ever stored or
  sent anywhere — see `utils/securityQuestions.js`. Checking the answer
  and actually setting the new password both need the `service_role` key
  too (there's no session yet to do either the normal way), so this is
  this app's other piece of server-side code:
  `supabase/functions/security-question-reset/`. Worth being honest that
  security questions are a weaker recovery mechanism than a real email
  link — real answers are often guessable or discoverable — chosen here
  for a small household of people who mostly know each other, not as a
  general recommendation.
- **Settings → Account has more once "Expanded account settings" is
  published** (Settings → Previews, admin only until then): a profile
  photo (stored in a public Supabase Storage bucket, `avatars`, one file
  per user), changing your email (Supabase's own confirm-by-link flow) or
  password (requires your current password first, as identity proof —
  `utils/auth.js`'s `verifyPassword`, which checks it via a throwaway,
  non-persisting Supabase client so it doesn't disturb your real signed-in
  session), and links to your own social profiles (just stored and shown
  back to you — nothing else in the app reads them yet).

## First-time tour

Every profile has a `has_seen_onboarding` flag (`supabase/schema.sql`,
`utils/profiles.js`). App.jsx checks it right after loading the profile row
and, if false, shows `screens/Onboarding.jsx` — a short multi-step
walkthrough — instead of the normal app. Finishing or skipping it writes the
flag back to true, so it's gone for that account on any device from then on.
This column was added after the first version of the schema; if your project
predates it and the tour won't stay dismissed, re-run `schema.sql` once (see
below) to add the missing column — after that one-time fix, it behaves
correctly going forward.

### Appearance customization

Settings → Appearance has three independent preferences, each stored in
`localStorage` and applied as an attribute on `<html>` (`data-theme`,
`data-accent`, `data-text-size`) that index.css keys its CSS custom
properties off of — same pattern for all three, see `utils/theme.js`,
`utils/accent.js`, and `utils/textSize.js`:

- **Theme** — System / Light / Dark, as before.
- **Accent color** — 5 presets (Forest is the original color and the
  default); each has its own light- and dark-mode shade, so switching
  theme doesn't wash out or clash with whichever accent is picked.
- **Text size** — Small / Medium / Large, scaling the root font size and,
  through it, everything else in the app measured in `rem`.

### Feature previews and releases

Settings → Previews (admin only) is where a work-in-progress feature gets
tried out before the rest of the household sees it, and where publishing it
becomes a real, dated changelog entry:

- **A feature flag** (`feature_flags` table) starts "in preview" — enabled
  only for the admin, via `utils/featureFlags.js`'s `isFeatureEnabled()`.
  Once a flag is published for good, its check is removed from the code;
  'scenario-batch-hn-1' (a batch of newer scenarios) is the one still
  gated today.
- Adding a flag **auto-suggests its description from the name you type**
  (editable, same "auto until overridden" pattern as the scenario
  builder's id-from-title) — template text, not AI-written; this app has
  no LLM integration anywhere.
- **Publishing** one flag, or several at once via "Publish all," asks for a
  version number (a patch bump off the last one is suggested, but it's a
  plain text field) and a changelog blurb (also auto-suggested, from the
  flags' names and descriptions — same caveat, template text), then does
  two things: flips those flags to "published" and writes a new row to the
  `releases` table. Not a real database transaction — see the comment in
  `publishFeatureFlags()` for what that means if the second write fails.
- **Release history** (readable by everyone, not just the admin — see the
  RLS policy in `supabase/schema.sql`) is that `releases` table, newest
  first. It's shown on Settings → What's new for everyone, and again on
  the admin's Previews tab alongside the flags. The current version itself
  shows separately, as a quiet footer at the bottom of every Settings tab.
  Each release also carries every published flag's own description, not
  just its name, so What's new and the popup can explain each change, not
  only list what shipped.
- **Unpublishing** the last still-live flag from a release deletes that
  release's changelog entry too — see `unpublishFeatureFlag()`. A release
  that combined this flag with others still published stays, since those
  others really did ship.
- **The "what's new" popup** (`components/WhatsNewModal.jsx`) shows once
  per account per version: App.jsx compares the latest release's version
  against that profile's `last_seen_version` after sign-in and pops the
  modal if they differ, then records it seen. A profile that's never been
  checked (a brand-new sign-up, or an existing account the first time it
  loads after this feature shipped) gets silently caught up instead of
  seeing the popup — there's nothing "new" to someone seeing the app for
  the first time.

## Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers → Email**, turn off "Confirm email" if you
   want people to be able to sign in immediately after signing up (fine for a
   small testing group; turn it back on for anything more public).
3. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once.
4. Copy `.env.example` to `.env.local` and fill in your project's URL and
   anon public key, both found in **Project Settings → Data API**. Never use
   the `service_role` key here — it must stay server-side only. (The one
   place this app does have a server side — the delete-account Edge
   Function — gets that key automatically from Supabase itself; see below.
   It's never typed into anything by hand.)
5. In **Authentication → URL Configuration**, add your app's URL (both
   `http://localhost:5173` for local dev and your deployed URL, e.g. a
   Vercel domain) under **Redirect URLs**. Without this, password-reset
   emails will fail to redirect back into the app.
6. `npm run dev` (or restart it, if it was already running — Vite only reads
   `.env.local` at startup).

Without `.env.local` configured, the app shows a setup notice instead of a
blank page or a confusing network error.

### Setting up the Edge Functions

The other screens work with just the setup above. Two things need a small
server-side function deployed separately: deleting an account, and the
security-question password reset.

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you
   don't have it (`brew install supabase/tap/supabase` on macOS, or see
   their docs for other platforms).
2. `supabase login`, then from this project's folder: `supabase link --project-ref your-project-ref`
   (the project ref is the subdomain in your project URL, e.g. `xcuvxyexcfveyxaqkxad`).
3. `supabase functions deploy delete-user`
4. `supabase functions deploy security-question-reset`

That's it — no secrets to copy anywhere. Supabase automatically gives every
Edge Function its own `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`, so each function has what it needs the moment
it's deployed. If you'd rather not use the CLI, the Supabase dashboard's
**Edge Functions** page also supports creating and pasting in a function
directly — use the contents of
[`supabase/functions/delete-user/index.ts`](supabase/functions/delete-user/index.ts)
and
[`supabase/functions/security-question-reset/index.ts`](supabase/functions/security-question-reset/index.ts).

Both functions always respond with HTTP 200 and put the actual result in
the JSON body (`{ error: "..." }` or `{ ok: true, ... }`) instead of using
real status codes for errors — the Supabase JS client's
`functions.invoke()` discards the response body on anything but a 2xx and
replaces it with a generic "non-2xx status code" message, which would
otherwise swallow every error message either function tries to show.

Until deployed: the "Delete" button in Settings → User management, and the
"Forgot password?" link on the sign-in screen, will just show an error
when used — everything else in the app works fine without either.

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

Every push and PR to `main` runs lint + build in GitHub Actions
(`.github/workflows/ci.yml`) — no secrets needed, since the build succeeds
without `.env.local` set (it just means `isSupabaseConfigured` is false).

## Project structure

```
src/
├── App.jsx                   App shell: auth gate, nav, view switch
├── ScenarioPlayer.jsx        Owns scenario state; decides which screen shows
├── index.css                 All styling, incl. light/dark theme tokens
├── main.jsx                  Entry point; applies the saved theme, accent
│                              color, and text size before the first render
├── screens/
│   ├── Auth.jsx               Sign in / sign up (incl. 3 security questions)
│   ├── ForgotPassword.jsx      Security-question password reset, a mode of Auth.jsx
│   ├── SupabaseSetupNotice.jsx Shown when .env.local isn't configured
│   ├── Onboarding.jsx          One-time welcome tour for a new profile
│   ├── ResetPassword.jsx       "Choose a new password" — lands here from a reset email
│   ├── Home.jsx                Preset scenario list
│   ├── History.jsx             Completed runs — own, or everyone's if admin
│   ├── MyScenarios.jsx         List of in-app-built scenarios
│   ├── ScenarioBuilder.jsx     The scenario-authoring form
│   ├── About.jsx               Full mission/credits write-up (see
│   │                            components/AboutContent.jsx) in its own page
│   ├── Settings.jsx            The tab shell: Appearance/Account/
│   │                            What's new for everyone, User management/
│   │                            Previews for admins; the version number is a
│   │                            quiet footer at the bottom, not per-tab
│   ├── AccountTools.jsx        Photo/email/password/social links
│   ├── UserManagement.jsx      Admin: builder access + accounts (reset,
│   │                            promote/demote, delete)
│   └── Previews.jsx            Admin: feature flags + publishing + changelog
├── components/
│   ├── NavBar.jsx             Persistent top bar + slide-in nav drawer
│   ├── Avatar.jsx             The uploaded photo if there is one, else
│   │                           initials-in-a-circle colored per name
│   ├── icons.jsx              The handful of line icons used in the nav etc.
│   ├── Notice.jsx              The warning banner used on builder screens
│   ├── AboutContent.jsx        The About write-up shown on the About
│   │                            screen
│   ├── ConfirmDialog.jsx       In-app replacement for window.confirm()
│   ├── PublishDialog.jsx       Version + changelog form for publishing flags
│   ├── ReleaseHistoryList.jsx  Read-only changelog list (Settings' What's
│   │                            new tab + the admin Previews tab)
│   ├── WhatsNewModal.jsx       One-time "here's what changed" popup
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
│   ├── auth.js                Sign up/in/out, email + password changes,
│   │                           verifyPassword (identity proof)
│   ├── securityQuestions.js    The question list, answer hashing, saving
│   │                            them at signup
│   ├── passwordRecovery.js     Calls the security-question-reset function
│   ├── profiles.js            Profile rows: admin + builder-access checks
│   ├── customScenarios.js     Shared scenarios table + builder on/off switch
│   ├── storage.js             Local in-progress runs + synced history
│   ├── admin.js                Calls the delete-user Edge Function
│   ├── avatarStorage.js        Uploads/removes a profile photo
│   ├── featureFlags.js         Feature flags: create/publish/unpublish
│   ├── releases.js             Read-only changelog queries
│   ├── avatar.js              Deterministic color + initials for Avatar.jsx
│   ├── theme.js                Light/dark/system theme preference
│   ├── accent.js                Accent color preference (5 presets)
│   ├── textSize.js              Text size preference (small/medium/large)
│   ├── viewTransition.js       Cross-fade wrapper around a state update
│   └── time.js                Clock helpers
└── scenarios/
    ├── fall-01.json                  Preset: unwitnessed fall
    └── change-of-condition-01.json   Preset: post-op change of condition

supabase/
├── schema.sql                 Tables + row-level security policies
└── functions/                 The two server-side pieces — see below
    ├── delete-user/
    └── security-question-reset/

.github/workflows/
└── ci.yml                     Lint + build on every push/PR to main
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
- **The first admin is still "whoever signed up first."** Promoting or
  demoting *other* admins now has a UI (Settings → User management), but
  there's no way to demote yourself or transfer away being the original
  admin from within the app — that's still a manual SQL update in the
  Supabase SQL Editor.
- **Publishing a feature flag isn't a real database transaction.** If the
  flag update succeeds but the `releases` insert fails, the flags go live
  with no matching changelog entry. Worth knowing, not worth an RPC at this
  app's scale — see the comment in `utils/featureFlags.js`.
- **Security questions are a weaker recovery mechanism than email.** Real
  answers are often guessable or something someone else could find out —
  a known tradeoff, accepted here for a small household of people who
  mostly know each other, not a general recommendation. The email-link
  reset (`sendPasswordReset`) still exists as the stronger alternative.
- **Avatar photos are public URLs**, same trust level as a name — anyone
  with the link can view one (not enumerate them; the bucket only serves
  a path it's given). No moderation, no size/content checks beyond "is an
  image, under 2 MB."
- **Two scenarios so far**, covering two different note types (an incident
  note and a change-of-condition note) — a reasonable but still small sample
  for "the format generalizes."

## Possible next steps

- AI-assisted grading that reads the note for clinical accuracy rather than
  keywords — contained to `utils/grading.js` by design
- Print or export a completed session for classroom review
- More scenarios, especially other note types (discharge, new wound), and
  more real use of the in-app builder to find its rough edges
- Collapsible sections for dense pages (`ScenarioBuilder.jsx`, `History.jsx`)
  if either gets cluttered as more scenarios pile up
- Show someone's social links somewhere other users can actually see them
  (right now they're saved and shown back to their own owner, nothing more)

## Built with

React, Vite, plain CSS, and Supabase (Postgres + Auth, plus Storage for
profile photos). No UI framework, no state management library, and almost
no custom server — two small Edge Functions (deleting an account, and the
security-question password reset) for the two things that genuinely need
Supabase's Admin API. Everything else runs off row-level security instead
of hand-rolled backend logic.
