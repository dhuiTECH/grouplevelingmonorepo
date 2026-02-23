-- Control whether a shop item appears in the public shop.
-- Creator-only slots (base body, eyes, mouth, hair) are typically is_sellable = false.
ALTER TABLE public.shop_items
ADD COLUMN IF NOT EXISTS is_sellable boolean DEFAULT true;

COMMENT ON COLUMN public.shop_items.is_sellable IS 'If true, item appears in the public shop; if false, creator/admin only (e.g. avatar parts)';

-- Force PostgREST/Supabase to reload schema cache so the new column is recognized immediately.
NOTIFY pgrst, 'reload schema';
