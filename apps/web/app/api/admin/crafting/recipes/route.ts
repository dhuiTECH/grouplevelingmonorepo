import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

interface IngredientPayload {
  material_item_id: string
  quantity_required: number
}

interface OutcomePayload {
  output_item_id: string
  weight: number
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const { data: recipes, error } = await supabaseAdmin
      .from('crafting_recipes')
      .select(
        `
        id,
        recipe_name,
        gold_cost,
        is_active,
        created_at,
        recipe_ingredients ( id, material_item_id, quantity_required ),
        recipe_outcomes ( id, output_item_id, weight )
      `,
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/crafting/recipes]', error)
      return NextResponse.json({ error: error.message || 'Failed to load recipes' }, { status: 500 })
    }

    return NextResponse.json({ recipes: recipes ?? [] })
  } catch (e) {
    console.error('GET /api/admin/crafting/recipes', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    const body = await request.json()
    const recipeName = typeof body.recipeName === 'string' ? body.recipeName.trim() : ''
    const goldCost = Number(body.goldCost)
    const ingredients = body.ingredients as IngredientPayload[] | undefined
    const outcomes = body.outcomes as OutcomePayload[] | undefined

    if (!recipeName) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 })
    }
    if (!Number.isFinite(goldCost) || goldCost < 0) {
      return NextResponse.json({ error: 'Invalid gold cost' }, { status: 400 })
    }
    if (!Array.isArray(ingredients) || ingredients.length < 1) {
      return NextResponse.json({ error: 'At least one ingredient is required' }, { status: 400 })
    }
    if (!Array.isArray(outcomes) || outcomes.length < 1) {
      return NextResponse.json({ error: 'At least one outcome is required' }, { status: 400 })
    }

    for (const row of ingredients) {
      if (!row.material_item_id || !Number.isFinite(Number(row.quantity_required)) || Number(row.quantity_required) < 1) {
        return NextResponse.json({ error: 'Invalid ingredient row' }, { status: 400 })
      }
    }
    for (const row of outcomes) {
      if (!row.output_item_id || !Number.isFinite(Number(row.weight)) || Number(row.weight) < 1) {
        return NextResponse.json({ error: 'Invalid outcome row' }, { status: 400 })
      }
    }

    const p_ingredients = ingredients.map((r) => ({
      material_item_id: r.material_item_id,
      quantity_required: Math.floor(Number(r.quantity_required)),
    }))
    const p_outcomes = outcomes.map((r) => ({
      output_item_id: r.output_item_id,
      weight: Math.floor(Number(r.weight)),
    }))

    const { data, error } = await supabaseAdmin.rpc('admin_create_crafting_recipe', {
      p_recipe_name: recipeName,
      p_gold_cost: Math.floor(goldCost),
      p_ingredients: p_ingredients,
      p_outcomes: p_outcomes,
    })

    if (error) {
      console.error('[admin_create_crafting_recipe]', error)
      return NextResponse.json({ error: error.message || 'Failed to create recipe' }, { status: 500 })
    }

    return NextResponse.json({ recipeId: data })
  } catch (e) {
    console.error('POST /api/admin/crafting/recipes', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
