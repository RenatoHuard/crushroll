-- Migrate existing single-date data from crushes into crush_dates
INSERT INTO public.crush_dates (
  id, crush_id, user_id,
  location, date_rating,
  had_chat, had_chat_rating,
  had_kiss, had_kiss_rating,
  had_pirulito, had_pirulito_rating,
  had_donut, had_donut_rating,
  had_fire, had_fire_rating,
  created_at
)
SELECT
  gen_random_uuid(),
  id,
  user_id,
  date_location,
  date_rating,
  had_chat, had_chat_rating,
  had_kiss, had_kiss_rating,
  had_pirulito, had_pirulito_rating,
  had_donut, had_donut_rating,
  had_fire, had_fire_rating,
  created_at
FROM public.crushes
WHERE went_out = true;

-- Drop all legacy date columns from crushes
ALTER TABLE public.crushes
  DROP COLUMN IF EXISTS went_out,
  DROP COLUMN IF EXISTS date_rating,
  DROP COLUMN IF EXISTS date_location,
  DROP COLUMN IF EXISTS had_chat,
  DROP COLUMN IF EXISTS had_chat_rating,
  DROP COLUMN IF EXISTS had_kiss,
  DROP COLUMN IF EXISTS had_kiss_rating,
  DROP COLUMN IF EXISTS had_pirulito,
  DROP COLUMN IF EXISTS had_pirulito_rating,
  DROP COLUMN IF EXISTS had_donut,
  DROP COLUMN IF EXISTS had_donut_rating,
  DROP COLUMN IF EXISTS had_fire,
  DROP COLUMN IF EXISTS had_fire_rating;
