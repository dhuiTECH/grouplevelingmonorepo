import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Only return active, sellable items (base body / creator items are is_sellable=false and hidden)
    const { data: shopItems, error } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .or('is_sellable.eq.true,is_sellable.is.null')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ shopItems })
  } catch (error) {
    console.error('Shop items fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (userError || !user?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, image_url, category, layer_order, price, rarity } = body

    const { data, error } = await supabaseAdmin
      .from('shop_items')
      .insert([{
        name,
        description,
        image_url,
        category,
        layer_order: layer_order || 1,
        price,
        rarity: rarity || 'common'
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ shopItem: data })
  } catch (error) {
    console.error('Shop item creation error:', error)
    return NextResponse.json({ error: 'Failed to create shop item' }, { status: 500 })
  }
}

