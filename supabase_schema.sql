-- ══════════════════════════════════════════════════════
-- Narratix Lab — Full Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ══════════════════════════════════════════════════════

-- 1. Profiles Table (extends auth.users with app-specific data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  usage_count INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Analyses Table (stores results of each video analysis)
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT,
  video_name TEXT,
  niche TEXT,
  platform TEXT,
  video_length TEXT,
  goal TEXT,
  concern TEXT,
  overall_score DECIMAL(3,1),
  overall_verdict TEXT,
  results JSONB,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- 4. Policies — Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Policies — Analyses
CREATE POLICY "Users can view own analyses" ON public.analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON public.analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON public.analyses
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Auto-create profile on signup (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, plan, usage_count)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    'free',
    0
  );
  RETURN NEW;
END;
$$;

-- 7. Trigger: runs handle_new_user() after each signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Beta usage enforcement
-- Atomically checks the authenticated user's plan and consumes one analysis.
-- Free users are limited to 3 analyses per rolling monthly reset window.
CREATE OR REPLACE FUNCTION public.consume_beta_analysis_usage()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_profile public.profiles%ROWTYPE;
  reset_at TIMESTAMP WITH TIME ZONE;
  next_count INTEGER;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'usage_count', 0,
      'message', 'Please sign in first.'
    );
  END IF;

  SELECT *
  INTO current_profile
  FROM public.profiles
  WHERE id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, plan, usage_count, usage_reset_at, updated_at)
    VALUES (current_user_id, 'free', 0, timezone('utc'::text, now()), timezone('utc'::text, now()))
    RETURNING * INTO current_profile;
  END IF;

  reset_at := COALESCE(current_profile.usage_reset_at, timezone('utc'::text, now()));

  IF reset_at <= timezone('utc'::text, now()) - INTERVAL '1 month' THEN
    current_profile.usage_count := 0;
    reset_at := timezone('utc'::text, now());
  END IF;

  IF current_profile.plan = 'free' AND current_profile.usage_count >= 3 THEN
    UPDATE public.profiles
    SET usage_count = current_profile.usage_count,
        usage_reset_at = reset_at,
        updated_at = timezone('utc'::text, now())
    WHERE id = current_user_id;

    RETURN jsonb_build_object(
      'allowed', false,
      'usage_count', current_profile.usage_count,
      'message', 'Free beta limit reached. Upgrade to Pro for unlimited analyses.'
    );
  END IF;

  next_count := current_profile.usage_count + 1;

  UPDATE public.profiles
  SET usage_count = next_count,
      usage_reset_at = reset_at,
      updated_at = timezone('utc'::text, now())
  WHERE id = current_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'usage_count', next_count,
    'message', 'Usage consumed.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_beta_analysis_usage() TO authenticated;

-- 9. Table and Sequence Grants (Prevents 42501 Permission Denied errors)
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.analyses TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
