-- Enable Supabase Realtime for the four tables that need live sync.
-- The supabase_realtime publication is created automatically by Supabase but
-- tables must be explicitly added. This DO block is idempotent.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['scenes', 'elements', 'options', 'votes'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
