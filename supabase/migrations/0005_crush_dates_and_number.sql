-- Sequential number per user (stable, based on creation order)
ALTER TABLE public.crushes
  ADD COLUMN IF NOT EXISTS crush_number INTEGER;

-- Backfill existing rows
UPDATE public.crushes c
SET crush_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM public.crushes
) sub
WHERE c.id = sub.id;

-- Trigger to auto-assign on INSERT
CREATE OR REPLACE FUNCTION public.assign_crush_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.crush_number := (
    SELECT COALESCE(MAX(crush_number), 0) + 1
    FROM public.crushes
    WHERE user_id = NEW.user_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_crush_number ON public.crushes;
CREATE TRIGGER set_crush_number
  BEFORE INSERT ON public.crushes
  FOR EACH ROW EXECUTE FUNCTION public.assign_crush_number();

-- Multiple dates per crush
CREATE TABLE IF NOT EXISTS public.crush_dates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crush_id          UUID NOT NULL REFERENCES public.crushes(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location          TEXT,
  date_rating       SMALLINT NOT NULL DEFAULT 0 CHECK (date_rating BETWEEN 0 AND 5),
  had_chat          BOOLEAN NOT NULL DEFAULT FALSE,
  had_chat_rating   SMALLINT NOT NULL DEFAULT 0 CHECK (had_chat_rating BETWEEN 0 AND 5),
  had_kiss          BOOLEAN NOT NULL DEFAULT FALSE,
  had_kiss_rating   SMALLINT NOT NULL DEFAULT 0 CHECK (had_kiss_rating BETWEEN 0 AND 5),
  had_pirulito      BOOLEAN NOT NULL DEFAULT FALSE,
  had_pirulito_rating SMALLINT NOT NULL DEFAULT 0 CHECK (had_pirulito_rating BETWEEN 0 AND 5),
  had_donut         BOOLEAN NOT NULL DEFAULT FALSE,
  had_donut_rating  SMALLINT NOT NULL DEFAULT 0 CHECK (had_donut_rating BETWEEN 0 AND 5),
  had_fire          BOOLEAN NOT NULL DEFAULT FALSE,
  had_fire_rating   SMALLINT NOT NULL DEFAULT 0 CHECK (had_fire_rating BETWEEN 0 AND 5),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crush_dates_crush_id_idx ON public.crush_dates(crush_id);
CREATE INDEX IF NOT EXISTS crush_dates_user_id_idx ON public.crush_dates(user_id);

ALTER TABLE public.crush_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crush_dates_select" ON public.crush_dates;
CREATE POLICY "crush_dates_select" ON public.crush_dates FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "crush_dates_insert" ON public.crush_dates;
CREATE POLICY "crush_dates_insert" ON public.crush_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "crush_dates_update" ON public.crush_dates;
CREATE POLICY "crush_dates_update" ON public.crush_dates FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "crush_dates_delete" ON public.crush_dates;
CREATE POLICY "crush_dates_delete" ON public.crush_dates FOR DELETE USING (auth.uid() = user_id);
