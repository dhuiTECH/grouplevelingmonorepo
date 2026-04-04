-- Unique dungeon names so seed scripts can upsert by name
CREATE UNIQUE INDEX IF NOT EXISTS global_dungeons_name_key ON public.global_dungeons (name);
