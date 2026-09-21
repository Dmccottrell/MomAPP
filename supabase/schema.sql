-- Charting Practice — Supabase schema.
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query ->
-- paste this whole file -> Run. Safe to re-run if it fails partway
-- through (uses `if not exists` / `create or replace` throughout).
--
-- This replaces the old localStorage-only profile system with real
-- accounts. See README.md's "Accounts" section for the reasoning.

-- ---------------------------------------------------------------------
-- profiles: one row per signed-up user, created automatically by the
-- trigger at the bottom. The first person ever to sign up becomes the
-- admin, same rule as the old local-only version.
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  is_admin boolean not null default false,
  can_build_scenarios boolean not null default false,
  created_at timestamptz not null default now()
);

-- Added after the initial table — `if not exists` makes this safe to
-- re-run against a project that already has the table. Defaults to false
-- for every row, so re-running this after adding the column will also
-- show the tour once to already-existing accounts, not just brand-new
-- ones — a one-time "here's what's new" rather than a gap in the rule.
alter table public.profiles add column if not exists has_seen_onboarding boolean not null default false;

-- Which version's "what's new" this account has already dismissed — see
-- WhatsNewModal.jsx. Left null on purpose: null means "never checked,"
-- which App.jsx treats as "nothing new to show them" and silently sets
-- to the current version instead of popping the modal — both for a
-- brand-new sign-up (nothing's "new" to someone seeing the app for the
-- first time) and for existing accounts the first time they load after
-- this column is added.
alter table public.profiles add column if not exists last_seen_version text;

-- Mirrors auth.users.email so the admin UI can show who's who and trigger
-- a password reset without needing the service_role key — the client
-- can't query auth.users directly. Kept in sync by the trigger below.
-- Deliberately readable by everyone (see the select policy just below),
-- same trust level as a profile's name, not treated as sensitive here.
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- A user can update their own row, but not their own admin/permission
-- flags — those can only change via the "admins can update any profile"
-- policy below, which has no such restriction.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid())
    and can_build_scenarios = (select p.can_build_scenarios from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Creates a profile row automatically whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, name, email, is_admin, can_build_scenarios)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    is_first,
    is_first
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- scenarios: custom scenarios built in the app, shared across everyone
-- (content, not personal history) — same model as the old
-- utils/customScenarios.js, just no longer per-browser.
-- ---------------------------------------------------------------------

create table if not exists public.scenarios (
  id text primary key,
  data jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

drop policy if exists "Scenarios are viewable by everyone" on public.scenarios;
create policy "Scenarios are viewable by everyone"
  on public.scenarios for select using (true);

drop policy if exists "Builder-access users can create scenarios" on public.scenarios;
create policy "Builder-access users can create scenarios"
  on public.scenarios for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_admin or p.can_build_scenarios)
    )
  );

drop policy if exists "Creators and admins can edit scenarios" on public.scenarios;
create policy "Creators and admins can edit scenarios"
  on public.scenarios for update using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Creators and admins can delete scenarios" on public.scenarios;
create policy "Creators and admins can delete scenarios"
  on public.scenarios for delete using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------------------------------------------------------------------
-- history: completed runs. Each learner sees their own; admins see
-- everyone's (the start of the "instructor view" the README mentions).
-- ---------------------------------------------------------------------

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  scenario_id text not null,
  scenario_title text not null,
  score int not null,
  total int not null,
  missteps int not null default 0,
  completed_at timestamptz not null default now()
);

alter table public.history enable row level security;

drop policy if exists "Users see their own history, admins see all" on public.history;
create policy "Users see their own history, admins see all"
  on public.history for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Users can record their own history" on public.history;
create policy "Users can record their own history"
  on public.history for insert with check (user_id = auth.uid());

drop policy if exists "Users can delete their own history" on public.history;
create policy "Users can delete their own history"
  on public.history for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- app_settings: tiny key/value table for the one global flag we need —
-- the admin's builder on/off kill switch.
-- ---------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

alter table public.app_settings enable row level security;

drop policy if exists "Settings are viewable by everyone" on public.app_settings;
create policy "Settings are viewable by everyone"
  on public.app_settings for select using (true);

drop policy if exists "Admins can change settings" on public.app_settings;
create policy "Admins can change settings"
  on public.app_settings for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

insert into public.app_settings (key, value)
values ('builder_enabled', 'true')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- feature_flags: work-in-progress features the admin can turn on for
-- just themselves before the rest of the household sees them. A flag
-- "in preview" only enables for the admin; "published" is live for
-- everyone — see utils/featureFlags.js's isFeatureEnabled(). Publishing
-- one or more flags also writes a row to `releases` (below) so there's
-- a permanent changelog entry even if a flag is later unpublished.
-- ---------------------------------------------------------------------

