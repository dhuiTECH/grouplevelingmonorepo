-- User pets: store captured pets for the mobile app (insert when attemptCapture returns true).
CREATE TABLE IF NOT EXISTS public.user_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  pet_id UUID REFERENCES public.encounter_pool(id),
  nickname TEXT,
  level INT DEFAULT 1,
  captured_at TIMESTAMPTZ DEFAULT now()
);
