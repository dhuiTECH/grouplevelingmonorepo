'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  Package,
  Plus,
  Trash2,
  Link2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react'
import { adminAuthorizedFetch } from '@/lib/admin-authorized-fetch'
import PlayerAuditTab from '@/components/admin/PlayerAuditTab'

export interface LootPoolRow {
  id: string
  name: string
  notes: string | null
  created_at: string
}

export interface LootEntryRow {
  id: string
  loot_pool_id: string
  weight: number
  sort_order: number
  exp_delta: number | null
  coins_delta: number | null
  gems_delta: number | null
  shop_item_id: string | null
  quantity: number
}

export interface LootSourceRow {
  source_type: string
  source_id: string
  loot_pool_id: string
}

/** Matches mobile `claim_loot` keys — use dropdowns; no guessing. */
const CHEST_SOURCE_IDS = ['small', 'silver', 'medium', 'large'] as const
const BATTLE_SOURCE_IDS = [
  'default',
  'battle_tier_1',
  'battle_tier_2',
  'battle_tier_3',
  'battle_tier_4',
  'battle_tier_5',
] as const
const NPC_SOURCE_PRESETS = ['npc-default'] as const
const NPC_CUSTOM_VALUE = '__custom__'

const SOURCE_ID_LABELS: Record<string, string> = {
  small: 'Small chest',
  silver: 'Silver chest',
  medium: 'Medium chest',
  large: 'Large chest',
  default: 'Battle fallback (unknown encounter)',
  battle_tier_1: 'Battle — weak mobs',
  battle_tier_2: 'Battle — mid-low',
  battle_tier_3: 'Battle — standard',
  battle_tier_4: 'Battle — strong',
  battle_tier_5: 'Battle — boss / elite',
  'npc-default': 'NPC — generic (set dialogue to use this id)',
  [NPC_CUSTOM_VALUE]: 'NPC — custom id (paste below)',
}

function rewardLabel(entry: LootEntryRow, itemName?: string): string {
  if (entry.shop_item_id) {
    if (itemName) return `${itemName} (×${entry.quantity})`
    return `Item ${entry.shop_item_id.slice(0, 8)}…`
  }
  const parts: string[] = []
  if (entry.exp_delta != null && entry.exp_delta !== 0) parts.push(`EXP ${entry.exp_delta > 0 ? '+' : ''}${entry.exp_delta}`)
  if (entry.coins_delta != null && entry.coins_delta !== 0) parts.push(`Coins ${entry.coins_delta > 0 ? '+' : ''}${entry.coins_delta}`)
  if (entry.gems_delta != null && entry.gems_delta !== 0) parts.push(`Gems ${entry.gems_delta > 0 ? '+' : ''}${entry.gems_delta}`)
  return parts.length ? parts.join(', ') : '—'
}

function impliedPercent(weight: number, total: number): string {
  if (total <= 0) return '0%'
  return `${((weight / total) * 100).toFixed(1)}%`
}

interface LootManagerTabProps {
  shopItems: { id: string; name?: string; slot?: string }[]
}

type LootSubTab = 'manager' | 'audit'

