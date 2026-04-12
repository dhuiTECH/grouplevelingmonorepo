-- RNG crafting: recipes, ingredients, weighted outcomes; admin + player RPCs

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.crafting_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_name text NOT NULL,
  gold_cost integer NOT NULL DEFAULT 0 CHECK (gold_cost >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.crafting_recipes(id) ON DELETE CASCADE,
  material_item_id uuid NOT NULL REFERENCES public.shop_items(id),
  quantity_required integer NOT NULL CHECK (quantity_required > 0)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);

CREATE TABLE public.recipe_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.crafting_recipes(id) ON DELETE CASCADE,
  output_item_id uuid NOT NULL REFERENCES public.shop_items(id),
  weight integer NOT NULL CHECK (weight > 0),
  CONSTRAINT recipe_outcomes_recipe_output_unique UNIQUE (recipe_id, output_item_id)
);

CREATE INDEX idx_recipe_outcomes_recipe_id ON public.recipe_outcomes(recipe_id);

-- ---------------------------------------------------------------------------
-- RLS (read-only for authenticated)
-- ---------------------------------------------------------------------------

ALTER TABLE public.crafting_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY crafting_recipes_select_authenticated
  ON public.crafting_recipes FOR SELECT TO authenticated USING (true);

CREATE POLICY recipe_ingredients_select_authenticated
  ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);

CREATE POLICY recipe_outcomes_select_authenticated
  ON public.recipe_outcomes FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.crafting_recipes TO authenticated;
GRANT SELECT ON public.recipe_ingredients TO authenticated;
GRANT SELECT ON public.recipe_outcomes TO authenticated;

