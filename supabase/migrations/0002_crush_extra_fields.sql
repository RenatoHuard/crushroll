-- Novos campos no crush: foto, interesse, rolê e atividades
ALTER TABLE public.crushes
  ADD COLUMN IF NOT EXISTS photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS interest_rating  SMALLINT NOT NULL DEFAULT 0
    CHECK (interest_rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS went_out         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS date_rating      SMALLINT NOT NULL DEFAULT 0
    CHECK (date_rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS date_location    TEXT,
  ADD COLUMN IF NOT EXISTS had_chat         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS had_kiss         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS had_pirulito     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS had_donut        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS had_fire         BOOLEAN NOT NULL DEFAULT FALSE;

-- Bucket público para fotos dos crushs
INSERT INTO storage.buckets (id, name, public)
VALUES ('crush-photos', 'crush-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS do storage: cada usuário gerencia a própria pasta
DROP POLICY IF EXISTS "crush_photos_insert" ON storage.objects;
CREATE POLICY "crush_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'crush-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "crush_photos_update" ON storage.objects;
CREATE POLICY "crush_photos_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'crush-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "crush_photos_delete" ON storage.objects;
CREATE POLICY "crush_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'crush-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "crush_photos_select" ON storage.objects;
CREATE POLICY "crush_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'crush-photos');
