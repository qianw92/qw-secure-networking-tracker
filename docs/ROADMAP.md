> **Working document, not a deliverable.** This is the build plan kept during
> development. The README is the grading surface; this file exists so the
> remaining steps and the reasoning behind past decisions stay visible.
> Copied from the agent's plan file so it lives in the repo.

# Assignment 1: Secure Networking Tracker — Implementation Plan

## Context

Ship a graded full-stack app: a private networking tracker for Berkeley contacts, deployed
publicly, with per-user data isolation enforced by Postgres Row Level Security. The single
deliverable is one public GitHub repo whose README is the entire grading surface.

**Stack is settled: Neon Postgres + Managed Better Auth + Neon Data API**, exactly as the
assignment's Required Technology Stack specifies. The stray `supabase` devDependency from
early exploration gets removed.

### Current state (verified 2026-09-07)

| | |
|---|---|
| **Repo** | `/Users/QW/Desktop/Claude/Assignment 1 Secure Networking Tracker` |
| **Git** | Initialized, 3 commits, identity `qianw92 / qianyinwu23@gmail.com` |
| **Remote** | `https://github.com/qianw92/qw-secure-networking-tracker.git` |
| **Node** | v26.8.1, npm 11.19.0, arm64, via Homebrew — **already installed** |
| **README** | Outline committed with all 13 required sections + checklists |
| **To remove** | `supabase` devDependency, `package-lock.json`, `.DS_Store` |

Neon is fully provisioned — see the Neon section below. **Nothing blocks the build.**

### Tooling

- **Neon MCP** — authorized and working. I can run SQL, inspect the schema, and manage auth
  settings directly, so no console round-trips or connection strings.
- **GitHub MCP** — still failing (`Authorization header is badly formatted`). Irrelevant;
  plain `git push` over the existing remote works.

### Verified stack facts (from live Neon docs, not memory)

- `createClient({ auth: { url }, dataApi: { url } })` is the two-URL object form the assignment
  names. React hooks via `BetterAuthReactAdapter()` from
  `@neondatabase/neon-js/auth/react/adapters`, giving `useSession()` → `{ data, isPending }`.
- Auth: `client.auth.signUp.email()`, `.signIn.email()`, `.signOut()`, `.getSession()`.
- **`session.access_token` is exposed client-side specifically so you can send the JWT to your
  own backend.** This is what makes a genuinely separate backend possible.
- The backend then calls the Data API with that token via `NeonPostgrestClient` from
  `@neondatabase/postgrest-js`, passing `Authorization: Bearer …`. Neon validates the
  signature; RLS enforces ownership.
- Data API needs `GRANT`s to the `authenticated` role and RLS enabled on every exposed table.
  `auth.user_id()` returns the JWT `sub` claim as `text`.
- Neon issues **two** connection strings: pooled (`-pooler` in the hostname) and direct.
  **Schema changes must use the direct one** — pooled connections run through PgBouncer in
  transaction mode and fail on session-level operations, often with errors that never mention
  pooling.

**Worth saying in the README:** the API tier holds no database secret at all. It forwards the
user's JWT. `DATABASE_URL` is used once, locally, by Qianyin, to create the schema — it is
never deployed.

**No ORM.** Neon's skill suggests Drizzle, but app queries go through the Data API, not a
Postgres connection, so an ORM would only wrap one `CREATE TABLE`. Plain SQL keeps the schema
and the RLS policies directly readable — which matters, because the Definition of Done
requires explaining them unaided.

---

## Architecture

```
Browser  ──auth──────────────────────────────▶  Neon Managed Better Auth
(apps/web, Vite+React+Tailwind+shadcn)              returns session.access_token
   │
   │  fetch(API_BASE_URL/contacts)
   │  Authorization: Bearer <access_token>
   ▼
apps/api  (Express + Zod, own Vercel project)
   │  ├─ CORS allowlist
   │  ├─ requireAuth: 401 if no Bearer token
   │  ├─ Zod: name non-blank, priority ∈ {high,medium,low}
   │  └─ strips any client-supplied user_id
   │  forwards the same JWT ─────────────────▶  Neon Data API (PostgREST)
   ▼                                                    │
Neon Postgres ◀─────────────────────────────────────────┘
   ├─ RLS: 4 separate policies, auth.user_id() = user_id
   └─ CHECK constraints (last line of defense)
```