export default function LootManagerTab({ shopItems }: LootManagerTabProps) {
  const [lootSubTab, setLootSubTab] = useState<LootSubTab>('manager')
  const [pools, setPools] = useState<LootPoolRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<LootEntryRow[]>([])
  const [sources, setSources] = useState<LootSourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newPoolName, setNewPoolName] = useState('')
  const [showCreatePool, setShowCreatePool] = useState(false)

  const [weightDraft, setWeightDraft] = useState<Record<string, string>>({})

  const [showAddEntry, setShowAddEntry] = useState(false)
  const [addMode, setAddMode] = useState<'currency' | 'item'>('currency')
  const [formExp, setFormExp] = useState('')
  const [formCoins, setFormCoins] = useState('')
  const [formGems, setFormGems] = useState('')
  const [formWeight, setFormWeight] = useState('10')
  const [formSort, setFormSort] = useState('0')
  const [formShopItemId, setFormShopItemId] = useState('')
  const [formQty, setFormQty] = useState('1')
  const [itemSearch, setItemSearch] = useState('')

  const [showSourceForm, setShowSourceForm] = useState(true)
  const [srcType, setSrcType] = useState<'battle' | 'chest' | 'npc'>('chest')
  /** Preset key from dropdown, or NPC_CUSTOM_VALUE for manual id */
  const [srcIdPreset, setSrcIdPreset] = useState<string>('small')
  const [srcIdCustomNpc, setSrcIdCustomNpc] = useState('')

  const [helpOpen, setHelpOpen] = useState(true)

  const loadPools = useCallback(async () => {
    setError(null)
    const res = await adminAuthorizedFetch('/api/admin/loot/pools')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Failed to load pools')
      return
    }
    setPools(data.pools || [])
  }, [])

  const loadPoolDetail = useCallback(async (poolId: string) => {
    setLoadingDetail(true)
    setError(null)
    try {
      const [eRes, sRes] = await Promise.all([
        adminAuthorizedFetch(`/api/admin/loot/entries?poolId=${encodeURIComponent(poolId)}`),
        adminAuthorizedFetch(`/api/admin/loot/sources?poolId=${encodeURIComponent(poolId)}`),
      ])
      const eJson = await eRes.json().catch(() => ({}))
      const sJson = await sRes.json().catch(() => ({}))
      if (!eRes.ok) throw new Error(eJson.error || 'Failed to load entries')
      if (!sRes.ok) throw new Error(sJson.error || 'Failed to load sources')
      const list: LootEntryRow[] = eJson.entries || []
      setEntries(list)
      setSources(sJson.sources || [])
      const w: Record<string, string> = {}
      list.forEach((row) => {
        w[row.id] = String(row.weight)
      })
      setWeightDraft(w)
    } catch (e: any) {
      setError(e.message || 'Load failed')
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadPools()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadPools])

  useEffect(() => {
    if (selectedId) void loadPoolDetail(selectedId)
  }, [selectedId, loadPoolDetail])

  const totalWeight = useMemo(() => {
    return entries.reduce((s, e) => {
      const raw = weightDraft[e.id]
      const w =
        raw !== undefined && raw !== ''
          ? parseInt(String(raw), 10)
          : e.weight
      const useW = Number.isFinite(w) && w >= 1 ? w : e.weight
      return s + useW
    }, 0)
  }, [entries, weightDraft])

  const filteredShopItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    if (!q) return shopItems.slice(0, 80)
    return shopItems
      .filter(
        (it) =>
          (it.name && it.name.toLowerCase().includes(q)) ||
          it.id.toLowerCase().includes(q),
      )
      .slice(0, 80)
  }, [shopItems, itemSearch])

  const selectedPool = pools.find((p) => p.id === selectedId) || null

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault()
    const name = newPoolName.trim()
    if (!name) return
    const res = await adminAuthorizedFetch('/api/admin/loot/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Create failed')
      return
    }
    setNewPoolName('')
    setShowCreatePool(false)
    await loadPools()
    if (data.pool?.id) setSelectedId(data.pool.id)
  }

  async function handleDeletePool() {
    if (!selectedId || !selectedPool) return
    if (!confirm(`Delete pool "${selectedPool.name}" and all entries tied only via FK? Source rows must be removed first.`)) return
    const res = await adminAuthorizedFetch(`/api/admin/loot/pools/${selectedId}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Delete failed (check foreign keys)')
      return
    }
    setSelectedId(null)
    setEntries([])
    await loadPools()
  }

  async function saveWeight(entryId: string) {
    const raw = weightDraft[entryId]
    const w = parseInt(String(raw), 10)
    if (!Number.isFinite(w) || w < 1) {
      setError('Weight must be >= 1')
      return
    }
    const res = await adminAuthorizedFetch(`/api/admin/loot/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: w }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Update failed')
      return
    }
    setEntries((prev) =>
      prev.map((row) => (row.id === entryId ? { ...row, weight: w } : row)),
    )
    setError(null)
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Delete this loot row?')) return
    const res = await adminAuthorizedFetch(`/api/admin/loot/entries/${entryId}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Delete failed')
      return
    }
    if (selectedId) await loadPoolDetail(selectedId)
  }

  async function submitAddEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    const weight = parseInt(formWeight, 10)
    if (!Number.isFinite(weight) || weight < 1) {
      setError('Weight must be >= 1')
      return
    }
    const body: Record<string, unknown> = {
      loot_pool_id: selectedId,
      weight,
      sort_order: parseInt(formSort, 10) || 0,
    }
    if (addMode === 'currency') {
      if (formExp.trim()) body.exp_delta = parseInt(formExp, 10)
      if (formCoins.trim()) body.coins_delta = parseInt(formCoins, 10)
      if (formGems.trim()) body.gems_delta = parseInt(formGems, 10)
    } else {
      if (!formShopItemId.trim()) {
        setError('Select a shop item')
        return
      }
      body.shop_item_id = formShopItemId.trim()
      body.quantity = parseInt(formQty, 10) || 1
    }

    const res = await adminAuthorizedFetch('/api/admin/loot/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Add failed')
      return
    }
    setShowAddEntry(false)
    setFormExp('')
    setFormCoins('')
    setFormGems('')
    setFormWeight('10')
    setFormSort('0')
    setFormShopItemId('')
    setFormQty('1')
    setError(null)
    await loadPoolDetail(selectedId)
  }

  function resolveSourceIdForSubmit(): string | null {
    if (srcType === 'npc' && srcIdPreset === NPC_CUSTOM_VALUE) {
      const t = srcIdCustomNpc.trim()
      return t.length > 0 ? t : null
    }
    return srcIdPreset
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    const source_id = resolveSourceIdForSubmit()
    if (!source_id) {
      setError('Enter a custom NPC / node id, or pick a preset.')
      return
    }
    const res = await adminAuthorizedFetch('/api/admin/loot/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: srcType,
        source_id,
        loot_pool_id: selectedId,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Map failed')
      return
    }
    setSrcIdCustomNpc('')
    setShowSourceForm(true)
    await loadPoolDetail(selectedId)
  }

  async function removeSource(row: LootSourceRow) {
    if (!confirm(`Remove mapping ${row.source_type} / ${row.source_id}?`)) return
    const res = await adminAuthorizedFetch('/api/admin/loot/sources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_type: row.source_type,
        source_id: row.source_id,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Unmap failed')
      return
    }
    if (selectedId) await loadPoolDetail(selectedId)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-slate-800 pb-4">
        <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2 shrink-0">
          <Package size={22} /> Loot
        </h2>
        <div className="flex flex-wrap gap-2 bg-black p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setLootSubTab('manager')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${
              lootSubTab === 'manager'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            Pools & sources
          </button>
          <button
            type="button"
            onClick={() => setLootSubTab('audit')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
              lootSubTab === 'audit'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}
          >
            <ClipboardList size={14} className="opacity-80" /> Player audit
          </button>
        </div>
      </div>

      {lootSubTab === 'audit' && <PlayerAuditTab shopItems={shopItems} />}

      {lootSubTab === 'manager' &&
        (loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading loot…
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Package size={18} /> Loot drops
              </h3>
              <button
                type="button"
                onClick={() => {
                  void loadPools()
                  if (selectedId) void loadPoolDetail(selectedId)
                }}
                className="px-3 py-1.5 text-xs font-bold uppercase bg-gray-800 border border-gray-600 rounded flex items-center gap-1 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div className="border border-cyan-900/40 bg-cyan-950/20 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-cyan-950/30 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-cyan-200">
            <HelpCircle size={18} className="shrink-0 text-cyan-400" />
            How does this work? (plain English)
          </span>
          {helpOpen ? (
            <ChevronUp size={18} className="text-cyan-500 shrink-0" />
          ) : (
            <ChevronDown size={18} className="text-cyan-500 shrink-0" />
          )}
        </button>
        {helpOpen && (
          <div className="px-3 pb-3 pt-0 space-y-3 text-sm text-gray-300 leading-relaxed border-t border-cyan-900/30">
            <p className="text-gray-400 pt-3">
              When a player <strong className="text-gray-200">wins a fight</strong>,{' '}
              <strong className="text-gray-200">opens a chest</strong>, or{' '}
              <strong className="text-gray-200">gets NPC loot</strong>, the server rolls{' '}
              <strong className="text-cyan-300">one reward</strong> from <strong className="text-gray-200">one pool</strong>{' '}
              you configure here. You are not editing SQL — you are naming prize lists and how often each line wins.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>
                <strong className="text-gray-200">Pools (left column)</strong> — A <em>named bag</em> of possible outcomes
                (e.g. &quot;Small chest&quot; or &quot;Default battle&quot;). Pick a pool, then add rows inside it.
              </li>
              <li>
                <strong className="text-gray-200">Reward rows (table)</strong> — Each row is <em>one possible payout</em>:
                gold/EXP/gems and/or a shop item. Every time the game rolls this pool, <strong className="text-gray-200">exactly one row</strong> wins.
              </li>
              <li>
                <strong className="text-gray-200">Weight</strong> — How often this row is picked <em>compared to the other rows in the same pool</em>.
                Bigger number = more common. <strong className="text-gray-200">Implied %</strong> is that row&apos;s share of the pool (all rows add up to 100%).
              </li>
              <li>
                <strong className="text-gray-200">Source map (bottom)</strong> — Connects <em>what happened in the game</em> to <em>which pool</em> to use.
                <span className="block mt-1 pl-0 text-xs text-gray-500">
                  <strong className="text-gray-400">chest</strong> + <code className="text-cyan-600">small</code> / <code className="text-cyan-600">silver</code> / <code className="text-cyan-600">medium</code> / <code className="text-cyan-600">large</code> — each tier should use its own list so rewards scale with rarity.{' '}
                  <strong className="text-gray-400">battle</strong> + <code className="text-cyan-600">battle_tier_1</code> … <code className="text-cyan-600">battle_tier_5</code> — weak mobs vs bosses (app picks tier from mob level/HP; bosses use tier 5).{' '}
                  <code className="text-cyan-600">default</code> falls back to mid-tier battle loot. Per-encounter UUID maps are optional.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm border border-red-900/50 bg-red-950/30 px-3 py-2 rounded">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 min-h-[480px]">
        <div className="w-full lg:w-72 shrink-0 border border-gray-800 rounded-lg bg-gray-950/80 p-3 flex flex-col">
          <p className="text-[11px] text-gray-500 mb-2 leading-snug">
            Named loot bags. The game picks <span className="text-gray-400">one pool</span>, then rolls{' '}
            <span className="text-gray-400">one row</span> inside it.
          </p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase text-gray-500">Pools</span>
            <button
              type="button"
              onClick={() => setShowCreatePool((v) => !v)}
              className="text-xs font-bold text-cyan-400 hover:underline"
            >
              + New
            </button>
          </div>
          {showCreatePool && (
            <form onSubmit={handleCreatePool} className="mb-3 space-y-2">
              <input
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                placeholder="Pool name"
                className="w-full px-2 py-1.5 text-sm bg-black border border-gray-700 rounded text-white"
              />
              <button
                type="submit"
                className="w-full py-1.5 text-xs font-bold uppercase bg-cyan-800 hover:bg-cyan-700 rounded text-white"
              >
                Create
              </button>
            </form>
          )}
          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-1">
            {pools.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-2 py-2 rounded text-sm border ${
                  selectedId === p.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-white'
                    : 'border-transparent bg-gray-900/50 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="font-semibold truncate">{p.name}</div>
                {p.notes && (
                  <div className="text-[10px] text-gray-600 truncate">{p.notes}</div>
                )}
              </button>
            ))}
            {pools.length === 0 && (
              <p className="text-xs text-gray-600">No pools yet.</p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 border border-gray-800 rounded-lg bg-gray-950/50 p-4">
          {!selectedPool ? (
            <p className="text-gray-500 text-sm">Select a pool to edit entries.</p>
          ) : loadingDetail ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-white font-bold">{selectedPool.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{selectedPool.id}</p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-xl">
                    Each row below is one possible prize. Weights only compete inside this pool — they are not global drop rates.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEntry(true)}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700 rounded flex items-center gap-1"
                  >
                    <Plus size={14} /> Add reward
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePool}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-red-950/80 hover:bg-red-900 border border-red-900 rounded"
                  >
                    Delete pool
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                      <th className="py-2 pr-2">Reward</th>
                      <th className="py-2 pr-2">Qty</th>
                      <th className="py-2 pr-2">Weight</th>
                      <th className="py-2 pr-2">Implied %</th>
                      <th className="py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const itemName = entry.shop_item_id
                        ? shopItems.find((i) => i.id === entry.shop_item_id)?.name
                        : undefined
                      return (
                      <tr key={entry.id} className="border-b border-gray-900/80">
                        <td className="py-2 pr-2 text-gray-200 max-w-[220px]">
                          {rewardLabel(entry, itemName)}
                        </td>
                        <td className="py-2 pr-2 text-gray-400">
                          {entry.shop_item_id ? entry.quantity : '—'}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={1}
                            className="w-20 px-2 py-1 bg-black border border-gray-700 rounded text-white text-xs"
                            value={weightDraft[entry.id] ?? String(entry.weight)}
                            onChange={(e) =>
                              setWeightDraft((d) => ({
                                ...d,
                                [entry.id]: e.target.value,
                              }))
                            }
                            onBlur={() => void saveWeight(entry.id)}
                          />
                        </td>
                        <td className="py-2 pr-2 text-cyan-300/90 tabular-nums">
                          {impliedPercent(
                            Number(weightDraft[entry.id] ?? entry.weight) || 0,
                            totalWeight,
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => void deleteEntry(entry.id)}
                            className="p-1 text-red-400 hover:bg-red-950/50 rounded"
                            aria-label="Delete row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {entries.length === 0 && (
                  <p className="text-gray-600 text-sm py-6">No entries in this pool.</p>
                )}
              </div>

              <div className="mt-8 border-t border-gray-800 pt-4">
                <p className="text-[11px] text-gray-500 mb-3 leading-snug">
                  Wire <span className="text-gray-400">in-game events</span> to this pool so the server knows which bag to roll when that event fires.
                </p>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    <Link2 size={14} /> Link this pool to a game event
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSourceForm((v) => !v)}
                    className="text-xs font-bold text-gray-500 hover:text-cyan-400"
                  >
                    {showSourceForm ? 'Hide form' : 'Show form'}
                  </button>
                </div>
                {showSourceForm && (
                  <form onSubmit={addSource} className="space-y-2 mb-3">
                    <div className="flex flex-wrap gap-2 items-end">
                      <label className="flex flex-col gap-0.5 text-[10px] uppercase text-gray-500">
                        Event type
                        <select
                          value={srcType}
                          onChange={(e) => {
                            const t = e.target.value as 'battle' | 'chest' | 'npc'
                            setSrcType(t)
                            if (t === 'chest') setSrcIdPreset('small')
                            else if (t === 'battle') setSrcIdPreset('battle_tier_3')
                            else setSrcIdPreset('npc-default')
                            setSrcIdCustomNpc('')
                          }}
                          className="px-2 py-1.5 bg-black border border-gray-700 rounded text-sm text-white min-w-[120px]"
                        >
                          <option value="chest">Chest (run / chest UI)</option>
                          <option value="battle">Battle (fights)</option>
                          <option value="npc">NPC / dialogue</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-0.5 text-[10px] uppercase text-gray-500 flex-1 min-w-[200px]">
                        Which event (this is what the app sends — pick, don’t type)
                        <select
                          value={srcIdPreset}
                          onChange={(e) => setSrcIdPreset(e.target.value)}
                          className="px-2 py-1.5 bg-black border border-gray-700 rounded text-sm text-white w-full"
                        >
                          {srcType === 'chest' &&
                            CHEST_SOURCE_IDS.map((id) => (
                              <option key={id} value={id}>
                                {id} — {SOURCE_ID_LABELS[id] ?? id}
                              </option>
                            ))}
                          {srcType === 'battle' &&
                            BATTLE_SOURCE_IDS.map((id) => (
                              <option key={id} value={id}>
                                {id} — {SOURCE_ID_LABELS[id] ?? id}
                              </option>
                            ))}
                          {srcType === 'npc' && (
                            <>
                              {NPC_SOURCE_PRESETS.map((id) => (
                                <option key={id} value={id}>
                                  {id} — {SOURCE_ID_LABELS[id] ?? id}
                                </option>
                              ))}
                              <option value={NPC_CUSTOM_VALUE}>
                                {SOURCE_ID_LABELS[NPC_CUSTOM_VALUE]}
                              </option>
                            </>
                          )}
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-bold uppercase bg-cyan-900/80 border border-cyan-800 rounded shrink-0"
                      >
                        Add link
                      </button>
                    </div>
                    {srcType === 'npc' && srcIdPreset === NPC_CUSTOM_VALUE && (
                      <input
                        value={srcIdCustomNpc}
                        onChange={(e) => setSrcIdCustomNpc(e.target.value)}
                        placeholder="Paste world_map node id, interaction id, or dialogue key your GRANT_LOOT uses"
                        className="w-full px-2 py-1.5 bg-black border border-amber-900/50 rounded text-sm text-white placeholder:text-gray-600"
                      />
                    )}
                    <p className="text-[10px] text-gray-600 leading-snug">
                      Chest tiers match the app (`small` / `silver` / `medium` / `large`). Battle tiers match
                      `getBattleLootSourceId` in the mobile app. NPC custom must match `GRANT_LOOT` / interaction id in
                      code.
                    </p>
                  </form>
                )}
                <ul className="space-y-1 text-xs text-gray-400">
                  {sources.map((s) => (
                    <li
                      key={`${s.source_type}-${s.source_id}`}
                      className="flex justify-between items-center bg-gray-900/40 px-2 py-1 rounded"
                    >
                      <span>
                        <span className="text-cyan-600 font-mono">{s.source_type}</span>{' '}
                        <span className="text-white">{s.source_id}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeSource(s)}
                        className="text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                  {sources.length === 0 && (
                    <li className="text-gray-600">No sources point to this pool.</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {showAddEntry && selectedId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-950 border border-gray-700 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h3 className="text-white font-bold mb-4">Add reward row</h3>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAddMode('currency')}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded ${
                  addMode === 'currency'
                    ? 'bg-cyan-900 text-white'
                    : 'bg-gray-900 text-gray-500'
                }`}
              >
                Currency
              </button>
              <button
                type="button"
                onClick={() => setAddMode('item')}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded ${
                  addMode === 'item'
                    ? 'bg-cyan-900 text-white'
                    : 'bg-gray-900 text-gray-500'
                }`}
              >
                Shop item
              </button>
            </div>
            <form onSubmit={submitAddEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-gray-500">
                  Weight
                  <input
                    type="number"
                    min={1}
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-white"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Sort order
                  <input
                    type="number"
                    value={formSort}
                    onChange={(e) => setFormSort(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-white"
                  />
                </label>
              </div>
              {addMode === 'currency' ? (
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs text-gray-500">
                    EXP delta
                    <input
                      value={formExp}
                      onChange={(e) => setFormExp(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-white"
                    />
                  </label>
                  <label className="text-xs text-gray-500">
                    Coins delta
                    <input
                      value={formCoins}
                      onChange={(e) => setFormCoins(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-white"
                    />
                  </label>
                  <label className="text-xs text-gray-500">
                    Gems delta
                    <input
                      value={formGems}
                      onChange={(e) => setFormGems(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-white"
                    />
                  </label>
                </div>
              ) : (
                <>
                  <input
                    type="search"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search shop items…"
                    className="w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-sm text-white mb-2"
                  />
                  <select
                    value={formShopItemId}
                    onChange={(e) => setFormShopItemId(e.target.value)}
                    className="w-full px-2 py-2 bg-black border border-gray-700 rounded text-sm text-white"
                    size={6}
                  >
                    <option value="">— Select item —</option>
                    {filteredShopItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name || it.id} ({it.slot || 'item'})
                      </option>
                    ))}
                  </select>
                  <label className="text-xs text-gray-500 block">
                    Quantity
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={formQty}
                      onChange={(e) => setFormQty(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 bg-black border border-gray-700 rounded text-white"
                    />
                  </label>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEntry(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold uppercase bg-cyan-800 hover:bg-cyan-700 rounded text-white"
                >
                  Add entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          </>
        ))}
    </section>
  )
}
