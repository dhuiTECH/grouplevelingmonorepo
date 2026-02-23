import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

type PositionPayload = { id: string; x_pos: number; y_pos: number }

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. Add them in Replit Secrets / env.' },
        { status: 503 }
      )
    }

    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error ?? 'Unauthorized' },
        { status: auth.status ?? 401 }
      )
    }

    let body: { positions?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const positions = Array.isArray(body.positions) ? body.positions as PositionPayload[] : []

    if (positions.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    let updated = 0
    for (const { id, x_pos, y_pos } of positions) {
      if (!id || typeof x_pos !== 'number' || typeof y_pos !== 'number') continue
      const x = Math.round(Number(x_pos))
      const y = Math.round(Number(y_pos))
      const { error } = await supabaseAdmin
        .from('skills')
        .update({ x_pos: x, y_pos: y })
        .eq('id', id)
      if (!error) updated++
      else {
        console.error('Skill position update error:', id, error)
        return NextResponse.json(
          { error: 'Failed to save positions', details: error.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save positions'
    console.error('Admin skills positions error:', err)
    return NextResponse.json(
      { error: 'Failed to save positions', details: message },
      { status: 500 }
    )
  }
}
