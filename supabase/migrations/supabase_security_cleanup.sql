-- ═══════════════════════════════════════════════════════════════════════
-- NARRATIX LAB — SUPABASE SECURITY ADVISOR REMEDIATION
-- File: supabase_security_cleanup.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Drop the temporary metadata inspection function (removes associated warnings)
DROP FUNCTION IF EXISTS public.inspect_db_metadata();

-- 2. Revoke execute privileges from PUBLIC role on the handle_new_user trigger function
-- (Only postgres and service_role should be able to execute it)
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres;

-- 3. Hide public.profiles and public.analyses from pg_graphql schema
-- (Resolves GraphQL visibility warnings for public and signed-in users)
COMMENT ON TABLE public.profiles IS '@graphql({"expose": false})';
COMMENT ON TABLE public.analyses IS '@graphql({"expose": false})';

COMMIT;
