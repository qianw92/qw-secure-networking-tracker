# Secure Networking Tracker

> **📋 THIS IS AN OUTLINE.** Every `> 💡` blockquote is a note to me about what belongs in that
> section — delete each one as I fill it in. The README is the entire grading surface: a grader
> should need only this repo's URL to understand, run, test, and evaluate the project.
>
> **Status: 0 / 13 sections complete.**

---

## 1. Overview

> 💡 One paragraph. What the app is, who it's for, what problem it solves. Write this last —
> it's easier once the app exists. Mention that it's a private networking tracker for Berkeley
> contacts and that each user's data is isolated at the database level.

_TODO_

---

## 2. Live URL

> 💡 The deployed Vercel link(s). A grader clicks this first — if it's broken or missing,
> nothing else matters. Since the frontend and backend deploy as two separate Vercel projects,
> list both, and make clear which one to actually open.

- **App (open this):** _TODO_
- **API:** _TODO_
- **Health check:** _TODO_ `/health`

---

## 3. Screenshots / Walkthrough

> 💡 Required evidence. Save images to `docs/screenshots/` and embed them with
> `![description](docs/screenshots/name.png)`. These five are explicitly graded:

- [ ] Sign-in and sign-out
- [ ] Creating a contact
- [ ] Editing a contact
- [ ] Deleting a contact
- [ ] Refreshing the browser and the contact still being there

_TODO_

---

## 4. Features

> 💡 A plain bulleted list. Mirror the assignment's functional requirements so a grader can
> tick them off without hunting. Every box below is a stated requirement:

- [ ] Sign up, sign in, sign out
- [ ] Add a contact: name, company, role, where we met, notes, priority
- [ ] Priority accepts only `high`, `medium`, or `low`
- [ ] View contacts in a clear, sortable list or table
- [ ] Edit a contact
- [ ] Delete a contact
- [ ] Sort contacts
- [ ] Filter contacts
- [ ] Contacts survive a browser refresh
- [ ] Empty names and invalid priorities fail with a clear error message
- [ ] Loading, empty, success, and error states are all understandable
- [ ] Works on both desktop and mobile

---

## 5. Technology Stack and Why

> 💡 Not just a list — the assignment asks *why* for each choice. One line of reasoning each.
> Fill in the "why" in my own words; I have to be able to defend these out loud.

| Layer | Technology | Why |
|---|---|---|
| Frontend | _TODO_ | _TODO_ |
| Styling / components | _TODO_ | _TODO_ |
| Backend | _TODO_ | _TODO_ |
| Validation | _TODO_ | _TODO_ |
| Database | _TODO_ | _TODO_ |
| Authentication | _TODO_ | _TODO_ |
| Data access | _TODO_ | _TODO_ |
| Testing | _TODO_ | _TODO_ |
| Hosting | _TODO_ | _TODO_ |
| Source control | _TODO_ | _TODO_ |

---

## 6. Architecture

> 💡 Must explain all five: frontend, backend, database, authentication, hosting. A diagram
> plus a few sentences beats paragraphs of prose. The key thing to convey is the **request
> flow** — what happens, in order, when a signed-in user loads their contact list.

```
TODO: diagram
```

**Request flow (what happens when I add a contact):**

1. _TODO_

---

## 7. Local Setup

> 💡 Must work from `git clone` through `npm run dev` with no missing steps. Best test: imagine
> a grader on a fresh laptop who has never seen this project. Include Node version, install,
> env file creation, database setup, and the dev command.

```bash
# TODO
```

---

## 8. Environment Variables

> 💡 **Names only — never real values.** `.env.example` is committed with placeholders;
> `.env.local` holds the real values and is gitignored. Explain which are public (safe in the
> browser) and which are server-only, and *why* that's safe.

**Public** (shipped to the browser — safe because Row Level Security protects the data):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_NEON_AUTH_URL` | _TODO_ |
| `NEXT_PUBLIC_NEON_DATA_API_URL` | _TODO_ |

**Server-only** (never committed, never sent to the browser):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | _TODO_ |
| _TODO_ | _TODO_ |

---

## 9. Database Schema

> 💡 Every column of the `contacts` table, with its type and any constraint. A table is clearer
> than dumped SQL, but include the `CREATE TABLE` statement too.

| Column | Type | Notes |
|---|---|---|
| _TODO_ | | |

```sql
-- TODO
```

---

## 10. Authentication and Row Level Security

> 💡 The most heavily graded section. Must cover:
> - How signing in works and what proves a user's identity
> - What Row Level Security is and why it's stronger than hiding things in the UI
> - The ownership rule itself, and the four separate policies (select / insert / update / delete)
> - Specifically: how an update is prevented from reassigning a row to a different user
> - Why the public URLs above are safe to expose

_TODO_

```sql
-- TODO: the four policies
```

---

## 11. Testing

> 💡 The command a grader runs, what the test actually checks, and pasted output proving it
> passes. At least one passing validation test is required.

**Command:**

```bash
# TODO
```

**What it verifies:** _TODO_

**Output:**

```
TODO: paste real output
```

---

## 12. Security Verification

> 💡 This section is where the security evidence lives. Each item below is a stated requirement
> — check it off only once I've actually verified it, not when I think it should work.

- [ ] `contacts` has a text `user_id` that defaults to `auth.user_id()` and cannot be null
- [ ] Row Level Security is **enabled** on `contacts`
- [ ] Separate `select`, `insert`, `update`, and `delete` policies exist for authenticated users
- [ ] Every policy restricts access to rows where `user_id` matches the signed-in user
- [ ] The update policy prevents reassigning a row to another user
- [ ] Two test accounts prove User A cannot read or change User B's contacts
- [ ] No connection string, cookie secret, or other secret appears anywhere in Git history

**Two-account privacy test:**

> 💡 Required evidence. Show User A's list, then User B's list, and prove B can't reach A's data.
> Strongest possible version: query the database directly as User B, bypassing the app entirely.

_TODO — screenshots_

**Invalid input failing safely:**

> 💡 Required evidence. Screenshot an empty name or a priority of something like "urgent"
> being rejected with a clear message.

_TODO — screenshot_

---

## 13. Deployment

> 💡 Enough detail that someone else could redeploy this from scratch. Include the production
> environment variables step and adding the deployed domain to the auth provider's trusted
> origins — sign-in breaks in production without it.

1. _TODO_

---

## 14. Known Limitations and Next Steps

> 💡 Don't skip this and don't be defensive — naming real tradeoffs honestly reads as
> engineering judgment. What did I consciously leave out, and what would I build next?

**Limitations:**

- _TODO_

**What I'd improve next:**

- _TODO_

---

## Definition of Done

> 💡 The assignment's final checklist. Nothing ships until every box is checked **against the
> live deployed URL**, not just localhost.

- [ ] The application is live at a public URL
- [ ] A user can sign in and sign out
- [ ] A user can add, view, edit, delete, sort, and filter contacts
- [ ] Data survives a refresh because it's stored in Postgres
- [ ] User A cannot see or change User B's contacts
- [ ] Invalid data fails safely with a clear message
- [ ] At least one automated test passes
- [ ] No secrets appear in frontend code or Git history
- [ ] The README contains every required section and all grading evidence
- [ ] **I can explain the schema, the RLS rule, and the request flow without help**
