# Scene Builder → Claude Code: build prompts

A phase-by-phase prompt sequence for building the real app. **Run them in order, one at a time.** After each, review the deployed preview before continuing. Each prompt assumes Claude Code has the repo open with `CLAUDE.md`, the `prototype/` folder, and the architecture spec available.

> Tip: paste the prompt, let it work, then **verify the stated deliverable yourself** before moving on. If something's off, fix it within that phase — don't proceed on a shaky foundation.

---

## Before you start (you, the human — ~30 min)

1. Create a **Supabase** project at supabase.com → grab the project URL + anon key.
2. Create a **Vercel** account, connect it to your Git host.
3. Put the prototype source into `prototype/` and `CLAUDE.md` at the repo root.
4. Have the Supabase dashboard open — you'll paste SQL and review policies here.

---

## Phase 0 — Scaffold & deploy

```
Read CLAUDE.md. Start Phase 0 only.

Scaffold a Vite + React + TypeScript app at the repo root. Port the
components from /prototype in as-is (Home, Canvas/Board, SceneCard,
store, the three-theme CSS) so the app looks and behaves exactly like
the prototype, still reading from local/mock data — do NOT add Supabase
or any backend yet.

Set up a Vercel deploy. Give me the preview URL and a list of what you
ported. Then stop.
```
**You verify:** the live URL looks and works like the prototype. ✅ before continuing.

---

## Phase 1 — Database & persistence

```
Phase 1. Create the database and move storage to Supabase (single-user
for now; auth comes in Phase 2).

1. Write the SQL schema from spec §05 into supabase/migrations/ —
   profiles, projects, memberships, scenes, elements, options, votes,
   with the unique (option_id, user_id) constraint on votes and sort/x/y
   columns. Give me the SQL to run in the Supabase dashboard.
2. Add a typed Supabase client in src/lib/ and typed query functions
   (load a project tree, create/update/delete scenes, elements, options,
   set votes). Components call these, never Supabase directly.
3. Swap the prototype's local-storage store for these queries. Derive
   vote counts from rows; never store aggregates.

Keep the JSON export working. Show me data persisting across a refresh
and across two different browsers. Then stop.
```
**You verify:** make a change, refresh, open on your phone — it's there. ✅

---

## Phase 2 — Accounts & permissions

```
Phase 2. Add real identity and permissions.

1. Supabase Auth with EMAIL MAGIC-LINK only. A signed-in user gets a
   profiles row (display name + avatar color).
2. Implement the membership model (owner/editor/viewer per spec §07).
   Replace the prototype's "Voting as" picker with the real logged-in
   user. Add invite-by-email (owner only) and a view-only behavior for
   viewers.
3. Write Row-Level Security policies in supabase/policies.sql: default
   deny; access only via memberships; comment every policy. FLAG these
   for my review before I apply them — do not assume they're correct.

Walk me through the policies in plain English. Then stop.
```
**You verify (important):** read the RLS explanation, apply policies, then *try to break it* — sign in as a non-member and confirm you can't see a project. ✅

---

## Phase 3 — Real-time sync (the core goal)

```
Phase 3. Make boards live.

Subscribe an open project to Supabase Realtime so inserts/updates/deletes
to its scenes, elements, options, and votes appear on every connected
client within ~1s. Put subscriptions in hooks (e.g. useProjectRealtime)
that clean up on unmount. Use optimistic local updates reconciled by the
realtime echo. Last-edit-wins per field — no merge logic.

Demo it with two browser windows side by side: a vote, a drag, a lock
toggle, an added option all appear in both. Then stop.
```
**You verify:** two windows, side by side — it feels live. This is the milestone. ✅

---

## Phase 4 — Presence & polish

```
Phase 4. Beta-ready polish.

1. Presence: show avatars of who's currently on a board (Supabase
   presence channel). Optionally highlight the card someone's editing.
2. A JSON importer that reads the prototype's .scenebuilder.json export
   and writes it into the database (so old boards migrate in).
3. Harden edge cases: empty projects, deleted-while-viewing, reconnect
   after network drop, the mandatory Plot beat rule, member removal.

Give me a short test checklist I can run with the team. Then stop.
```
**You verify:** run the checklist with one teammate on a shared board. ✅

---

## Phase 5 — Optional, later

Only if simultaneous typing in the *same* text field becomes a real pain point:

```
Add Yjs-based collaborative editing to [specific text surfaces only],
with live cursors. Leave everything else on the existing last-edit-wins
model. Justify any new dependencies.
```

---

## Ongoing house rules for Claude Code

- One phase at a time; stop for review at each checkpoint.
- Anything touching auth keys, RLS, billing, or production deploy → flag for human review, don't assume.
- Record non-obvious calls in `DECISIONS.md`.
- Keep it boring and maintainable — one person owns this after handoff.
