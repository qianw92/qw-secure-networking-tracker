# Secure Networking Tracker

A private networking tracker for the people I want to stay connected with at Berkeley. Each
person signs in, keeps their own list of contacts — name, company, role, where we met, notes,
and a priority — and can search, filter, and sort it. The point of the project is not the
contact list; it is that **one user's contacts are unreachable to every other user, and that
guarantee is enforced by the database itself rather than by the app being polite.** Postgres
Row Level Security rejects rows that are not yours, so even a request that skips the app
entirely comes back empty.

> **Status: in progress.** Sections marked _Not yet done_ are honest gaps, not oversights.
> The build order is tracked in [docs/ROADMAP.md](docs/ROADMAP.md).

---

## 1. Live URL

> _Not yet done — the app has not been deployed. It runs locally; see §7._

---

## 2. Screenshots

> _Not yet done._

---

## 3. Features

| Feature | Status |
|---|---|
| Sign up, sign in, sign out | ✅ |
| Add a contact (name, company, role, where we met, notes, priority) | ✅ |
| Priority restricted to `high` / `medium` / `low` | ✅ |
| View contacts in a table (desktop) or cards (mobile) | ✅ |
| Search by name | ✅ |
| Filter by priority | ✅ |
| Sort by date added, name, priority, or company, ascending or descending | ✅ |
| Contacts survive a browser refresh | ✅ |
| Blank names and invalid priorities fail with a clear message | ✅ |
| Loading, empty, error, and populated states | ✅ |
| Works on phone and desktop | ✅ |
| Edit a contact | ✅ |
| Delete a contact, with a confirmation step | ✅ |

---

## 4. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | The assignment asks for a separated frontend and backend, and I wanted them genuinely separate — two builds, two deployments. Vite produces a pure frontend with no server in it, which makes that separation real rather than nominal. |
| Styling | Tailwind CSS v4 + shadcn/ui | shadcn copies component source into the repo instead of hiding it in a dependency, so I can open any component and explain it. Accessible and responsive by default. |
| Backend | Express 5 + TypeScript | Small, unopinionated, and readable. The whole API is four routes; a heavier framework would add concepts without adding safety. |
| Validation | Zod | Rules read like sentences and double as the unit-test surface. |
| Database | Neon Postgres | Required by the assignment. Row Level Security is the reason the privacy guarantee is credible. |
| Auth | Neon Managed Better Auth | Required. Also: password handling is easy to get subtly wrong, and this is not the place to hand-roll it. |
| Data access | Neon Data API (PostgREST) | Required. Lets the API forward the user's own token so the database still decides what they may see. |
| Testing | Vitest | Fast, no configuration, and the validation suite runs with no database or network. |
| Hosting | Vercel | Required. Two projects, one per app. |

---

## 5. Architecture

```
Browser  ── sign in ─────────────────────────▶  Neon Managed Better Auth
(apps/web)                                          returns a signed JWT
   │
   │  fetch /contacts  +  Authorization: Bearer <jwt>
   ▼
apps/api  (Express + Zod)
   │  1. reject the request if there is no token
   │  2. validate the body
   │  3. strip any user_id the caller sent
   │  4. forward the caller's own token onward
   ▼
Neon Data API  ──▶  Postgres
                     ├─ RLS: four policies, auth.user_id() = user_id
                     └─ CHECK constraints on name and priority
```

**What happens when I add a contact**

1. The browser checks the form and shows inline errors. This is a courtesy — it can be bypassed.
2. It asks Neon Auth for a fresh JWT and sends the contact to `POST /contacts`.
3. The API rejects the request outright if there is no token.
4. Zod validates the body. A blank name or a priority outside the three allowed values returns 400.
5. Any `user_id` in the request is **dropped**.
6. The API forwards the user's own token to the Data API.
7. Postgres fills `user_id` from `auth.user_id()`, checks the constraints, and applies the RLS insert policy.
8. The saved row comes back and the list refreshes.

**Three layers, doing different jobs**

| Layer | Job | Bypassable? |
|---|---|---|
| Browser | Fast, friendly feedback | Yes, trivially |
| API + Zod | Structured errors; strips forged ownership | Yes — the Data API URL is public |
| Postgres CHECK + RLS | The floor | **No** |

The honest version: the frontend holds the public Data API URL, so someone determined could
skip the API. What stops them is the constraints and RLS, because nothing reaches the table
without going through Postgres. The API tier buys clear errors, a home for logic, and the
separation the assignment asks for. **It is not the security boundary.**

