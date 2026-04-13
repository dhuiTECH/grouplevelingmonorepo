-- Admin: replace ingredients + outcomes for an existing recipe (service_role only)

CREATE OR REPLACE FUNCTION public.admin_update_crafting_recipe(
  p_recipe_id uuid,
  p_recipe_name text,
  p_gold_cost integer,
  p_ingredients jsonb,
  p_outcomes jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_elem jsonb;
  v_mat uuid;
  v_qty int;
  v_out uuid;
  v_w int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crafting_recipes WHERE id = p_recipe_id) THEN
    RAISE EXCEPTION 'recipe_not_found';
  END IF;

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

  UPDATE public.crafting_recipes
  SET recipe_name = v_name, gold_cost = p_gold_cost
  WHERE id = p_recipe_id;

  DELETE FROM public.recipe_ingredients WHERE recipe_id = p_recipe_id;
  DELETE FROM public.recipe_outcomes WHERE recipe_id = p_recipe_id;

  FOR v_elem IN SELECT jsonb_array_elements(p_ingredients)
  LOOP
    v_mat := (v_elem->>'material_item_id')::uuid;
    v_qty := (v_elem->>'quantity_required')::int;
    IF v_mat IS NULL OR v_qty IS NULL OR v_qty < 1 THEN
      RAISE EXCEPTION 'invalid ingredient row';
    END IF;
    INSERT INTO public.recipe_ingredients (recipe_id, material_item_id, quantity_required)
    VALUES (p_recipe_id, v_mat, v_qty);
  END LOOP;

  FOR v_elem IN SELECT jsonb_array_elements(p_outcomes)
  LOOP
    v_out := (v_elem->>'output_item_id')::uuid;
    v_w := (v_elem->>'weight')::int;
    IF v_out IS NULL OR v_w IS NULL OR v_w < 1 THEN
      RAISE EXCEPTION 'invalid outcome row';
    END IF;
    INSERT INTO public.recipe_outcomes (recipe_id, output_item_id, weight)
    VALUES (p_recipe_id, v_out, v_w);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_crafting_recipe(uuid, text, integer, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_crafting_recipe(uuid, text, integer, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_crafting_recipe(uuid, text, integer, jsonb, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
