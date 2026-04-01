'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

type AuthContextValue = {
  user: User | null
  loading: boolean
  signInAsGuest: () => Promise<void>
  linkAccount: (provider: 'google' | 'apple') => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInAsGuest: async () => {},
  linkAccount: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInAsGuest = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }, [])

  const linkAccount = useCallback(async (provider: 'google' | 'apple') => {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined
    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: redirectTo ? { redirectTo } : undefined,
    } as { provider: 'google' | 'apple'; options?: { redirectTo?: string } })
    if (error) throw error
    if (typeof window !== 'undefined' && data?.url) {
      window.location.href = data.url
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signInAsGuest, linkAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
