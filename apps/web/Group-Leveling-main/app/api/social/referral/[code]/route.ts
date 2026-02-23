import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, hunter_name, avatar, level, current_title, referral_code, active_skin, base_body_url, gender')
      .eq('referral_code', code)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Hunter not found' }, { status: 404 })
    }

    const { data: cosmetics } = await supabaseAdmin
      .from('user_cosmetics')
      .select(`
        id,
        equipped,
        shop_items (
          id,
          name,
          image_url,
          slot,
          z_index,
          is_animated,
          animation_config,
          scale,
          offset_x,
          offset_y
        )
      `)
      .eq('hunter_id', profile.id)
      .eq('equipped', true)

    return NextResponse.json({
      hunter: {
        ...profile,
        name: profile.hunter_name,
        avatar_url: profile.avatar,
        cosmetics: cosmetics || []
      }
    })
  } catch (error) {
    console.error('Referral lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
