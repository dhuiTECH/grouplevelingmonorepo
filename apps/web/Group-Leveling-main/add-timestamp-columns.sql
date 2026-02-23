-- Add created_at column to skills table if it doesn't exist
ALTER TABLE public.skills
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Add created_at column to encounter_pool table if it doesn't exist
ALTER TABLE public.encounter_pool
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Add created_at column to pet_species table if it exists (it might be a view or table, but just in case)
-- Note: pet_species is often just encounter_pool filtered, but if it's a separate table:
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pet_species') THEN
        ALTER TABLE public.pet_species
        ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
    END IF;
END $$;
