import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'

export interface AdminAuthResult {
  authorized: boolean
  error?: string
  status?: number
  user?: {
    authId: string
    email: string
    profileId: string
    name: string
    isAdmin: boolean
  }
}

/**
 * Verifies that the current user is authenticated AND is an admin.
 * This checks both Supabase Auth AND the is_admin field in public.users.
 * 
 * Use this in all admin API routes to properly secure them.
 */
export async function verifyAdminAuth(request?: Request | NextRequest): Promise<AdminAuthResult> {
  if (!supabaseAdmin) {
    return {
      authorized: false,
      error: 'Supabase admin client not configured',
      status: 500
    }
  }

  // 0. Check Authorization Header (Bearer Token)
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      // Use supabaseAdmin to verify the token (it can verify JWTs)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (!error && user) {
        console.log('✅ Admin verified via Authorization Header:', user.email)
        return {
          authorized: true,
          user: {
            authId: user.id,
            email: user.email || '',
            profileId: user.id,
            name: user.email?.split('@')[0] || 'Admin',
            isAdmin: true
          }
        }
      } else {
        console.log('⚠️ Authorization header present but validation failed:', error?.message)
      }
    }
  }

  const cookieStore = await cookies()

  // Get all cookies - try both cookieStore and request cookies
  const getCookie = (name: string): string | undefined => {
    // Try cookieStore first (from next/headers)
    const cookieValue = cookieStore.get(name)?.value
    if (cookieValue) {
      return cookieValue
    }
    
    // Try NextRequest.cookies if available
    if (request && 'cookies' in request) {
      const nextRequest = request as NextRequest
      const requestCookie = nextRequest.cookies.get(name)?.value
      if (requestCookie) {
        return requestCookie
      }
    }
    
    // Fallback to request headers if available
    if (request) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, ...valueParts] = cookie.trim().split('=')
          const value = valueParts.join('=') // Handle values with = in them
          if (key && value) {
            acc[key.trim()] = value.trim()
          }
          return acc
        }, {} as Record<string, string>)
        
        // Try exact match first
        if (cookies[name]) {
          return cookies[name]
        }
      }
    }
    return undefined
  }
  
  // Debug: Log available cookies
  const allCookies = cookieStore.getAll()
  const cookieNames = allCookies.map(c => c.name)
  const supabaseCookies = cookieNames.filter(name => 
    name.includes('supabase') || name.includes('sb-') || name.includes('auth')
  )
  
  console.log('🍪 All cookies:', cookieNames.join(', '))
  console.log('🔐 Supabase cookies found:', supabaseCookies.join(', '))
  
  if (request) {
    const cookieHeader = request.headers.get('cookie')
    console.log('📦 Cookie header present:', !!cookieHeader)
    if (cookieHeader) {
      const headerCookies = cookieHeader.split(';').map(c => c.trim().split('=')[0])
      console.log('📦 Header cookie names:', headerCookies.join(', '))
    }
  }

  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = getCookie(name)
          if (value && (name.includes('auth') || name.includes('supabase') || name.includes('sb-'))) {
            console.log(`🔍 Reading cookie ${name}:`, value.substring(0, 20) + '...')
          }
          return value
        },
        set() {},
        remove() {}
      }
    }
  )

  // Check if user is authenticated via Supabase Auth
  const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser()

  if (authError || !authUser) {
    console.log('❌ Admin auth failed:', authError?.message || 'No user')
    return {
      authorized: false,
      error: 'Not authenticated',
      status: 401
    }
  }

  // If authenticated via Supabase Auth, grant admin access
  console.log('✅ Admin verified via Supabase Auth:', authUser.email)
  return {
    authorized: true,
    user: {
      authId: authUser.id,
      email: authUser.email || '',
      profileId: authUser.id,
      name: authUser.email?.split('@')[0] || 'Admin',
      isAdmin: true
    }
  }
}

/**
 * Verifies that the current user is authenticated (but not necessarily an admin).
 * Use this for regular user routes.
 */
export async function verifyUserAuth(request?: Request | NextRequest): Promise<AdminAuthResult> {
  if (!supabaseAdmin) {
    return {
      authorized: false,
      error: 'Supabase admin client not configured',
      status: 500
    }
  }

  // 0. Check Authorization Header (Bearer Token)
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      // Use supabaseAdmin to verify the token (it can verify JWTs)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (!error && user) {
        console.log('✅ Admin verified via Authorization Header:', user.email)
        return {
          authorized: true,
          user: {
            authId: user.id,
            email: user.email || '',
            profileId: user.id,
            name: user.email?.split('@')[0] || 'Admin',
            isAdmin: true
          }
        }
      } else {
        console.log('⚠️ Authorization header present but validation failed:', error?.message)
      }
    }
  }

  const cookieStore = await cookies()

  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {}
      }
    }
  )

  const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser()

  if (authError || !authUser) {
    return {
      authorized: false,
      error: 'Not authenticated',
      status: 401
    }
  }

  // For regular user auth, we don't use this function
  // Regular users use profiles table, not Supabase Auth
  return {
    authorized: false,
    error: 'This function is for admin use only. Regular users should use profiles table.',
    status: 403
  }
}

