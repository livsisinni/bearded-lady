# DECISIONS.md

## Phase 0

### Module splitting
Prototype used global `window` assignments and Babel in-browser. Split into proper ES modules for Vite: constants/seed data in `src/lib/store.ts`, the `useStore` hook in `src/hooks/useStore.ts`, components each in their own file under `src/components/`.

### `SceneElement` type name
The prototype called this type `element`, but that conflicts with the DOM `Element` interface in TypeScript. Named `SceneElement` in `src/lib/types.ts`.

### No client-side router
The app is purely state-driven — home vs. canvas is controlled by `activeId` in the store. No URL-based navigation needed in Phase 0; if deep-linking becomes useful it can be added in a later phase.

### `crypto.randomUUID()`
Used directly without the prototype's `typeof` guard — Vite targets modern browsers where this is always available.

## Phase 2

### `dbCreateProject` splits insert + select
With RLS on projects gated by membership, `.insert().select(FULL_PROJECT_QUERY)` in one shot fails — the `select` fires before the owner membership exists. Fixed by: insert project → insert membership → call `dbLoadProjectTree`.

### Votes stripped on import
Imported JSON carries vote rows with user IDs from the exporting auth context. Those IDs don't exist in the importing instance's `auth.users`, so the FK would reject them. Phase 2 strips votes at import time; users re-vote on the imported board.

### RLS helper functions bypass recursion
Policies on `memberships` can't reference `memberships` directly — it creates infinite recursion. Two `SECURITY DEFINER` functions (`is_member`, `member_role`) execute outside RLS context and are used in all policies that need membership checks.

### `currentUserRole` in AppState
Added so Canvas and its children know the local user's permission level without re-fetching. Populated from `dbGetMemberships` whenever `activeId` changes. Null when no project is open.

### `canEdit` requires explicit role
Changed from `role !== 'viewer'` to `role === 'owner' || role === 'editor'`. The old form would return `true` when role is `null` (not yet loaded or access revoked), incorrectly enabling edit controls. The new form is deny-by-default.

## Phase 4

### Presence via Supabase Presence channel
Each open-project client tracks `{ userId, name, color }` on a `presence:${projectId}` channel. Other users' avatars appear in the toolbar. Deduplication handles multiple tabs from the same account. No server-side storage needed.

### Reconnect refetch for missed events
`useProjectRealtime` tracks whether the channel's first `SUBSCRIBED` event has fired. On every subsequent `SUBSCRIBED` (reconnect after network drop), it calls `dbLoadProjectTree` to replace local state with the ground truth. If the fetch throws (project deleted or membership removed), it clears `activeId` and sends the user home.

### Membership DELETE is best-effort
Supabase Realtime checks RLS when deciding whether to deliver a `postgres_changes` event. A DELETE on the current user's own membership row means `is_member()` immediately returns false, so Supabase may not send the event. The subscription is still registered as a fast path when it does arrive; the reconnect refetch above covers the case when it doesn't.

### Viewer read-only propagation
`canEdit = role !== 'viewer'` flows as a prop: App → Canvas → SceneCard → ElementRow → OptionCard. Editable got a `readOnly` prop (renders a plain `<div>` instead of `contentEditable`). Vote buttons always active — viewers can vote.
