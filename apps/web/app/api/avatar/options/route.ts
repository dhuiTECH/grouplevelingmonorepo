import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const CREATOR_SLOTS = ['avatar', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'face', 'body'] as const

function genderStr(val: unknown): string {
  if (typeof val === 'string' && val.trim()) return val.trim()
  if (Array.isArray(val) && val.length) return String(val[0]).trim()
  return ''
}

const RARE_RARITIES = ['rare', 'epic', 'legendary', 'monarch']

export async function GET(request: NextRequest) {
  try {
    const gender = (request.nextUrl.searchParams.get('gender') || 'male').toLowerCase()
    const allGenders = request.nextUrl.searchParams.get('all_genders') === 'true'
    const onboarding = request.nextUrl.searchParams.get('onboarding') === 'true'

    const { data: items, error } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .in('slot', [...CREATOR_SLOTS])
      .order('slot')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Avatar options fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let list = (items || []) as any[]
    if (!allGenders) {
      const matchesGender = (item: any) => {
        const g = genderStr(item.gender).toLowerCase()
        if (gender === 'nonbinary') return g === 'unisex' || g === 'nonbinary' || g === 'non-binary' || !g
        return g === gender || g === 'unisex' || !g
      }
      list = list.filter(matchesGender)
    }

    if (onboarding) {
      list = list.filter((i: any) => {
        const onboardingOk = i.onboarding_available === true
        const rarity = (i.rarity || '').toLowerCase()
        const notRare = !RARE_RARITIES.includes(rarity)
        return onboardingOk && notRare
      })
    }

    const slot = (s: any) => (s || '').toLowerCase()
    const normalizeItemGender = (i: any) => {
      const g = genderStr(i.gender).toLowerCase()
      return { ...i, gender: g }
    }
    const bases = list
      .filter((i: any) => slot(i.slot) === 'avatar' || slot(i.slot) === 'base_body')
      .map(normalizeItemGender)
    const parts = list
      .filter((i: any) => slot(i.slot) !== 'avatar' && slot(i.slot) !== 'base_body')
      .map(normalizeItemGender)

    return NextResponse.json({ bases, parts })
  } catch (err: any) {
    console.error('Avatar options error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to fetch avatar options' }, { status: 500 })
  }
}
