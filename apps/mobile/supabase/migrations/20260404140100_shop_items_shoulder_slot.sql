-- Add shoulder equipment slot; keep existing slot values so current rows stay valid.
ALTER TABLE public.shop_items DROP CONSTRAINT IF EXISTS shop_items_slot_check;

ALTER TABLE public.shop_items ADD CONSTRAINT shop_items_slot_check CHECK (
  slot IN (
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
    'other',
    'jewelry',
    'charms',
    'scarves',
    'earrings',
    'hand_grip',
    'shoulder',
    'fullbody',
    'skin',
    'character',
    'pet',
    'consumable',
    'misc'
  )
);
