-- ═══════════════════════════════════════════════════════════════
-- NARRATIX LAB — Google OAuth, Profile RLS, and Analyses Schema Migration Fix
-- Run this in your Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure the profiles table has the avatar_url column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Ensure the analyses table has all required columns to prevent 500/save errors on "+ New Analysis"
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS video_name TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS video_length TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS concern TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS overall_score DECIMAL(3,1);
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS overall_verdict TEXT;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS results JSONB;
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Migrate legacy 'result' column data to 'results' JSONB if necessary
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'analyses' AND column_name = 'result'
  ) THEN
    UPDATE public.analyses SET results = result WHERE results IS NULL;
  END IF;
END $$;

-- 3. Drop the existing trigger to prevent conflicts during update
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Recreate the handle_new_user trigger function with robust, null-safe Google metadata extraction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

  -- Insert profile, resolving conflicts gracefully (e.g. if linking identities)
  INSERT INTO public.profiles (id, full_name, email, plan, usage_count, avatar_url, updated_at)
  VALUES (
    NEW.id,
    name,
    COALESCE(NEW.email, ''),
    'free',
    0,
    avatar,
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- 5. Re-create the trigger on auth.users (runs after INSERT)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant proper privileges to all roles (fixes 42501 permission issues)
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.analyses TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 7. Enforce and clean RLS policies on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
