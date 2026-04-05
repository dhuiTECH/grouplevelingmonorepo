'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { Loader2, Search, User, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { adminAuthorizedFetch } from '@/lib/admin-authorized-fetch'

interface ProfileRow {
  id: string
  email: string | null
  hunter_name: string | null
}

interface ClaimRow {
  id: string
  created_at: string
  idempotency_key: string
  source_type: string
  source_id: string
  result: Record<string, unknown>
}

interface PlayerAuditTabProps {
  shopItems: { id: string; name?: string }[]
}

function formatLootSummary(
  result: Record<string, unknown>,
  shopNameById: Map<string, string>,
): string {
  const parts: string[] = []
  const exp = Number(result.exp_delta ?? 0)
  const coins = Number(result.coins_delta ?? 0)
  const gems = Number(result.gems_delta ?? 0)
  if (exp !== 0) parts.push(`EXP ${exp > 0 ? '+' : ''}${exp}`)
  if (coins !== 0) parts.push(`Coins ${coins > 0 ? '+' : ''}${coins}`)
  if (gems !== 0) parts.push(`Gems ${gems > 0 ? '+' : ''}${gems}`)
  const items = result.items as unknown
  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      if (it && typeof it === 'object' && 'shop_item_id' in it) {
        const sid = String((it as { shop_item_id: string }).shop_item_id)
        const qty = Number((it as { quantity?: number }).quantity ?? 1)
        const label = shopNameById.get(sid) ?? `Item ${sid.slice(0, 8)}…`
        parts.push(`${label} ×${qty}`)
      }
    }
  }
  return parts.length ? parts.join(' · ') : '—'
}

export default function PlayerAuditTab({ shopItems }: PlayerAuditTabProps) {
  const shopNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of shopItems) {
      if (it.id && it.name) m.set(it.id, it.name)
    }
    return m
  }, [shopItems])

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [candidates, setCandidates] = useState<ProfileRow[] | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadByUserId = useCallback(async (userId: string) => {
    setLoading(true)
    setError(null)
    setCandidates(null)
    try {
      const res = await adminAuthorizedFetch(`/api/admin/loot/claims?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (!res.ok) {
        setProfile(null)
        setClaims([])
        setError(data.error ?? `Request failed (${res.status})`)
        return
      }
      setProfile(data.profile)
      setClaims(data.claims ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(async () => {
    const q = query.trim()
    if (!q) {
      setError('Enter a hunter name, email, or profile UUID.')
      return
    }
    setLoading(true)
    setError(null)
    setProfile(null)
    setClaims([])
    setCandidates(null)
    try {
      const res = await adminAuthorizedFetch(`/api/admin/loot/claims?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.status === 404) {
        setError('No hunter matched that search.')
        return
      }
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        return
      }
      if (data.needsDisambiguation && Array.isArray(data.profiles)) {
        setCandidates(data.profiles)
        return
      }
      setProfile(data.profile)
      setClaims(data.claims ?? [])
    } finally {
      setLoading(false)
    }
  }, [query])

  return (
    <section>
      <h2 className="text-lg font-black uppercase tracking-widest mb-4 text-red-400 flex items-center gap-2">
        <ClipboardList size={22} /> Player loot audit
      </h2>
      <p className="text-sm text-gray-400 mb-4 max-w-2xl">
        Search by hunter name, email, or profile UUID. Shows server-side{' '}
        <code className="text-gray-300">loot_claims</code> history (read-only) for support.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Email, hunter name, or UUID…"
          className="flex-1 bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-amber-400 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {candidates && candidates.length > 0 && (
        <div className="mb-6 bg-gray-900/40 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-3">Multiple hunters matched — pick one:</p>
          <ul className="space-y-2">
            {candidates.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(p.id)
                    void loadByUserId(p.id)
                  }}
                  className="w-full text-left flex items-center gap-3 bg-gray-950/60 hover:bg-gray-800/80 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                >
                  <User className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>
                    <span className="font-bold text-white">{p.hunter_name ?? '—'}</span>
                    {p.email && <span className="text-gray-500 ml-2">{p.email}</span>}
                    <span className="block text-xs text-gray-600 font-mono">{p.id}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Viewing:</span>
          <span className="font-black text-white">{profile.hunter_name ?? '—'}</span>
          {profile.email && <span className="text-gray-400">{profile.email}</span>}
          <span className="text-xs font-mono text-gray-600">{profile.id}</span>
        </div>
      )}

      {profile && claims.length === 0 && !loading && (
        <p className="text-sm text-gray-500">No loot claims recorded for this hunter.</p>
      )}

      {claims.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/40">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase text-xs tracking-wider">
                <th className="p-3 whitespace-nowrap">Time (local)</th>
                <th className="p-3 whitespace-nowrap">Source</th>
                <th className="p-3 min-w-[200px]">Reward</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => {
                const open = expandedId === c.id
                return (
                  <React.Fragment key={c.id}>
                    <tr className="border-b border-gray-800/80 hover:bg-gray-900/50">
                      <td className="p-3 whitespace-nowrap text-gray-300">
                        {new Date(c.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-red-400 font-mono text-xs">{c.source_type}</span>
                        <span className="text-gray-500 mx-1">/</span>
                        <span className="text-gray-300 font-mono text-xs">{c.source_id}</span>
                      </td>
                      <td className="p-3 text-gray-200">{formatLootSummary(c.result, shopNameById)}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setExpandedId(open ? null : c.id)}
                          className="p-1 text-gray-500 hover:text-white"
                        >
                          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-gray-800 bg-black/30">
                        <td colSpan={4} className="p-3 pl-6">
                          <div className="text-xs text-gray-500 mb-1">Idempotency key</div>
                          <div className="font-mono text-xs text-gray-400 break-all mb-3">{c.idempotency_key}</div>
                          <div className="text-xs text-gray-500 mb-1">Raw result (JSON)</div>
                          <pre className="text-xs text-gray-300 overflow-x-auto max-h-48 overflow-y-auto p-2 rounded bg-black/50 border border-gray-800">
                            {JSON.stringify(c.result, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
