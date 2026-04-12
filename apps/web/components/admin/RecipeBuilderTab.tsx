'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Hammer, Search } from 'lucide-react'
import { adminToast } from '@/lib/admin-toast'
import { adminAuthorizedFetch } from '@/lib/admin-authorized-fetch'

const RPG_CLASSES = ['Assassin', 'Fighter', 'Mage', 'Tanker', 'Ranger', 'Healer'] as const
type RpgClass = (typeof RPG_CLASSES)[number]

export interface ShopItemRow {
  id: string
  name: string
  class_req?: string | null
  is_stackable?: boolean | null
  rarity?: string
}

interface IngredientRow {
  id: string
  materialItemId: string
  quantity: number
}

interface OutcomeRow {
  id: string
  outputItemId: string
  weight: number
}

function newIngredientRow(): IngredientRow {
  return { id: crypto.randomUUID(), materialItemId: '', quantity: 1 }
}

function newOutcomeRow(): OutcomeRow {
  return { id: crypto.randomUUID(), outputItemId: '', weight: 10 }
}

function normalizeSearch(s: string) {
  return s.trim().toLowerCase()
}

interface ItemSearchPickerProps {
  options: ShopItemRow[]
  value: string
  onChange: (itemId: string) => void
  placeholder: string
  showRarity: boolean
}