create table if not exists public.feature_flags (
  id text primary key,
  label text not null,
  description text not null default '',
  status text not null default 'preview' check (status in ('preview', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  published_in_version text
);

alter table public.feature_flags enable row level security;

drop policy if exists "Feature flags are viewable by everyone" on public.feature_flags;
create policy "Feature flags are viewable by everyone"
  on public.feature_flags for select using (true);

drop policy if exists "Admins can manage feature flags" on public.feature_flags;
create policy "Admins can manage feature flags"
  on public.feature_flags for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------------------------------------------------------------------
-- releases: the changelog. One row per version published from Settings
-- → Previews (admin only) — see utils/featureFlags.js's
-- publishFeatureFlags(). Readable by everyone so the About tab can show
-- "what's new" to the whole household, not just the admin.
-- ---------------------------------------------------------------------

create table if not exists public.releases (
  version text primary key,
  changelog text not null,
  published_flags jsonb not null default '[]'::jsonb,
  published_by uuid references public.profiles(id),
  published_at timestamptz not null default now()
);

alter table public.releases enable row level security;

drop policy if exists "Releases are viewable by everyone" on public.releases;
create policy "Releases are viewable by everyone"
  on public.releases for select using (true);

drop policy if exists "Admins can create releases" on public.releases;
create policy "Admins can create releases"
  on public.releases for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Lets utils/featureFlags.js's unpublishFeatureFlag() remove a release's
-- changelog entry once every flag it published has been unpublished
-- again — "unpublish" should mean it disappears, not stay listed as
-- something that shipped.
drop policy if exists "Admins can delete releases" on public.releases;
create policy "Admins can delete releases"
  on public.releases for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

insert into public.releases (version, changelog, published_flags, published_by)
values (
  '1.0.0',
  'Initial release: nursing documentation scenarios, real accounts with admin-managed access, and the in-app scenario builder.',
  '[]'::jsonb,
  null
)
on conflict (version) do nothing;

-- ---------------------------------------------------------------------
-- Profile photo, and keeping profiles.email in sync after someone
-- changes their email (not just on signup — see utils/auth.js's
-- updateEmail()). Both back Settings → Account's expanded tools, gated
-- behind the 'account-profile-tools' feature flag seeded below.
-- ---------------------------------------------------------------------

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists social_links jsonb not null default '{}'::jsonb;

create or replace function public.handle_user_email_change()
returns trigger as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_change();

-- Avatar images: a public bucket (same trust level as a name — everyone
-- can already see everyone's name) where storage RLS restricts writes to
-- each user's own folder, keyed by their user id.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly viewable" on storage.objects;
create policy "Avatar images are publicly viewable"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Ships turned off — try it yourself from Settings → Previews, then
-- publish it when it's ready for everyone.
insert into public.feature_flags (id, label, description)
values (
  'account-profile-tools',
  'Expanded account settings',
  'Profile photo, change email, change password, and social links in Settings → Account.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'nav-scroll-fix',
  'Fix sideways page scroll',
  'Stops the closed menu drawer from adding a horizontal scrollbar to every screen.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'smart-note-grading',
  'Smarter note grading',
  'Matches whole words instead of fragments, accepts shorthand and small typos, checks that times and measurements are actually written down, and adds wording tips.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'scenario-categories',
  'Scenario categories',
  'Adds the charting note types (Lab/Diagnostic, Medication, Pain, SOB/Respiratory and more) as a Category dropdown in the scenario builder, and a category filter on Home.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'care-settings',
  'Hospital / Nursing home split',
  'Splits scenarios into Hospital and Nursing home tabs on Home, and adds a Care setting field to the scenario builder.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'single-about',
  'Single About page',
  'Removes the duplicate About tab from Settings, and shows the latest version at the bottom of the About page in the menu.'
)
on conflict (id) do nothing;

-- Gates 10 new preset scenarios (5 Hospital, 5 Nursing home — see
-- src/scenarios/) that are AI-drafted and need a clinical-accuracy
-- review before real learners see them. Unlike most flags this one
-- doesn't change existing behavior when published — it just adds new
-- content to Home once someone has actually checked it.
insert into public.feature_flags (id, label, description)
values (
  'scenario-batch-hn-1',
  '10 new scenarios (Hospital + Nursing home)',
  'Adds 5 Hospital and 5 Nursing home scenarios covering Lab/Diagnostic, Medication, Pain, SOB/Respiratory, Provider Notification, Admission/Readmission, Transfer, Hospital Return, AMS, and Catheter/Foley. AI-drafted — review clinical accuracy before publishing.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'card-spotlight',
  'Cursor spotlight on scenario cards',
  'A subtle glow that follows the cursor over each scenario card on Home, colored from the active accent.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'appearance-redesign',
  'Redesigned Appearance settings',
  'Settings navigation becomes a row list instead of pill tabs; Appearance gains Density, Corner radius, Animations, Reduce motion, High contrast, a custom accent color, a live preview, and Reset appearance.'
)
on conflict (id) do nothing;

insert into public.feature_flags (id, label, description)
values (
  'mobile-install-hint',
  'Mobile "add to home screen" hint',
  'A brief, self-dismissing nudge on mobile (5 seconds) to install the app — a real Install button on Android, Share-sheet instructions on iOS.'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- security_answers: 3 security questions set up at signup, used by the
-- "forgot password" flow on the sign-in screen as an alternative to the
-- email-link reset — see supabase/functions/security-question-reset/ and
-- utils/securityQuestions.js. Answers are hashed client-side (trimmed and
-- lowercased first, so they aren't case-sensitive the way a password is)
-- before they're ever sent anywhere; this table only ever holds hashes.
-- Not gated behind a feature flag — the flag system checks a signed-in
-- profile, but signup and forgot-password both happen before anyone's
-- signed in, so there's no profile yet to check it against.
-- ---------------------------------------------------------------------

create table if not exists public.security_answers (
  user_id uuid references public.profiles(id) on delete cascade not null,
  question_index smallint not null check (question_index between 0 and 2),
  question text not null,
  answer_hash text not null,
  primary key (user_id, question_index)
);

alter table public.security_answers enable row level security;

-- No select policy at all, on purpose: nobody, not even the account's
-- own owner, can read a stored hash back through the client. Only the
-- security-question-reset Edge Function (service_role, bypasses RLS
-- entirely) ever reads this table.
drop policy if exists "Users can set their own security answers" on public.security_answers;
create policy "Users can set their own security answers"
  on public.security_answers for insert with check (user_id = auth.uid());

drop policy if exists "Users can update their own security answers" on public.security_answers;
create policy "Users can update their own security answers"
  on public.security_answers for update using (user_id = auth.uid());
