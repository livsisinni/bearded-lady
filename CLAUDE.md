# CLAUDE.md — Scene Builder

> Project rules and conventions for Claude Code. Read this fully before writing code.

## What this is

Scene Builder is a collaborative scene-mapping tool for **Bearded Lady Productions** (a film/writers'-room studio). Teams map out scenes on a freely-arranged board. Within each scene, every element is either **Locked** (a decided value) or **Open** (it forks into competing **option cards** the team votes on). The goal of this project is to turn the existing single-player browser prototype into a **real, multi-user, real-time web app**.

The prototype (React components + CSS, in `/prototype`) is the product spec made concrete — match its UI, interactions, and data shape. Do not redesign it. The accompanying architecture doc (`Scene Builder — Realtime Spec`) is the source of truth for the plan.

## Locked decisions (do not relitigate)

| Decision | Choice |
|---|---|
| **Auth** | Email **magic-link only** (Supabase Auth). No passwords, no social login yet. |
| **Roles** | `owner` / `editor` / `viewer`. Owner manages members + deletes; editor edits + votes; viewer reads + votes. |
| **Conflict model** | **Last-edit-wins per field.** No CRDT/Yjs. Do not add real-time co-editing of text. |
| **Hosting** | **Vercel** (static frontend) + **Supabase** (backend). |
| **Ownership** | A single human owner maintains this after handoff — favor clarity and low-maintenance choices over cleverness. |

## Stack

- **Frontend:** Vite + React + **TypeScript**. Function components + hooks only.
- **Backend:** Supabase (Postgres + Auth + Realtime + Row-Level Security).
- **Styling:** port the prototype's CSS variable theming (three directions: daylight / blueprint / editorial). Keep it as plain CSS or CSS modules — do not introduce Tailwind or a component library.
- **State:** React state + Supabase subscriptions. Do not add Redux/Zustand unless a real need appears.

## Data model (see spec §05)

`profiles · projects · memberships · scenes · elements · options · votes`

- `votes` has **one row per (option_id, user_id)** with a `direction` of `up`/`down`, enforced by a unique constraint. This is how "who's in favor" and per-person undo work. Never store aggregate counts — always derive them.
- `elements.type` ∈ Location, Characters, Tone, Plot beat, Dialogue, Wardrobe & props, Camera. A **Plot beat** element is `mandatory` — every scene auto-creates one and it cannot be deleted.
- Keep `sort` columns for scene/element/option ordering; positions for scenes are `x`/`y` floats.

## Security — human-reviewed

**Row-Level Security policies and auth config are the highest-risk surface.** When you write RLS policies or touch auth:
1. Put all policies in `supabase/policies.sql` with a comment explaining each.
2. Explicitly call out in your summary that these need human review before deploy.
3. Default to **deny**; grant access only through `memberships`.
4. Never commit secrets. Keys go in `.env.local` (gitignored) and Vercel/Supabase dashboards.

## Conventions

- TypeScript strict mode on. No `any` without a `// reason:` comment.
- Co-locate Supabase queries in `src/lib/` as typed functions; components don't call Supabase directly.
- Realtime subscriptions live in hooks (`useProjectRealtime`, etc.) and clean up on unmount.
- Optimistic UI for local edits, reconciled by the realtime echo. Keep it simple.
- Keep files under ~300 lines; split components like the prototype does.
- Write a short note in `DECISIONS.md` whenever you make a non-obvious call.

## Workflow

Build **one phase at a time** (see `build-prompts.md`). After each phase: deploy the preview, confirm it works, and stop for review before starting the next. Do not jump ahead.

## Repo shape

```
scene-builder/
  src/
    components/     # ported from /prototype
    lib/            # supabase client + typed queries
    hooks/          # useAuth, useProject, useProjectRealtime
    pages/          # Home, Canvas
    styles/         # ported theming
  supabase/
    migrations/     # SQL schema (spec §05)
    policies.sql    # RLS (spec §07) — human-reviewed
  prototype/        # the original, for reference (do not ship)
  CLAUDE.md
  DECISIONS.md
  build-prompts.md
```
