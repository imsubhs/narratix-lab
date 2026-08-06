-- Narratix Lab Security Remediation Sprint V1
-- Target: block profile privilege escalation, secure Stripe-only plan updates,
-- add API rate-limit storage, and make webhook processing idempotent.

BEGIN;

-- ─────────────────────────────────────────────────────
-- Profiles: protected billing/account fields
-- ─────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'team'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_status_check
  CHECK (billing_status IN ('inactive', 'active', 'past_due', 'cancelled', 'trialing', 'unpaid'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('inactive', 'active', 'trialing', 'past_due', 'cancelled', 'unpaid', 'incomplete', 'incomplete_expired'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

UPDATE public.profiles
SET display_name = COALESCE(display_name, full_name)
WHERE display_name IS NULL;

-- Authenticated users may never mutate billing/privilege fields directly.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allow_system_update BOOLEAN;
BEGIN
  allow_system_update := COALESCE(
    current_setting('app.allow_profile_system_update', true),
    'false'
  ) = 'true';

  IF TG_OP = 'INSERT' THEN
    IF auth.role() = 'authenticated' AND NOT allow_system_update THEN
      NEW.plan := 'free';
      NEW.billing_status := 'inactive';
      NEW.subscription_status := 'inactive';
      NEW.usage_count := 0;
      NEW.credits := 0;
      NEW.role := 'user';
      NEW.stripe_customer_id := NULL;
      NEW.stripe_subscription_id := NULL;
      NEW.stripe_current_period_end := NULL;
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF auth.role() = 'authenticated' AND NOT allow_system_update THEN
      IF
        NEW.id IS DISTINCT FROM OLD.id OR
        NEW.email IS DISTINCT FROM OLD.email OR
        NEW.plan IS DISTINCT FROM OLD.plan OR
        NEW.billing_status IS DISTINCT FROM OLD.billing_status OR
        NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
        NEW.usage_count IS DISTINCT FROM OLD.usage_count OR
        NEW.usage_reset_at IS DISTINCT FROM OLD.usage_reset_at OR
        NEW.credits IS DISTINCT FROM OLD.credits OR
        NEW.role IS DISTINCT FROM OLD.role OR
        NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
        NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id OR
        NEW.stripe_current_period_end IS DISTINCT FROM OLD.stripe_current_period_end
      THEN
        RAISE EXCEPTION 'protected_profile_fields_are_read_only'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- RLS policies: users can read their profile and only update their own row.
-- The trigger above provides column-level protection; grants below narrow the normal path.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update safe profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own safe profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update safe profile fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own safe profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- ─────────────────────────────────────────────────────
-- Signup trigger: safe defaults only
-- ─────────────────────────────────────────────────────
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
  avatar := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture',
    NULL
  );

  name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    ''
  );

  PERFORM set_config('app.allow_profile_system_update', 'true', true);

  INSERT INTO public.profiles (
    id,
    full_name,
    display_name,
    email,
    plan,
    billing_status,
    subscription_status,
    usage_count,
    credits,
    role,
    avatar_url,
    updated_at
  )
  VALUES (
    NEW.id,
    name,
    name,
    COALESCE(NEW.email, ''),
    'free',
    'inactive',
    'inactive',
    0,
    0,
    'user',
    avatar,
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    email = EXCLUDED.email,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────
-- Stripe-only plan update flow
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_stripe_event_once(
  p_event_id TEXT,
  p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.processed_stripe_events (event_id, event_type)
  VALUES (p_event_id, p_event_type)
  ON CONFLICT (event_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_update(
  p_user_id UUID,
  p_plan TEXT,
  p_subscription_status TEXT,
  p_billing_status TEXT,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'missing_user_id' USING ERRCODE = '22023';
  END IF;

  IF p_plan NOT IN ('free', 'pro', 'team') THEN
    RAISE EXCEPTION 'invalid_plan' USING ERRCODE = '22023';
  END IF;

  IF p_subscription_status NOT IN ('inactive', 'active', 'trialing', 'past_due', 'cancelled', 'unpaid', 'incomplete', 'incomplete_expired') THEN
    RAISE EXCEPTION 'invalid_subscription_status' USING ERRCODE = '22023';
  END IF;

  IF p_billing_status NOT IN ('inactive', 'active', 'past_due', 'cancelled', 'trialing', 'unpaid') THEN
    RAISE EXCEPTION 'invalid_billing_status' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.allow_profile_system_update', 'true', true);

  UPDATE public.profiles
  SET
    plan = p_plan,
    subscription_status = p_subscription_status,
    billing_status = p_billing_status,
    stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    stripe_current_period_end = COALESCE(p_current_period_end, stripe_current_period_end),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stripe_event_once(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_stripe_subscription_update(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_event_once(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_update(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO service_role;

-- ─────────────────────────────────────────────────────
-- Rate limits
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  identity_key TEXT NOT NULL,
  action TEXT NOT NULL,
  window_seconds INTEGER NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  violation_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (identity_key, action, window_seconds)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_consume_rate_limit(
  p_identity_key TEXT,
  p_action TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER,
  p_cooldown_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing public.api_rate_limits%ROWTYPE;
  now_utc TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now());
  new_window_start TIMESTAMP WITH TIME ZONE;
  next_count INTEGER;
  next_violation_count INTEGER;
  next_blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  IF p_identity_key IS NULL OR p_identity_key = '' THEN
    RETURN jsonb_build_object('allowed', false, 'message', 'Missing rate-limit identity.');
  END IF;

  SELECT *
  INTO existing
  FROM public.api_rate_limits
  WHERE identity_key = p_identity_key
    AND action = p_action
    AND window_seconds = p_window_seconds
  FOR UPDATE;

  IF FOUND AND existing.blocked_until IS NOT NULL AND existing.blocked_until > now_utc THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Too many requests. Please wait before trying again.',
      'retry_after_seconds', CEIL(EXTRACT(EPOCH FROM (existing.blocked_until - now_utc)))
    );
  END IF;

  IF NOT FOUND OR existing.window_start <= now_utc - make_interval(secs => p_window_seconds) THEN
    new_window_start := now_utc;
    next_count := 1;
    INSERT INTO public.api_rate_limits (
      identity_key,
      action,
      window_seconds,
      window_start,
      count,
      violation_count,
      blocked_until,
      updated_at
    )
    VALUES (
      p_identity_key,
      p_action,
      p_window_seconds,
      new_window_start,
      next_count,
      COALESCE(existing.violation_count, 0),
      NULL,
      now_utc
    )
    ON CONFLICT (identity_key, action, window_seconds)
    DO UPDATE SET
      window_start = EXCLUDED.window_start,
      count = EXCLUDED.count,
      blocked_until = NULL,
      updated_at = EXCLUDED.updated_at;

    RETURN jsonb_build_object(
      'allowed', true,
      'count', next_count,
      'remaining', p_max_requests - next_count
    );
  END IF;

  next_count := existing.count + 1;

  IF next_count > p_max_requests THEN
    next_violation_count := existing.violation_count + 1;
    next_blocked_until := now_utc + make_interval(secs => (p_cooldown_seconds * LEAST(next_violation_count, 5)));

    UPDATE public.api_rate_limits
    SET
      count = next_count,
      violation_count = next_violation_count,
      blocked_until = next_blocked_until,
      updated_at = now_utc
    WHERE identity_key = p_identity_key
      AND action = p_action
      AND window_seconds = p_window_seconds;

    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Rate limit exceeded. Please wait before trying again.',
      'retry_after_seconds', CEIL(EXTRACT(EPOCH FROM (next_blocked_until - now_utc)))
    );
  END IF;

  UPDATE public.api_rate_limits
  SET count = next_count,
      blocked_until = NULL,
      updated_at = now_utc
  WHERE identity_key = p_identity_key
    AND action = p_action
    AND window_seconds = p_window_seconds;

  RETURN jsonb_build_object(
    'allowed', true,
    'count', next_count,
    'remaining', p_max_requests - next_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

-- Free users remain capped at 3 analyses/month. Pro/team bypass monthly caps
-- but still go through request/min/hour/day rate limits at the API layer.
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
    RETURN jsonb_build_object('allowed', false, 'usage_count', 0, 'message', 'Please sign in first.');
  END IF;

  SELECT *
  INTO current_profile
  FROM public.profiles
  WHERE id = current_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    PERFORM set_config('app.allow_profile_system_update', 'true', true);
    INSERT INTO public.profiles (id, plan, billing_status, subscription_status, usage_count, usage_reset_at, credits, role, updated_at)
    VALUES (current_user_id, 'free', 'inactive', 'inactive', 0, timezone('utc'::text, now()), 0, 'user', timezone('utc'::text, now()))
    RETURNING * INTO current_profile;
  END IF;

  reset_at := COALESCE(current_profile.usage_reset_at, timezone('utc'::text, now()));

  IF reset_at <= timezone('utc'::text, now()) - INTERVAL '1 month' THEN
    current_profile.usage_count := 0;
    reset_at := timezone('utc'::text, now());
  END IF;

  IF current_profile.plan = 'free' AND current_profile.usage_count >= 3 THEN
    PERFORM set_config('app.allow_profile_system_update', 'true', true);
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

  PERFORM set_config('app.allow_profile_system_update', 'true', true);
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

COMMIT;
