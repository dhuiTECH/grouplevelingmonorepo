import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyAdminAuth } from '@/lib/admin-auth'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_LIMIT = 500
const DEFAULT_LIMIT = 200

function sanitizeIlike(s: string): string {
  return s.replace(/[%_\\]/g, '').trim()
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId')?.trim()
    const qRaw = searchParams.get('q')?.trim()
    const limitRaw = searchParams.get('limit')
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(limitRaw || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    )

    async function loadClaimsForProfile(profile: { id: string; email: string | null; hunter_name: string | null }) {
      const { data: claims, error: claimsError } = await supabaseAdmin!
        .from('loot_claims')
        .select('id, created_at, idempotency_key, source_type, source_id, result')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (claimsError) throw claimsError

      return NextResponse.json({
        profile,
        claims: claims ?? [],
        limit,
      })
    }

    if (userIdParam) {
      if (!UUID_RE.test(userIdParam)) {
        return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 })
      }
      const { data: profile, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, hunter_name')
        .eq('id', userIdParam)
        .maybeSingle()

      if (pErr) throw pErr
      if (!profile) {
        return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })
      }
      return loadClaimsForProfile(profile)
    }

    if (!qRaw) {
      return NextResponse.json({ error: 'missing_q_or_userId' }, { status: 400 })
    }

    if (UUID_RE.test(qRaw)) {
      const { data: profile, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, hunter_name')
        .eq('id', qRaw)
        .maybeSingle()

      if (pErr) throw pErr
      if (profile) {
        return loadClaimsForProfile(profile)
      }
    }

    if (qRaw.includes('@')) {
      const emailTry = qRaw.trim()
      const { data: emailMatches, error: exErr } = await supabaseAdmin
        .from('profiles')
        .select('id, email, hunter_name')
        .ilike('email', emailTry)
        .limit(2)

      if (exErr) throw exErr
      if (emailMatches?.length === 1) {
        return loadClaimsForProfile(emailMatches[0])
      }
    }

    const q = sanitizeIlike(qRaw)
    if (!q) {
      return NextResponse.json({ error: 'empty_search' }, { status: 400 })
    }

    const pat = `%${q}%`
    const { data: profiles, error: listErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, hunter_name')
      .or(`email.ilike.${pat},hunter_name.ilike.${pat}`)
      .limit(25)

    if (listErr) throw listErr

    if (!profiles?.length) {
      return NextResponse.json({ error: 'no_profile_match' }, { status: 404 })
    }

    if (profiles.length > 1) {
      return NextResponse.json({
        needsDisambiguation: true,
        profiles,
      })
    }

    return loadClaimsForProfile(profiles[0])
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load loot claims'
    console.error('[admin/loot/claims GET]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
