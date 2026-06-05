-- Callable version of the invite-accept trigger logic.
-- The trigger only fires on profile INSERT, so existing users never see it.
-- This function is called on every sign-in from loadForUser instead.
-- SECURITY DEFINER so it can read invites and write memberships regardless of RLS.

CREATE OR REPLACE FUNCTION public.accept_pending_invites()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN RETURN; END IF;

  INSERT INTO public.memberships (project_id, user_id, role, invited_by)
  SELECT project_id, v_user_id, role, invited_by
  FROM public.invites
  WHERE invited_email = lower(v_email)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  DELETE FROM public.invites WHERE invited_email = lower(v_email);
END;
$$;