-- ---------------------------------------------------------------------------
-- Admin: transactional recipe + ingredients + outcomes (service_role only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_create_crafting_recipe(
  p_recipe_name text,
  p_gold_cost integer,
  p_ingredients jsonb,
  p_outcomes jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipe_id uuid;
  v_name text;
  v_elem jsonb;
  v_mat uuid;
  v_qty int;
  v_out uuid;
  v_w int;
BEGIN
  v_name := trim(both from coalesce(p_recipe_name, ''));
  IF v_name = '' THEN
    RAISE EXCEPTION 'recipe_name required';
  END IF;
  IF p_gold_cost IS NULL OR p_gold_cost < 0 THEN
    RAISE EXCEPTION 'invalid gold_cost';
  END IF;
  IF p_ingredients IS NULL OR jsonb_typeof(p_ingredients) <> 'array' OR jsonb_array_length(p_ingredients) < 1 THEN
    RAISE EXCEPTION 'ingredients required';
  END IF;
  IF p_outcomes IS NULL OR jsonb_typeof(p_outcomes) <> 'array' OR jsonb_array_length(p_outcomes) < 1 THEN
    RAISE EXCEPTION 'outcomes required';
  END IF;

  INSERT INTO public.crafting_recipes (recipe_name, gold_cost, is_active)
  VALUES (v_name, p_gold_cost, true)
  RETURNING id INTO v_recipe_id;

  FOR v_elem IN SELECT jsonb_array_elements(p_ingredients)
  LOOP
    v_mat := (v_elem->>'material_item_id')::uuid;
    v_qty := (v_elem->>'quantity_required')::int;
    IF v_mat IS NULL OR v_qty IS NULL OR v_qty < 1 THEN
      RAISE EXCEPTION 'invalid ingredient row';
    END IF;
    INSERT INTO public.recipe_ingredients (recipe_id, material_item_id, quantity_required)
    VALUES (v_recipe_id, v_mat, v_qty);
  END LOOP;

  FOR v_elem IN SELECT jsonb_array_elements(p_outcomes)
  LOOP
    v_out := (v_elem->>'output_item_id')::uuid;
    v_w := (v_elem->>'weight')::int;
    IF v_out IS NULL OR v_w IS NULL OR v_w < 1 THEN
      RAISE EXCEPTION 'invalid outcome row';
    END IF;
    INSERT INTO public.recipe_outcomes (recipe_id, output_item_id, weight)
    VALUES (v_recipe_id, v_out, v_w);
  END LOOP;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_crafting_recipe(text, integer, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_crafting_recipe(text, integer, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_crafting_recipe(text, integer, jsonb, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- Player: weighted craft (authenticated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.craft_rng_item(
  p_player_id uuid,
  p_recipe_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_rec public.crafting_recipes%ROWTYPE;
  v_gold_cost int;
  v_total_weight bigint;
  v_r double precision;
  v_cumulative bigint;
  v_win uuid;
  o record;
  v_coins bigint;
  mat record;
  v_uc_id uuid;
  v_uc_qty int;
  v_new_qty int;
  v_req int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_player_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_rec
  FROM public.crafting_recipes
  WHERE id = p_recipe_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipe_not_found_or_inactive';
  END IF;

  v_gold_cost := v_rec.gold_cost;

  SELECT coalesce(sum(weight), 0)::bigint INTO v_total_weight
  FROM public.recipe_outcomes
  WHERE recipe_id = p_recipe_id;

  IF v_total_weight <= 0 THEN
    RAISE EXCEPTION 'recipe_has_no_outcomes';
  END IF;

  SELECT coins INTO v_coins
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_coins < v_gold_cost THEN
    RAISE EXCEPTION 'insufficient_coins';
  END IF;

  FOR mat IN
    SELECT material_item_id, sum(quantity_required)::int AS qty_required
    FROM public.recipe_ingredients
    WHERE recipe_id = p_recipe_id
    GROUP BY material_item_id
  LOOP
    SELECT id, quantity INTO v_uc_id, v_uc_qty
    FROM public.user_cosmetics
    WHERE hunter_id = uid AND shop_item_id = mat.material_item_id
    FOR UPDATE;

    IF NOT FOUND OR coalesce(v_uc_qty, 0) < mat.qty_required THEN
      RAISE EXCEPTION 'insufficient_materials';
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET coins = coins - v_gold_cost
  WHERE id = uid AND coins >= v_gold_cost;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_coins';
  END IF;

  FOR mat IN
    SELECT material_item_id, sum(quantity_required)::int AS qty_required
    FROM public.recipe_ingredients
    WHERE recipe_id = p_recipe_id
    GROUP BY material_item_id
  LOOP
    SELECT id, quantity INTO v_uc_id, v_uc_qty
    FROM public.user_cosmetics
    WHERE hunter_id = uid AND shop_item_id = mat.material_item_id
    FOR UPDATE;

    v_req := mat.qty_required;
    IF coalesce(v_uc_qty, 0) < v_req THEN
      RAISE EXCEPTION 'insufficient_materials';
    END IF;

    IF v_uc_qty - v_req > 0 THEN
      UPDATE public.user_cosmetics SET quantity = quantity - v_req WHERE id = v_uc_id;
    ELSE
      DELETE FROM public.user_cosmetics WHERE id = v_uc_id;
    END IF;
  END LOOP;

  v_r := random() * v_total_weight::double precision;
  v_cumulative := 0;
  v_win := NULL;

  FOR o IN
    SELECT output_item_id, weight
    FROM public.recipe_outcomes
    WHERE recipe_id = p_recipe_id
    ORDER BY id
  LOOP
    v_cumulative := v_cumulative + o.weight;
    IF v_r < v_cumulative THEN
      v_win := o.output_item_id;
      EXIT;
    END IF;
  END LOOP;

  IF v_win IS NULL THEN
    RAISE EXCEPTION 'roll_failed';
  END IF;

  SELECT id, quantity INTO v_uc_id, v_uc_qty
  FROM public.user_cosmetics
  WHERE hunter_id = uid AND shop_item_id = v_win
  FOR UPDATE;

  IF FOUND THEN
    v_new_qty := least(999, coalesce(v_uc_qty, 0) + 1);
    UPDATE public.user_cosmetics SET quantity = v_new_qty WHERE id = v_uc_id;
  ELSE
    INSERT INTO public.user_cosmetics (hunter_id, shop_item_id, equipped, quantity)
    VALUES (uid, v_win, false, 1);
  END IF;

  RETURN jsonb_build_object('success', true, 'won_item_id', v_win);
END;
$$;

REVOKE ALL ON FUNCTION public.craft_rng_item(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.craft_rng_item(uuid, uuid) TO authenticated;
