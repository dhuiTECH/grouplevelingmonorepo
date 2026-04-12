'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { Hammer } from 'lucide-react'
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
                <select
                  className="flex-1 min-w-[200px] bg-black/50 border border-gray-700 rounded-lg px-2 py-2 text-sm"
                  value={row.materialItemId}
                  onChange={(e) => {
                    const v = e.target.value
                    setIngredients((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], materialItemId: v }
                      return next
                    })
                  }}
                >
                  <option value="">— Material —</option>
                  {materialOptions.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
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
                <select
                  className="flex-1 min-w-[200px] bg-black/50 border border-gray-700 rounded-lg px-2 py-2 text-sm"
                  value={row.outputItemId}
                  onChange={(e) => {
                    const v = e.target.value
                    setOutcomes((prev) => {
                      const next = [...prev]
                      next[index] = { ...next[index], outputItemId: v }
                      return next
                    })
                  }}
                >
                  <option value="">— Output item —</option>
                  {outcomeOptions.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.rarity ?? '?'})
                    </option>
                  ))}
                </select>
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
