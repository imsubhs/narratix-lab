-- ═══════════════════════════════════════════════════════════════════════
-- NARRATIX LAB — MINIMAL OAUTH LOGIN HOTFIX
-- File: oauth_login_hotfix.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Add ONLY display_name to public.profiles (only column required by new handle_new_user() that is currently missing)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Set display_name from full_name for existing rows where it is NULL
UPDATE public.profiles
  SET display_name = COALESCE(display_name, full_name)
  WHERE display_name IS NULL;

-- 2. Replace handle_new_user() with a version that references ONLY active, essential schema columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avatar TEXT;
  name TEXT;
BEGIN
  -- Extract Google/OAuth avatar URL
  avatar := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture',
    NULL
  );

  -- Extract full name
  name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  );

  -- Insert profile using only existing + display_name columns
  INSERT INTO public.profiles (
    id,
    full_name,
    display_name,
    email,
    plan,
    usage_count,
    avatar_url,
    updated_at
  )
  VALUES (
    NEW.id,
    name,
    name,
    COALESCE(NEW.email, ''),
    'free',
    0,
    avatar,
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name    = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    email        = EXCLUDED.email,
    avatar_url   = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at   = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
