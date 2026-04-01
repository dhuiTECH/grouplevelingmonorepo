'use client'

import { useAuth } from '@/components/AuthProvider'
import { useState } from 'react'

type Props = {
  hunterEmail?: string | null
}

export default function SecureAccountCard({ hunterEmail }: Props) {
  const { user, linkAccount } = useAuth()
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null)

  const email = hunterEmail ?? user?.email ?? ''
  const placeholder = email.endsWith('@placeholder.local')
  const isAnon = (user as { is_anonymous?: boolean } | null)?.is_anonymous === true
  if (!isAnon && !placeholder) return null

  const run = async (provider: 'google' | 'apple') => {
    setBusy(provider)
    try {
      await linkAccount(provider)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not link account.'
      alert(msg)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 space-y-3">
      <h3 className="text-center text-[11px] font-black uppercase tracking-widest text-cyan-100">
        Link Account to Save Data
      </h3>
      <p className="text-center text-[10px] text-slate-400 leading-relaxed">
        Connect Google or Apple to recover this hunter on another device.
      </p>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run('google')}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-white disabled:opacity-50"
      >
        {busy === 'google' ? 'Opening…' : 'Continue with Google'}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => run('apple')}
        className="w-full rounded-lg bg-white py-2.5 text-[11px] font-bold text-black disabled:opacity-50"
      >
        {busy === 'apple' ? 'Opening…' : 'Continue with Apple'}
      </button>
    </div>
  )
}
