-- Allow all slot values used by the admin shop form (hair, face_eyes, face_mouth, eyes, back, other).
-- Run in Supabase SQL Editor if you get: violates check constraint "shop_items_slot_check"

ALTER TABLE public.shop_items
DROP CONSTRAINT IF EXISTS shop_items_slot_check;

ALTER TABLE public.shop_items
ADD CONSTRAINT shop_items_slot_check CHECK (slot IN (
  'avatar',
  'base_body',
  'face_eyes',
  'face_mouth',
  'hair',
  'face',
  'body',
  'weapon',
  'head',
  'eyes',
  'back',
  'hands',
  'feet',
  'background',
  'accessory',
  'magic effects',
  'other'
));

NOTIFY pgrst, 'reload schema';
