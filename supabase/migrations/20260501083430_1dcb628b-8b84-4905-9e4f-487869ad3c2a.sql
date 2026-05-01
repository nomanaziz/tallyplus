ALTER TABLE public.training_videos
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'shopkeeper';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_videos_audience_check'
  ) THEN
    ALTER TABLE public.training_videos
      ADD CONSTRAINT training_videos_audience_check
      CHECK (audience IN ('shopkeeper','consumer','both'));
  END IF;
END $$;