Three independent layers reject bad data: Zod in the API, CHECK constraints in Postgres, RLS
for ownership. That is the story the README tells.

---

## Repo layout

```
qw-secure-networking-tracker/
├── README.md                     # outline exists; fill in as we go
├── .gitignore                    # needs widening — see below
├── package.json                  # npm workspaces root (drop supabase dep)
├── db/
│   ├── schema.sql                # table + constraints + RLS + grants + trigger
│   └── verify_rls.sql            # proves policies exist — README evidence
├── apps/
│   ├── api/                      # ── BACKEND ── own build, own Vercel project
│   │   ├── package.json, tsconfig.json, vitest.config.ts
│   │   ├── vercel.json           # rewrite /(.*) → /api
│   │   ├── .env.example
│   │   ├── api/index.ts          # Vercel serverless entry: exports the app
│   │   └── src/
│   │       ├── server.ts         # local dev listener (port 8787)
│   │       ├── app.ts            # Express: cors, json, routes, error handler
│   │       ├── validation.ts     # Zod schemas  ← the unit-tested module
│   │       ├── auth.ts           # requireAuth, extracts Bearer token
│   │       ├── neon.ts           # NeonPostgrestClient built per-request
│   │       ├── routes/contacts.ts
│   │       └── __tests__/
│   │           ├── validation.test.ts   # always runs, no network
│   │           └── isolation.test.ts    # two-user RLS proof, auto-skips
│   └── web/                      # ── FRONTEND ── own build, own Vercel project
│       ├── package.json, tsconfig.json, vite.config.ts, components.json
│       ├── .env.example
│       └── src/
│           ├── lib/neon.ts       # createClient two-URL object form
│           ├── lib/api.ts        # fetch wrapper; fresh token per request
│           ├── components/ui/    # shadcn primitives
│           ├── components/       # ContactForm, ContactList, Filters,
│           │                     #   EmptyState, ErrorState, Spinner
│           ├── pages/            # SignIn, Contacts
│           └── App.tsx, main.tsx, index.css
└── docs/screenshots/             # README evidence
```

**`.gitignore` must be widened first.** It currently covers only `node_modules/` and
`.env.local`, missing `.env` and every other variant:

```
node_modules/
.env
.env.*
!.env.example
.DS_Store
dist/
```

The `!.env.example` negation matters — that placeholder file is required to be committed.

**Vite env prefix.** Vite exposes only `VITE_*` by default, but the rubric mandates the names
`NEXT_PUBLIC_NEON_AUTH_URL` and `NEXT_PUBLIC_NEON_DATA_API_URL`. Set
`envPrefix: ['VITE_', 'NEXT_PUBLIC_']` in `apps/web/vite.config.ts`. Note it in the README —
it looks like a copy-paste error otherwise.

**Node version.** Local Node 26 is fine for development, but Vercel's runtime tracks LTS. Set
`"engines": { "node": ">=22" }` and let Vercel choose its default rather than pinning 26.

---

## Database schema (`db/schema.sql`)

```sql
create extension if not exists pgcrypto;

create table public.contacts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null default (auth.user_id()),
  name        text        not null,
  company     text,
  role        text,
  met_where   text,                          -- where you met them
  notes       text,
  priority    text        not null default 'medium',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint contacts_name_not_blank check (length(btrim(name)) > 0),
  constraint contacts_priority_valid check (priority in ('high','medium','low'))
);

create index contacts_user_created_idx on public.contacts (user_id, created_at desc);
alter table public.contacts enable row level security;
```

Four **separate** policies — the rubric asks for select/insert/update/delete individually, not
one `FOR ALL`:

```sql
create policy contacts_select on public.contacts
  for select to authenticated using (auth.user_id() = user_id);

create policy contacts_insert on public.contacts
  for insert to authenticated with check (auth.user_id() = user_id);

create policy contacts_update on public.contacts
  for update to authenticated
  using (auth.user_id() = user_id)          -- can only target own rows
  with check (auth.user_id() = user_id);    -- and cannot re-assign ownership

create policy contacts_delete on public.contacts
  for delete to authenticated using (auth.user_id() = user_id);
```

