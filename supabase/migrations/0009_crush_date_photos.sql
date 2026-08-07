ALTER TABLE public.crush_dates
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
