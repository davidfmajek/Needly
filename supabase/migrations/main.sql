-- Main schema migration (consolidated)
-- Includes core tables, policies, triggers, constraints, and personalization memory.
-- Safe for existing environments (idempotent).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  age INTEGER,
  age_range TEXT,
  gender TEXT,
  dietary_restrictions TEXT[],
  transportation TEXT,
  budget TEXT,
  interests TEXT[],
  other_interests TEXT,
  food_preferences TEXT[],
  weekly_schedule_context TEXT,
  weekly_schedule_grid JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  initial_context TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[],
  ADD COLUMN IF NOT EXISTS transportation TEXT,
  ADD COLUMN IF NOT EXISTS budget TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[],
  ADD COLUMN IF NOT EXISTS other_interests TEXT,
  ADD COLUMN IF NOT EXISTS food_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS weekly_schedule_context TEXT,
  ADD COLUMN IF NOT EXISTS weekly_schedule_grid JSONB,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS initial_context TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.user_profiles
  ALTER COLUMN onboarding_completed SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_user_id_key'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'Users view own profile'
  ) THEN
    CREATE POLICY "Users view own profile"
      ON public.user_profiles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'Users insert own profile'
  ) THEN
    CREATE POLICY "Users insert own profile"
      ON public.user_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'Users update own profile'
  ) THEN
    CREATE POLICY "Users update own profile"
      ON public.user_profiles
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'Users delete own profile'
  ) THEN
    CREATE POLICY "Users delete own profile"
      ON public.user_profiles
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- saved_places
CREATE TABLE IF NOT EXISTS public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_name TEXT NOT NULL,
  category TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_places
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS place_name TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_places'
      AND policyname = 'Users view own saved'
  ) THEN
    CREATE POLICY "Users view own saved"
      ON public.saved_places
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_places'
      AND policyname = 'Users insert own saved'
  ) THEN
    CREATE POLICY "Users insert own saved"
      ON public.saved_places
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saved_places'
      AND policyname = 'Users delete own saved'
  ) THEN
    CREATE POLICY "Users delete own saved"
      ON public.saved_places
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- De-dupe existing rows and enforce one saved row per user/place.
DELETE FROM public.saved_places a
USING public.saved_places b
WHERE a.user_id = b.user_id
  AND a.place_name = b.place_name
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS saved_places_user_id_place_name_idx
  ON public.saved_places (user_id, place_name);

-- user_calendar_connections
CREATE TABLE IF NOT EXISTS public.user_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_calendar_connections
  ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_calendar_connections_user_id_key'
      AND conrelid = 'public.user_calendar_connections'::regclass
  ) THEN
    ALTER TABLE public.user_calendar_connections
      ADD CONSTRAINT user_calendar_connections_user_id_key UNIQUE (user_id);
  END IF;
END $$;

ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_calendar_connections'
      AND policyname = 'Users view own calendar connections'
  ) THEN
    CREATE POLICY "Users view own calendar connections"
      ON public.user_calendar_connections
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_calendar_connections'
      AND policyname = 'Users insert own calendar connections'
  ) THEN
    CREATE POLICY "Users insert own calendar connections"
      ON public.user_calendar_connections
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_calendar_connections'
      AND policyname = 'Users update own calendar connections'
  ) THEN
    CREATE POLICY "Users update own calendar connections"
      ON public.user_calendar_connections
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_calendar_connections'
      AND policyname = 'Users delete own calendar connections'
  ) THEN
    CREATE POLICY "Users delete own calendar connections"
      ON public.user_calendar_connections
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_user_calendar_connections_updated_at ON public.user_calendar_connections;
CREATE TRIGGER update_user_calendar_connections_updated_at
BEFORE UPDATE ON public.user_calendar_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- personalization memory
CREATE TABLE IF NOT EXISTS public.user_recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  place_id text,
  place_name text,
  intent text,
  category text,
  latitude double precision,
  longitude double precision,
  zone_label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_recommendation_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_recommendation_events'
      AND policyname = 'Users view own recommendation events'
  ) THEN
    CREATE POLICY "Users view own recommendation events"
      ON public.user_recommendation_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_recommendation_events'
      AND policyname = 'Users insert own recommendation events'
  ) THEN
    CREATE POLICY "Users insert own recommendation events"
      ON public.user_recommendation_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_recommendation_events_user_time_idx
  ON public.user_recommendation_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_recommendation_events_place_idx
  ON public.user_recommendation_events (user_id, place_id, place_name);

DROP MATERIALIZED VIEW IF EXISTS public.user_place_affinities;
CREATE MATERIALIZED VIEW public.user_place_affinities AS
SELECT
  e.user_id,
  e.place_id,
  COALESCE(NULLIF(e.place_name, ''), '(unknown)') AS place_name,
  MAX(e.category) AS category,
  MAX(e.intent) AS last_intent,
  MAX(e.zone_label) AS last_zone_label,
  COUNT(*) AS total_events,
  MAX(e.created_at) AS last_interacted_at,
  SUM(
    CASE e.event_type
      WHEN 'open_directions' THEN 5
      WHEN 'save' THEN 4
      WHEN 'unsave' THEN -2
      WHEN 'result_click' THEN 2
      WHEN 'result_impression' THEN 1
      ELSE 0.5
    END
    * EXP(-GREATEST(0, EXTRACT(EPOCH FROM (now() - e.created_at)) / 86400.0) / 45.0)
  )::double precision AS affinity_score
FROM public.user_recommendation_events e
WHERE e.place_id IS NOT NULL OR e.place_name IS NOT NULL
GROUP BY e.user_id, e.place_id, COALESCE(NULLIF(e.place_name, ''), '(unknown)');

CREATE UNIQUE INDEX IF NOT EXISTS user_place_affinities_user_place_uidx
  ON public.user_place_affinities (user_id, place_id, place_name);

DROP MATERIALIZED VIEW IF EXISTS public.user_zone_affinities;
CREATE MATERIALIZED VIEW public.user_zone_affinities AS
SELECT
  e.user_id,
  e.zone_label,
  COUNT(*) AS total_events,
  MAX(e.created_at) AS last_interacted_at,
  SUM(
    CASE e.event_type
      WHEN 'open_directions' THEN 4
      WHEN 'save' THEN 3
      WHEN 'result_click' THEN 2
      ELSE 1
    END
  )::double precision AS zone_score
FROM public.user_recommendation_events e
WHERE e.zone_label IS NOT NULL AND btrim(e.zone_label) <> ''
GROUP BY e.user_id, e.zone_label;

CREATE UNIQUE INDEX IF NOT EXISTS user_zone_affinities_user_zone_uidx
  ON public.user_zone_affinities (user_id, zone_label);

CREATE OR REPLACE FUNCTION public.refresh_user_personalization_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.user_place_affinities;
  REFRESH MATERIALIZED VIEW public.user_zone_affinities;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'refresh_user_personalization_views_daily'
    ) THEN
      PERFORM cron.schedule(
        'refresh_user_personalization_views_daily',
        '15 3 * * *',
        'SELECT public.refresh_user_personalization_views();'
      );
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;