Then Data API grants (`usage` on schema, CRUD on tables + sequences, plus
`alter default privileges`) to `authenticated`, and an `updated_at` trigger.

The `with check` on update is precisely the rubric line *"Update policies prevent a user from
changing a row so it belongs to someone else."* Call it out explicitly in README section 10 —
it's a specific grading item that's easy to miss.

---

## Backend behavior (`apps/api`)

- `GET /contacts?sort=name|created_at|priority&dir=asc|desc&priority=high&q=text`
  — sorting and filtering server-side via PostgREST `.order()` / `.eq()` / `.ilike()`.
- `POST /contacts` — Zod-validated; `user_id` **stripped** so the column default
  `auth.user_id()` always wins.
- `PATCH /contacts/:id` — partial update; `user_id` and `id` stripped.
- `DELETE /contacts/:id` — 404 when RLS returns zero rows (User B deleting A's row).
- `GET /health` — for the README and Vercel sanity checks.
- Errors: `{ error: { message, fields? } }`; 400 validation, 401 missing token, 404
  not-found-or-not-yours. Never leak Postgres internals.

The API deliberately does *not* verify the JWT signature itself — Neon does that, and RLS is
the real boundary. State this plainly in the README's trust model, and list "verify the
signature at the API edge with `jose` + Neon's JWKS" under future work.

---

## Automated tests

**`validation.test.ts` — always runs, no network, the guaranteed pass:**
- empty name → rejected with a clear message
- whitespace-only name `"   "` → rejected
- `priority: "urgent"` → rejected, message names the three legal values
- each of high/medium/low → accepted
- missing priority → defaults to `medium`
- client-supplied `user_id` → stripped, never reaches the database
- valid full payload → passes
- PATCH schema accepts partials but still rejects a blank name

**`isolation.test.ts` — the two-account privacy proof, automated:**
Signs in as User A and User B against the real Auth URL; A creates a contact; asserts B can't
see it in `GET /contacts`, gets 404 on `PATCH`, gets 404 on `DELETE`, and — hitting the **Data
API directly with B's token, bypassing the API entirely** — still can't see A's row. That last
assertion is what proves RLS rather than application logic is doing the work.

Guarded with `describe.skipIf(!process.env.TEST_USER_A_EMAIL)` so `npm test` passes cleanly
for a grader with no credentials, while the full suite runs locally for the README output.

---

## Environment variables

`apps/web/.env.example` — public, shipped to the browser, safe because of RLS:
```
NEXT_PUBLIC_NEON_AUTH_URL=https://your-endpoint.neon.tech/auth
NEXT_PUBLIC_NEON_DATA_API_URL=https://your-endpoint.apirest.region.aws.neon.tech/dbname/rest/v1
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

`apps/api/.env.example` — server-only:
```
NEON_DATA_API_URL=https://your-endpoint.apirest.region.aws.neon.tech/dbname/rest/v1
ALLOWED_ORIGINS=http://localhost:5173
NEON_AUTH_URL=https://your-endpoint.neon.tech/auth   # tests only
TEST_USER_A_EMAIL=
TEST_USER_A_PASSWORD=
TEST_USER_B_EMAIL=
TEST_USER_B_PASSWORD=
```

`db/.env.example` — local schema work only, never deployed. Use the **direct/unpooled**
string (no `-pooler` in the hostname):
```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Before pushing, verify no real value ever entered history:
`git log -p | grep -iE 'postgresql://|secret|password='`

---

## Roadmap

### Done

1. ✅ **Database** (`36e134f`) — `contacts` table, CHECK constraints, RLS enabled, four
   ownership policies, grants to `authenticated` only. Verified fail-closed: the
   `authenticated` role with no JWT sees zero rows.
2. ✅ **Scaffold + auth** (`bf69ec8`) — npm workspaces, Vite + React 19 + TS in `apps/web`,
   Tailwind v4 + shadcn/ui, `NEXT_PUBLIC_` env prefix, two-URL Neon client, sign-up /
   sign-in / sign-out. Verified in-browser round trip; user row confirmed in `neon_auth.user`.
3. ✅ **Create + view** (`915edfc`) — `lib/contacts.ts` as the single data-access module,
   add-contact form, list with loading / error / empty / populated states, cards on mobile
   and a table at `md:`. Verified `user_id` stamped by the database, and survival of a refresh.

### Remaining

4. **Friendly validation messages (browser).** Catch blank names and bad priorities before
   they hit the database, and translate any Postgres error that does surface into human
   language. Today a blank name shows
   `new row for relation "contacts" violates check constraint "contacts_name_not_blank"` —
   safe, but unacceptable as UX and it leaks internal table names.
   **This is a courtesy layer, not a defense.** Anything in the browser can be bypassed.
5. **The backend tier (`apps/api`).** The second of the two builds. Express + Zod.
6. **Rewire the frontend** to call the API instead of the Data API directly. Touches only
   `lib/contacts.ts` by design.
7. **Edit + delete**, built once, against the API.
8. **Sort + filter**, server-side via PostgREST `.order()` / `.eq()` / `.ilike()`.
9. **Deploy** — two Vercel projects, production env vars, both domains added to Neon Auth
   trusted origins.
10. **README** — live URLs, screenshots, test output, all grading evidence.

**Why edit/delete/sort/filter come after the API tier (steps 7–8, not now):** building them
against the Data API today means rewriting them in step 6. Writing them once, against the
final architecture, is strictly less work. The functional requirements are not being skipped —
they are sequenced to avoid building the same feature twice.

---

## Steps 5 and 7: validation and tests, in detail

### The distinction that drives the design

The assignment requires validation in *"trusted server or database code."* Trusted means code
the user cannot reach in and edit. Browser checks are a courtesy to honest users; they are not
a defense. Three layers, doing different jobs:

| Layer | Job | Can it be bypassed? |
|---|---|---|
| Browser (step 4) | Fast, friendly feedback | Yes — trivially |
| Express + Zod (step 5) | Structured errors, clear messages, strips `user_id` | Yes, by calling the Data API directly |
| Postgres CHECK + RLS | The absolute floor | **No** |

**Be ready to say this out loud:** the frontend keeps the public Data API URL, so a determined
person could skip the Express tier entirely. What actually stops them is the CHECK constraints
and RLS in `db/schema.sql` — nothing reaches the table without passing through Postgres. The
API tier buys clear errors, a home for logic, and the separated architecture the assignment
asks for. It is not the security boundary, and the README should say so plainly rather than
overclaim.

### Step 5 — `apps/api`

Per request, in order:

1. `requireAuth` — reject anything without a Bearer token, before any work happens.
2. Zod validation — name non-blank after trimming; priority ∈ {high, medium, low}.
3. Strip `user_id` and `id` from the incoming payload, so the column default `auth.user_id()`
   always wins.
4. Forward the caller's JWT to the Neon Data API so RLS still applies.

Errors: `{ error: { message, fields? } }` — 400 validation, 401 missing token, 404
not-found-or-not-yours. Never leak Postgres internals.

**The API holds no database secret.** It forwards the user's token; there is nothing to leak.
That is a genuinely strong README line, and it is true rather than decorative.

Deliberately *not* verifying the JWT signature at the API edge — Neon does that, and RLS is
the real boundary. List "verify at the edge with `jose` + Neon's JWKS" under future work.

### Step 7 — the two test suites

**`validation.test.ts` — the required "at least one automated test".**

No database, no network, no credentials. Cases: empty name rejected; whitespace-only name
`"   "` rejected; `priority: "urgent"` rejected with a message naming the three legal values;
each of high/medium/low accepted; missing priority defaults to `medium`; a client-supplied
`user_id` is stripped; a valid full payload passes; the PATCH schema accepts partials but
still rejects a blank name.

**This is the one to lead with, because a grader can clone the repo and run `npm test` with no
accounts and it passes.** A test requiring credentials would simply fail for them, which reads
worse than having no test at all.

**`isolation.test.ts` — the two-account privacy proof.**

Sign in as A and B; A creates a contact; assert B cannot see it in `GET /contacts`, gets 404
on `PATCH`, gets 404 on `DELETE`, and — hitting the **Data API directly with B's token,
bypassing the API tier entirely** — still cannot see A's row. That last assertion is the one
that proves RLS rather than application politeness is doing the work.

Guarded with `describe.skipIf(!process.env.TEST_USER_A_EMAIL)` so it skips cleanly without
credentials. Run locally; paste output into README section 11.

**Test accounts:** `test-a@example.com` exists (id `<user-id>`).
User B still to be created.

---

## Neon — provisioned and verified (2026-09-08)

Neon MCP tools are live, so I can query and migrate the database directly.

| | |
|---|---|
| Org | `org-<redacted>` (free plan) |
| Project | `qw-neon-secure-networking-tracker` → `<project-id>` |
| Branch | `production` → `<branch-id>` (default) |
| Database | `neondb`, Postgres 18, `aws-us-west-2` |
| Auth | ✅ active, provider `better_auth` |
| Data API | ✅ active, schemas `["public"]`, anon role `anonymous` |

**The two public URLs** (safe in the browser; these go in `.env.local` / Vercel):

```
NEXT_PUBLIC_NEON_AUTH_URL=https://your-endpoint.neonauth.c-3.us-west-2.aws.neon.tech/neondb/auth
NEXT_PUBLIC_NEON_DATA_API_URL=https://your-endpoint.apirest.c-3.us-west-2.aws.neon.tech/neondb/rest/v1
```

Verified directly against the database:

- `auth.user_id()` and `auth.uid()` both exist — the RLS policies will resolve.
- Roles `authenticated`, `anonymous`, `authenticator`, `neondb_owner` all exist.
- `public` schema has **zero tables** — `contacts` is ours to create, nothing to migrate around.

### The one real gap: trusted domains is empty

`list_auth_trusted_domains` returns `[]`. Sign-in will fail until origins are added:

- `http://localhost:5173` — **before local development starts**
- both Vercel domains — at deploy time

I can add these via `add_auth_trusted_domain`.

### Open risk to confirm empirically

The Data API reads the Postgres role from the JWT claim at `jwt_role_claim_key: ".role"`. If
Managed Better Auth doesn't stamp `role: authenticated` into its tokens, requests would arrive
as `anonymous` and RLS would (correctly) return nothing — looking exactly like a broken policy.
Neon's managed pairing should wire this by default. **First end-to-end sign-in is the test**;
if reads come back empty with a valid token, check this before suspecting the policies.

### No connection string needed

I run `schema.sql` through MCP against the branch directly, so the pooled-vs-direct question
is moot and Qianyin never has to handle `DATABASE_URL`. It stays in `.env.example` as a
documented placeholder only — which is also the honest answer for the README: the app never
uses it.

## Qianyin's remaining steps

- Create the **two test accounts** via the app's sign-up form once it runs locally.
- Import the repo into Vercel **twice** — root directory `apps/web` and `apps/api` — and set
  each project's env vars.
- Confirm the two Vercel domains so I can add them to trusted origins.

---

## Verification

- `npm test` at the root → validation suite green; paste output into README section 11.
- With test creds set → isolation suite green; that's the two-user proof.
- `npm run dev` → API on :8787, web on :5173. Sign up, sign out, sign in.
- Add a contact; refresh the browser; it persists (proves Neon, not local state).
- Edit it; delete it; sort by name/priority/date; filter by priority and search text.
- Submit an empty name and a hand-crafted `priority: "urgent"` → clear inline error, 400 from
  the API. Screenshot it.
- Sign in as User B → A's contacts absent. `curl` the Data API directly with B's token for A's
  row id → empty result. Screenshot both.
- Resize to 375px → usable layout; screenshot for the mobile requirement.
- `git log -p | grep -iE 'postgresql://|secret|password='` → no hits.
- Repeat the whole checklist against the two live Vercel URLs in a private window.

---

## Risks

- **Neon console UI may differ from the docs.** If a URL or toggle isn't where I say, send a
  screenshot and I'll adjust.
- **Trusted origins.** Neon Auth sets an HTTP-only cookie on its own domain. If sign-in
  silently fails in production, check this first. Our API depends only on the Bearer token, so
  it's unaffected.
- **Token expiry.** `lib/api.ts` calls `getSession()` per request for a fresh token rather
  than caching one, avoiding mid-session 401s.
- **Two Vercel projects, two URLs to keep in sync** — the web project's
  `NEXT_PUBLIC_API_BASE_URL` and the API project's `ALLOWED_ORIGINS` point at each other. This
  is the likeliest deployment failure; the README calls it out.
- **Pooled vs direct connection string.** Using the pooled URL for the schema step fails with
  errors that never mention pooling. Use the direct one.
