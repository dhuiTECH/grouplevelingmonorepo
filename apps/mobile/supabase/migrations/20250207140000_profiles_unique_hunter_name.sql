-- Prevent duplicate hunter names across profiles.
-- If existing data has duplicates, fix them first or this migration will fail.

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_hunter_name_key UNIQUE (hunter_name);