**The API holds no database credential.** It forwards the user's token. There is no
`DATABASE_URL` in its environment and no secret in it to leak.

---

## 6. Repository Layout

```
apps/
  web/   Frontend — Vite + React. Its own build, its own deployment.
  api/   Backend  — Express + Zod. Its own build, its own deployment.
db/
  schema.sql   Table, constraints, RLS policies, grants. The security model.
docs/
  ROADMAP.md   Working build plan.
```

---

## 7. Local Setup

Requires Node 22 or newer (`node --version`).

```bash
git clone https://github.com/qianw92/qw-secure-networking-tracker.git
cd qw-secure-networking-tracker
npm install
```

Create the two environment files from their templates and fill in the values from your Neon
project (§8):

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local
```

Create the database objects by running the contents of [`db/schema.sql`](db/schema.sql) in the
Neon SQL Editor.

Then run the two apps in **two separate terminals** — they are separate programs:

```bash
npm run dev
```

```bash
npm run dev:api
```

`npm run dev` starts the frontend on http://localhost:5173 — the one you open in a browser.
`npm run dev:api` starts the backend on http://localhost:8787, which serves no pages; the
frontend calls it. The app cannot load contacts unless both are running.

---

## 8. Environment Variables

Real values live in `.env.local`, which is gitignored. `.env.example` is committed with
placeholders. **No file in this repository contains a real secret.**

**`apps/web` — public.** Vite bundles anything with this prefix into the JavaScript every
visitor downloads. Safe here only because RLS decides what a token can actually reach.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_NEON_AUTH_URL` | Neon Auth endpoint — sign-up, sign-in, sessions |
| `NEXT_PUBLIC_NEON_DATA_API_URL` | Neon Data API endpoint |
| `NEXT_PUBLIC_API_BASE_URL` | The backend (`http://localhost:8787` locally) |

**`apps/api` — server-only.** Never sent to a browser.

| Variable | Purpose |
|---|---|
| `NEON_DATA_API_URL` | Where the API forwards the caller's token |
| `ALLOWED_ORIGINS` | Comma-separated list of origins allowed to call the API |

**On `NEXT_PUBLIC_`:** this is a Next.js convention and this frontend is Vite, which normally
only exposes `VITE_`-prefixed variables. `apps/web/vite.config.ts` sets
`envPrefix: ['VITE_', 'NEXT_PUBLIC_']` so the names the assignment specifies work as written.

**There is no `DATABASE_URL` anywhere.** Nothing in the running system connects to Postgres
with a password. The schema was applied through the Neon console.

---

## 9. Database Schema

Full source, with comments: [`db/schema.sql`](db/schema.sql).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `default gen_random_uuid()` |
| `user_id` | `text` | **`not null`, `default auth.user_id()`** — the owner |
| `name` | `text` | `not null`, `check (length(btrim(name)) > 0)` |
| `company` | `text` | Optional |
| `role` | `text` | Optional |
| `met_where` | `text` | Optional — where we met |
| `notes` | `text` | Optional |
| `priority` | `text` | `not null`, `default 'medium'`, `check (priority in ('high','medium','low'))` |
| `created_at` | `timestamptz` | `not null`, `default now()` |
| `updated_at` | `timestamptz` | `not null`, maintained by a trigger |

`user_id` is filled in **by the database**, from the signed-in user's token. The browser never
supplies it, which is what makes ownership unforgeable rather than merely unlikely.

`btrim` matters: without it a name of `"   "` passes a naive "not empty" check.

---

## 10. Authentication and Row Level Security

Signing in returns a **JWT** — a token signed by Neon that cannot be altered without
invalidating the signature. Its `sub` claim is the user's id. Postgres reads that claim through
`auth.user_id()`.

`ALTER TABLE contacts ENABLE ROW LEVEL SECURITY` makes the table **deny-by-default**: with RLS
on and no policies, nobody reads anything. Access is then granted back deliberately:

```sql
create policy contacts_select on public.contacts
  for select to authenticated using (auth.user_id() = user_id);

create policy contacts_insert on public.contacts
  for insert to authenticated with check (auth.user_id() = user_id);

create policy contacts_update on public.contacts
  for update to authenticated
  using (auth.user_id() = user_id)          -- may only target my own rows
  with check (auth.user_id() = user_id);    -- and may not reassign them

create policy contacts_delete on public.contacts
  for delete to authenticated using (auth.user_id() = user_id);
```

