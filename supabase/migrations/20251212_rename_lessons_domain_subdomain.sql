DO $$
BEGIN
  -- Rename lessons.domain -> lessons.phase
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lessons'
      AND column_name = 'domain'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lessons'
      AND column_name = 'phase'
  ) THEN
    ALTER TABLE public.lessons RENAME COLUMN domain TO phase;
  END IF;

  -- Rename lessons.subdomain -> lessons.domain
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lessons'
      AND column_name = 'subdomain'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lessons'
      AND column_name = 'domain'
  ) THEN
    ALTER TABLE public.lessons RENAME COLUMN subdomain TO domain;
  END IF;
END $$;
