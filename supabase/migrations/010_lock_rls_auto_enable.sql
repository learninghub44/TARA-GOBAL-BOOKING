-- 010: Lock down rls_auto_enable()
--
-- rls_auto_enable() is Supabase's standard event-trigger function for
-- auto-enabling RLS on newly created public tables. It was previously
-- created directly against the live database (SQL editor) rather than
-- through a migration, so this file both brings it under version control
-- and fixes the linter finding: it was exposed to anon/authenticated via
-- PostgREST RPC even though it's only ever meant to run as the event
-- trigger owner when a CREATE TABLE happens — no client should call it
-- directly.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    cmd record;
BEGIN
    FOR cmd IN
        SELECT *
        FROM pg_event_trigger_ddl_commands()
        WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          AND object_type IN ('table', 'partitioned table')
    LOOP
        IF cmd.schema_name IS NOT NULL
           AND cmd.schema_name IN ('public')
           AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
           AND cmd.schema_name NOT LIKE 'pg_toast%'
           AND cmd.schema_name NOT LIKE 'pg_temp%'
        THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', cmd.object_identity);
        ELSE
            RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
        END IF;
    END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
    EXECUTE FUNCTION public.rls_auto_enable();

-- Event triggers fire as their owner regardless of EXECUTE grants, so this
-- doesn't affect the auto-RLS behavior — it only removes the ability for
-- anon/authenticated clients to invoke it directly via RPC.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
