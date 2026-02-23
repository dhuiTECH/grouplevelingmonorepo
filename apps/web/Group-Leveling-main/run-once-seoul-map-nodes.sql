-- Run this ONCE in Supabase SQL Editor to add 10 active nodes on the Seoul map.
-- Requires a map row with name containing "Seoul" (e.g. "Seoul" or "Seoul District").
-- Coordinates use the -25..25 grid. Nodes have interactive modals, dialogue_script, and mock scene/NPC visuals.

INSERT INTO public.world_map_nodes (
  map_id,
  name,
  type,
  x,
  y,
  icon_url,
  interaction_type,
  interaction_data,
  modal_image_url
)
SELECT
  m.id,
  v.name,
  v.type,
  v.x,
  v.y,
  v.icon_url,
  v.interaction_type,
  v.interaction_data,
  v.modal_image_url
FROM (SELECT id FROM public.maps WHERE name ILIKE '%Seoul%' LIMIT 1) m
CROSS JOIN (VALUES
  (
    'Gyeongbokgung Gate',
    'DIALOGUE',
    -15, -10,
    '/temple.png',
    'DIALOGUE',
    '{
      "welcome_text": "The great palace gate stands before you.",
      "dialogue_text": "Welcome, traveler. The palace grounds are ahead.",
      "dialogue_script": [
        {"npc_name": "Palace Guard", "text": "Halt! State your business at Gyeongbokgung."},
        {"npc_name": "Palace Guard", "text": "Those with pure intentions may pass. Enjoy the royal gardens."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/1a1a2e/eee?text=Palace+Gate",
        "scene_npc_sprite_url": "/NoobMan.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Enter Palace", "target_event": "OPEN_DIALOGUE"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/1a1a2e/eee?text=Gyeongbokgung+Gate'
  ),
  (
    'Myeongdong Market',
    'CITY',
    5, -5,
    '/shopicon.png',
    'CITY',
    '{
      "welcome_text": "The bustling market is full of vendors and street food.",
      "available_services": ["Inn", "Bank", "Blacksmith"],
      "dialogue_script": [
        {"npc_name": "Market Elder", "text": "Ah, a new face! Myeongdong has the best snacks in Seoul."},
        {"npc_name": "Market Elder", "text": "Rest at the inn, visit the blacksmith, or try the tteokbokki."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/2d1b4e/fff?text=Myeongdong",
        "scene_npc_sprite_url": "/NoobWoman.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Rest at Inn", "target_event": "REST_INN"}, {"label": "Browse Shops", "target_event": "OPEN_SHOP"}]
    }'::jsonb,
    'https://placehold.co/400x300/2d1b4e/fff?text=Myeongdong'
  ),
  (
    'Jongmyo Shrine',
    'DIALOGUE',
    -20, 10,
    '/temple.png',
    'DIALOGUE',
    '{
      "welcome_text": "A sacred shrine dedicated to the royal ancestors.",
      "dialogue_script": [
        {"npc_name": "Shrine Keeper", "text": "This is a place of silence and remembrance."},
        {"npc_name": "Shrine Keeper", "text": "Pay your respects, then go in peace. No battles here."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/0f3460/eee?text=Jongmyo",
        "scene_npc_sprite_url": "/Noobnonbinary.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Pay Respects", "target_event": "OPEN_DIALOGUE"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/0f3460/eee?text=Jongmyo'
  ),
  (
    'Namsan Tower',
    'DIALOGUE',
    15, 0,
    '/gates.png',
    'DIALOGUE',
    '{
      "welcome_text": "The iconic tower overlooks the city.",
      "dialogue_script": [
        {"npc_name": "Tour Guide", "text": "From here you can see all of Seoul. Lock your wishes on the fence below!"},
        {"npc_name": "Tour Guide", "text": "Come back at night for the light show. Safe travels, hunter."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/16213e/fff?text=Namsan+Tower",
        "scene_npc_sprite_url": "/NoobMan.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Enjoy View", "target_event": "OPEN_DIALOGUE"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/16213e/fff?text=Namsan+Tower'
  ),
  (
    'Bukchon Hanok Village',
    'CITY',
    -5, 15,
    '/temple.png',
    'CITY',
    '{
      "welcome_text": "Traditional hanok houses line the narrow streets.",
      "available_services": ["Inn"],
      "dialogue_script": [
        {"npc_name": "Village Elder", "text": "Welcome to Bukchon. We keep the old ways here."},
        {"npc_name": "Village Elder", "text": "Rest at our inn and explore the tea houses. No rush."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/1a1a2e/eee?text=Bukchon",
        "scene_npc_sprite_url": "/NoobWoman.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Rest", "target_event": "REST_INN"}, {"label": "Explore", "target_event": "OPEN_DIALOGUE"}]
    }'::jsonb,
    'https://placehold.co/400x300/1a1a2e/eee?text=Bukchon'
  ),
  (
    'Dongdaemun Night Market',
    'SHOP',
    18, -15,
    '/shopicon.png',
    'SHOP',
    '{
      "welcome_text": "Open late—fashion, snacks, and rare finds.",
      "dialogue_script": [
        {"npc_name": "Vendor", "text": "Dongdaemun never sleeps! What are you looking for today?"},
        {"npc_name": "Vendor", "text": "We have gear, potions, and curios. Take a look."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/2d1b4e/fff?text=Dongdaemun",
        "scene_npc_sprite_url": "/NoobMan.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Open Shop", "target_event": "OPEN_SHOP"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/2d1b4e/fff?text=Dongdaemun'
  ),
  (
    'Cheonggyecheon Stream',
    'DIALOGUE',
    0, 0,
    '/exclamation.png',
    'DIALOGUE',
    '{
      "welcome_text": "A peaceful stream runs through the city.",
      "dialogue_script": [
        {"npc_name": "Local Walker", "text": "This stream was restored not long ago. Now it''s our escape from the noise."},
        {"npc_name": "Local Walker", "text": "Follow it north or south. You might find hidden encounters."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/0f3460/eee?text=Cheonggyecheon",
        "scene_npc_sprite_url": "/Noobnonbinary.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Listen", "target_event": "OPEN_DIALOGUE"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/0f3460/eee?text=Cheonggyecheon'
  ),
  (
    'Gwangjang Food Alley',
    'CITY',
    -18, -18,
    '/shopicon.png',
    'CITY',
    '{
      "welcome_text": "The smell of bindaetteok and mayak gimbap fills the air.",
      "available_services": ["Inn"],
      "dialogue_script": [
        {"npc_name": "Food Stall Auntie", "text": "Hungry? Sit down! I''ll get you something that''ll restore your spirit."},
        {"npc_name": "Food Stall Auntie", "text": "Eat first, fight later. That''s the Gwangjang way."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/1a1a2e/fff?text=Gwangjang",
        "scene_npc_sprite_url": "/NoobWoman.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Eat & Rest", "target_event": "REST_INN"}, {"label": "Browse", "target_event": "OPEN_DIALOGUE"}]
    }'::jsonb,
    'https://placehold.co/400x300/1a1a2e/fff?text=Gwangjang'
  ),
  (
    'Insadong Teahouse',
    'DIALOGUE',
    8, 12,
    '/temple.png',
    'DIALOGUE',
    '{
      "welcome_text": "A quiet teahouse known for antiques and art.",
      "dialogue_script": [
        {"npc_name": "Teahouse Master", "text": "Come in. Tea and wisdom are both served here."},
        {"npc_name": "Teahouse Master", "text": "Rest your feet. I''ve heard rumors of a dungeon east of the river."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/16213e/eee?text=Insadong",
        "scene_npc_sprite_url": "/NoobMan.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Have Tea", "target_event": "OPEN_DIALOGUE"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/16213e/eee?text=Insadong'
  ),
  (
    'Han River Park',
    'DIALOGUE',
    22, 8,
    '/gates.png',
    'DIALOGUE',
    '{
      "welcome_text": "The Han River stretches into the distance. Perfect for a breather.",
      "dialogue_script": [
        {"npc_name": "Cyclist", "text": "Nice day for a walk, right? The river path goes on forever."},
        {"npc_name": "Cyclist", "text": "If you''re hunting, I heard there are rare spawns near the bridges at dusk."}
      ],
      "scene": {
        "scene_background_url": "https://placehold.co/800x600/0f3460/fff?text=Han+River",
        "scene_npc_sprite_url": "/Noobnonbinary.png",
        "npc_is_spritesheet": false,
        "npc_frame_count": 4,
        "npc_frame_size": 64
      },
      "action_buttons": [{"label": "Rest", "target_event": "REST_INN"}, {"label": "Leave", "target_event": "NONE"}]
    }'::jsonb,
    'https://placehold.co/400x300/0f3460/fff?text=Han+River'
  )
) AS v(name, type, x, y, icon_url, interaction_type, interaction_data, modal_image_url);

-- Optional: show how many nodes were added (run separately if you want to verify)
-- SELECT COUNT(*) FROM world_map_nodes n JOIN maps m ON n.map_id = m.id WHERE m.name ILIKE '%Seoul%';
