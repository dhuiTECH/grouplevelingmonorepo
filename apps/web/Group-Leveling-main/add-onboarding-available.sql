-- Mark which shop items (Face, Body) are available in the onboarding avatar customization.
-- Only items with onboarding_available = true (and non-rare) appear there.
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS onboarding_available boolean DEFAULT false;

COMMENT ON COLUMN public.shop_items.onboarding_available IS 'If true, this item appears in the onboarding avatar customization screen (Face/Body slots; rare items are excluded there)';

-- Force PostgREST/Supabase to reload schema cache.
NOTIFY pgrst, 'reload schema';
