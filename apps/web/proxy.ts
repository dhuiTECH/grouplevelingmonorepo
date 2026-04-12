import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  // Simple pass-through proxy for API routes
  // Authentication is handled in individual API routes
  return res
}

// Ensure the proxy runs on your API routes
export const config = {
  matcher: ['/api/:path*'],
}
