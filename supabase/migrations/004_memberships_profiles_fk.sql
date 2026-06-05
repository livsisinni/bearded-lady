-- memberships.user_id currently only references auth.users, so PostgREST
-- cannot resolve the implicit join to profiles used in dbGetMemberships.
-- This migration adds the direct FK that PostgREST needs.

-- 1. Backfill profiles for any members who somehow have no profile row yet,
--    so the FK constraint below can be applied without a violation error.
INSERT INTO public.profiles (id, email, name, avatar_color)
SELECT DISTINCT
  m.user_id,
  coalesce(u.email, ''),
  coalesce(split_part(u.email, '@', 1), ''),
  'oklch(0.62 0.13 250)'
FROM public.memberships m
JOIN auth.users u ON u.id = m.user_id
LEFT JOIN public.profiles p ON p.id = m.user_id
WHERE p.id IS NULL;

-- 2. Add FK from memberships.user_id → profiles.id.
--    The existing FK to auth.users is kept (cascade-on-user-delete still works).
--    PostgREST will now resolve .select('profiles(...)') from memberships correctly.
ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
