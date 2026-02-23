import { NextResponse } from 'next/server'

export async function GET() {
  // Disable in production to avoid information disclosure
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
    supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    gemini_key: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    node_env: process.env.NODE_ENV
  })
}