function ItemSearchPicker({ options, value, onChange, placeholder, showRarity }: ItemSearchPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value])

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return options
    return options.filter((o) => {
      const hay = normalizeSearch(`${o.name} ${o.rarity ?? ''}`)
      return hay.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function labelFor(item: ShopItemRow) {
    return showRarity ? `${item.name} (${item.rarity ?? '?'})` : item.name
  }

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-w-[200px]">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((v) => {
            const next = !v
            if (next) setQuery('')
            return next
          })
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-700 bg-black/50 px-2 py-2 text-left text-sm text-gray-200 hover:border-gray-600 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
      >
        <Search className="h-4 w-4 shrink-0 text-amber-400/90" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{selected ? labelFor(selected) : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-gray-600 bg-gray-950 shadow-xl">
          <input
            type="search"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-gray-800 bg-black/70 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/30"
          />
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            <li>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-900 hover:text-gray-300"
                onClick={() => pick('')}
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-500">No matches</li>
            ) : (
              filtered.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={it.id === value}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-amber-500/15 ${
                      it.id === value ? 'bg-amber-500/10 text-amber-200' : 'text-gray-200'
                    }`}
                    onClick={() => pick(it.id)}
                  >
                    {labelFor(it)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default function RecipeBuilderTab({ shopItems }: { shopItems: ShopItemRow[] }) {
  const [activeClass, setActiveClass] = useState<RpgClass>('Fighter')
  const [recipeName, setRecipeName] = useState('')
  const [goldCost, setGoldCost] = useState(0)
  const [ingredients, setIngredients] = useState<IngredientRow[]>([newIngredientRow()])
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([newOutcomeRow()])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const materialOptions = useMemo(
    () => shopItems.filter((i) => i.is_stackable === true).sort((a, b) => a.name.localeCompare(b.name)),
    [shopItems],
  )

  const outcomeOptions = useMemo(() => {
    return shopItems
      .filter((i) => {
        const cr = i.class_req
        if (!cr || cr === 'All') return true
        return cr === activeClass
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [shopItems, activeClass])

  const appendIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, newIngredientRow()])
  }, [])

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }, [])

  const appendOutcome = useCallback(() => {
    setOutcomes((prev) => [...prev, newOutcomeRow()])
  }, [])

  const removeOutcome = useCallback((index: number) => {
    setOutcomes((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }, [])

  const resetForm = useCallback(() => {
    setRecipeName('')
    setGoldCost(0)
    setIngredients([newIngredientRow()])
    setOutcomes([newOutcomeRow()])
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ing = ingredients.filter((r) => r.materialItemId)
    const out = outcomes.filter((r) => r.outputItemId)
    if (ing.length < 1) {
      adminToast.error('Add at least one material with a selected item.')
      return
    }
    if (out.length < 1) {
      adminToast.error('Add at least one outcome with a selected item.')
      return
    }
    const outIds = new Set(out.map((r) => r.outputItemId))
    if (outIds.size !== out.length) {
      adminToast.error('Each outcome must use a distinct shop item.')
      return
    }
    const matIds = new Set(ing.map((r) => r.materialItemId))
    for (const oid of outIds) {
      if (matIds.has(oid)) {
        adminToast.error('An outcome item cannot be the same as a material in this recipe.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const res = await adminAuthorizedFetch('/api/admin/crafting/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName: recipeName.trim(),
          goldCost,
          ingredients: ing.map((r) => ({
            material_item_id: r.materialItemId,
            quantity_required: Math.max(1, Math.floor(Number(r.quantity))),
          })),
          outcomes: out.map((r) => ({
            output_item_id: r.outputItemId,
            weight: Math.max(1, Math.floor(Number(r.weight))),
          })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        adminToast.error(typeof json.error === 'string' ? json.error : 'Save failed')
        return
      }
      adminToast.success(`Recipe created (${json.recipeId?.slice?.(0, 8) ?? 'ok'}…)`)
      resetForm()
    } catch (err) {
      console.error(err)
      adminToast.error('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
        <Hammer size={22} /> Recipe Builder (RNG outcomes)
      </h2>

      <div className="flex flex-wrap gap-2">
        {RPG_CLASSES.map((cls) => (
          <button
            key={cls}
            type="button"
            onClick={() => setActiveClass(cls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              activeClass === cls
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-gray-900/60 border-gray-700 text-gray-400 hover:border-gray-500'
            }`}
          >
            {cls}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Class tabs filter <span className="text-gray-300">outcome</span> item dropdowns (includes &quot;All&quot;
        items). Materials are stackable items only.
      </p>

      <form onSubmit={onSubmit} className="space-y-6 bg-gray-900/40 border border-gray-800 rounded-2xl p-4 md:p-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Recipe name</label>
          <input
            className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            required
            placeholder="Demon Sword Forge"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 mb-1">Gold cost (coins)</label>
          <input
            type="number"
            min={0}
            className="w-full max-w-xs bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            value={Number.isNaN(goldCost) ? '' : goldCost}
            onChange={(e) => setGoldCost(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">Ingredients</span>
            <button
              type="button"
              onClick={appendIngredient}
              className="text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              + Add material
            </button>
          </div>
          <div className="space-y-2">
            {ingredients.map((row, index) => (
              <div key={row.id} className="flex flex-wrap gap-2 items-end">
                <ItemSearchPicker
                  options={materialOptions}
                  value={row.materialItemId}
                  placeholder="— Material —"
                  showRarity={false}
                  onChange={(v) => {
                    setIngredients((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], materialItemId: v }
                      return next
                    })
                  }}
                />
                <input
                  type="number"
                  min={1}
                  className="w-24 bg-black/50 border border-gray-700 rounded-lg px-2 py-2 text-sm"
                  value={row.quantity}
                  onChange={(e) => {
                    const v = Math.max(1, Math.floor(Number(e.target.value) || 1))
                    setIngredients((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], quantity: v }
                      return next
                    })
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="text-xs text-red-400 font-bold px-2 py-2"
                  disabled={ingredients.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400">
              Outcomes ({activeClass})
            </span>
            <button
              type="button"
              onClick={appendOutcome}
              className="text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              + Add outcome
            </button>
          </div>
          <div className="space-y-2">
            {outcomes.map((row, index) => (
              <div key={row.id} className="flex flex-wrap gap-2 items-end">
                <ItemSearchPicker
                  options={outcomeOptions}
                  value={row.outputItemId}
                  placeholder="— Output item —"
                  showRarity
                  onChange={(v) => {
                    setOutcomes((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], outputItemId: v }
                      return next
                    })
                  }}
                />
                <input
                  type="number"
                  min={1}
                  className="w-24 bg-black/50 border border-gray-700 rounded-lg px-2 py-2 text-sm"
                  placeholder="weight"
                  value={row.weight}
                  onChange={(e) => {
                    const v = Math.max(1, Math.floor(Number(e.target.value) || 1))
                    setOutcomes((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], weight: v }
                      return next
                    })
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeOutcome(index)}
                  className="text-xs text-red-400 font-bold px-2 py-2"
                  disabled={outcomes.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black text-sm"
        >
          {isSubmitting ? 'Saving…' : 'Save recipe'}
        </button>
      </form>
    </section>
  )
}