**`USING` vs `WITH CHECK`** is the subtle part. `USING` filters which existing rows you may
see or target. `WITH CHECK` inspects the row *after* the write. The update policy needs both:
`USING` stops me editing your contact, and `WITH CHECK` stops me editing my own contact so it
becomes yours. With only `USING`, reassigning ownership would succeed.

Grants are separate from policies and both are required — RLS decides *which rows*, grants
decide *which tables*. Only the `authenticated` role is granted anything; `anonymous` gets
nothing, so signed-out visitors cannot reach the table at all.

---

## 11. Testing

```bash
npm test
```

Runs 21 cases against the trusted validation rules, with **no database, network, or
credentials** — so it passes on a fresh clone.

```
 ✓ src/__tests__/validation.test.ts (21 tests) 3ms

 Test Files  1 passed (1)
      Tests  21 passed (21)
```

What it verifies:

- A missing, empty, or whitespace-only name is rejected
- Surrounding whitespace is trimmed
- A name over 200 characters is rejected
- A priority outside `high`/`medium`/`low` is rejected, including wrong casing
- Priority defaults to `medium` when omitted
- **A client-supplied `user_id` is stripped**, as are `id` and the timestamps
- Blank optional fields become `null` rather than `""`
- On edit: partial updates work, but a blank name or invalid priority is still rejected, an empty update is refused, and `user_id` is still stripped

One of these caught a real bug: `priority` carried a default that `.partial()` then injected
into empty edit requests, so the "no changes" guard never fired and an empty edit could
silently overwrite a priority.

> **Not yet done:** an automated two-account isolation test. The manual evidence is in §12.

---

## 12. Security Verification

| Requirement | Status |
|---|---|
| `user_id` is `text`, `not null`, defaults to `auth.user_id()` | ✅ |
| RLS enabled on `contacts` | ✅ |
| Separate select / insert / update / delete policies | ✅ |
| Every policy restricts to `auth.user_id() = user_id` | ✅ |
| Update policy prevents reassigning a row to another user | ✅ `WITH CHECK` |
| No secret committed to Git | ✅ |
| Two-account proof | ◑ Observed, not yet documented with screenshots |

**Verified by bypassing the browser** — requests sent straight to the API with a valid token,
as someone with developer tools would:

| Sent | Result |
|---|---|
| Blank name | `400` — "Name is required." |
| Whitespace-only name | `400` — "Name is required." |
| `priority: "urgent"` | `400` — "Priority must be high, medium, or low." |
| No token | `401` — "You must be signed in to do that." |
| **A forged `user_id`** | `201`, **stored under the caller's own id** |
| `PATCH` on another user's contact | `404` — row unchanged |
| `DELETE` on another user's contact | `404` — row still present |
| `PATCH` on an id that does not exist | `404` — **identical response**, so existence cannot be probed |

That last row is the ownership proof: ownership was explicitly claimed for another user and
the database assigned the row to the caller anyway.

**Fail-closed check.** Querying `contacts` as the `authenticated` role with no token returns
**0 rows** while the table owner sees every row. Access is denied by default and granted only
on proof of identity.

**Two accounts, observed.** The database currently holds contacts belonging to two different
accounts. Signed in as one, the app lists only that account's rows and never the other's.

> **Not yet done:** side-by-side screenshots and an automated version of this test.

---

## 13. Deployment

> _Not yet done._

---

## 14. Known Limitations

- **No automated isolation test.** Verified manually; not yet a test that runs on demand.
- **The API does not verify the JWT signature itself.** It forwards the token and lets Neon validate it, relying on RLS as the boundary. Correct, but a forged token travels further into the system than necessary. Verifying at the edge with `jose` against Neon's JWKS would fail faster.
- **Validation rules are written twice** — once in the browser for speed, once in the API for trust. They can drift. A shared package would fix it; the database constraints are the backstop either way.
- **Search matches names only**, not company or notes.
- **No pagination.** Fine for a personal contact list; it would not survive thousands of rows.
- **The frontend can still reach the Data API directly**, since the URL is public. RLS makes that safe rather than harmful, but the API tier is not a chokepoint.

**What I would do next**, in order: edit and delete in the UI; the automated two-account test;
deploy; then JWT verification at the API edge.
