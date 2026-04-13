'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Hammer, Layers, Search } from 'lucide-react'
import { adminToast } from '@/lib/admin-toast'
import { adminAuthorizedFetch } from '@/lib/admin-authorized-fetch'
import { effectiveItemCategory } from '@/lib/item-category'

const RPG_CLASSES = ['Assassin', 'Fighter', 'Mage', 'Tanker', 'Ranger', 'Healer'] as const
type RpgClass = (typeof RPG_CLASSES)[number]
type BuilderMode = 'forge' | 'refine'

function isRpgClass(s: string | null | undefined): s is RpgClass {
  return !!s && (RPG_CLASSES as readonly string[]).includes(s)
}

interface AdminRecipeIngredientRow {
  id: string
  material_item_id: string
  quantity_required: number
}

interface AdminRecipeOutcomeRow {
  id: string
  output_item_id: string
  weight: number
}

interface AdminRecipeRow {
  id: string
  recipe_name: string
  gold_cost: number
  is_active: boolean
  created_at?: string
  recipe_ingredients?: AdminRecipeIngredientRow[] | null
  recipe_outcomes?: AdminRecipeOutcomeRow[] | null
}

/** Same rule as mobile BlacksmithUI: recipe shows for a class if any outcome is All/unset or that class. */
function recipeVisibleForClass(
  recipe: AdminRecipeRow,
  shopById: Map<string, ShopItemRow>,
  cls: RpgClass,
): boolean {
  const outs = recipe.recipe_outcomes ?? []
  if (outs.length === 0) return false
  return outs.some((o) => {
    const item = shopById.get(o.output_item_id)
    if (!item) return false
    const cr = item.class_req
    if (!cr || cr === 'All') return true
    return cr === cls
  })
}

export interface ShopItemRow {
  id: string
  name: string
  class_req?: string | null
  is_stackable?: boolean | null
  item_category?: string | null
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

const REFINE_OUTCOME_WEIGHT = 100

export default function RecipeBuilderTab({ shopItems }: { shopItems: ShopItemRow[] }) {
  const [builderMode, setBuilderMode] = useState<BuilderMode>('forge')
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)

  const [activeClass, setActiveClass] = useState<RpgClass>('Fighter')

  const [recipeName, setRecipeName] = useState('')
  const [goldCost, setGoldCost] = useState(0)
  const [ingredients, setIngredients] = useState<IngredientRow[]>([newIngredientRow()])
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([newOutcomeRow()])

  const [refineRecipeName, setRefineRecipeName] = useState('')
  const [refineGoldCost, setRefineGoldCost] = useState(0)
  const [refineIngredients, setRefineIngredients] = useState<IngredientRow[]>([newIngredientRow(), newIngredientRow()])
  const [refineOutputItemId, setRefineOutputItemId] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedRecipes, setSavedRecipes] = useState<AdminRecipeRow[]>([])
  const [recipesLoading, setRecipesLoading] = useState(true)

  const shopById = useMemo(() => {
    const m = new Map<string, ShopItemRow>()
    for (const it of shopItems) m.set(it.id, it)
    return m
  }, [shopItems])

  const inferClassFromRecipe = useCallback(
    (recipe: AdminRecipeRow): RpgClass => {
      for (const o of recipe.recipe_outcomes ?? []) {
        const item = shopById.get(o.output_item_id)
        const cr = item?.class_req
        if (isRpgClass(cr)) return cr
      }
      return 'Fighter'
    },
    [shopById],
  )

  const loadSavedRecipes = useCallback(async () => {
    setRecipesLoading(true)
    try {
      const res = await adminAuthorizedFetch('/api/admin/crafting/recipes')
      const json = (await res.json().catch(() => ({}))) as { recipes?: AdminRecipeRow[]; error?: string }
      if (!res.ok) {
        console.error('Load recipes:', json.error)
        setSavedRecipes([])
        return
      }
      setSavedRecipes(Array.isArray(json.recipes) ? json.recipes : [])
    } catch (e) {
      console.error(e)
      setSavedRecipes([])
    } finally {
      setRecipesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSavedRecipes()
  }, [loadSavedRecipes])

  const materialOptions = useMemo(
    () =>
      shopItems
        .filter((i) => effectiveItemCategory(i) === 'crafting_material')
        .sort((a, b) => a.name.localeCompare(b.name)),
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

  const resetForgeForm = useCallback(() => {
    setRecipeName('')
    setGoldCost(0)
    setIngredients([newIngredientRow()])
    setOutcomes([newOutcomeRow()])
    setEditingRecipeId(null)
  }, [])

  const resetRefineForm = useCallback(() => {
    setRefineRecipeName('')
    setRefineGoldCost(0)
    setRefineIngredients([newIngredientRow(), newIngredientRow()])
    setRefineOutputItemId('')
    setEditingRecipeId(null)
  }, [])

  const switchBuilderMode = useCallback(
    (mode: BuilderMode) => {
      if (mode === builderMode) return
      setEditingRecipeId(null)
      if (mode === 'forge') {
        resetRefineForm()
      } else {
        resetForgeForm()
      }
      setBuilderMode(mode)
    },
    [builderMode, resetForgeForm, resetRefineForm],
  )

  const loadRecipeIntoForge = useCallback(
    (recipe: AdminRecipeRow) => {
      setBuilderMode('forge')
      setEditingRecipeId(recipe.id)
      setActiveClass(inferClassFromRecipe(recipe))
      setRecipeName(recipe.recipe_name)
      setGoldCost(recipe.gold_cost)
      const ings = recipe.recipe_ingredients ?? []
      setIngredients(
        ings.length
          ? ings.map((r) => ({
              id: crypto.randomUUID(),
              materialItemId: r.material_item_id,
              quantity: r.quantity_required,
            }))
          : [newIngredientRow()],
      )
      const outs = recipe.recipe_outcomes ?? []
      setOutcomes(
        outs.length
          ? outs.map((r) => ({
              id: crypto.randomUUID(),
              outputItemId: r.output_item_id,
              weight: r.weight,
            }))
          : [newOutcomeRow()],
      )
    },
    [inferClassFromRecipe],
  )

  const loadRecipeIntoRefine = useCallback(
    (recipe: AdminRecipeRow) => {
      const outs = recipe.recipe_outcomes ?? []
      if (outs.length !== 1) return false
      setBuilderMode('refine')
      setEditingRecipeId(recipe.id)
      setActiveClass(inferClassFromRecipe(recipe))
      setRefineRecipeName(recipe.recipe_name)
      setRefineGoldCost(recipe.gold_cost)
      const ings = recipe.recipe_ingredients ?? []
      setRefineIngredients(
        ings.length
          ? ings.map((r) => ({
              id: crypto.randomUUID(),
              materialItemId: r.material_item_id,
              quantity: r.quantity_required,
            }))
          : [newIngredientRow(), newIngredientRow()],
      )
      setRefineOutputItemId(outs[0].output_item_id)
      return true
    },
    [inferClassFromRecipe],
  )

  const handleRecipeClick = useCallback(
    (recipe: AdminRecipeRow) => {
      const outs = recipe.recipe_outcomes ?? []
      if (builderMode === 'refine') {
        if (outs.length === 1) {
          loadRecipeIntoRefine(recipe)
          return
        }
        adminToast.success('This recipe has multiple RNG outcomes — opened in Forge.')
        loadRecipeIntoForge(recipe)
        return
      }
      loadRecipeIntoForge(recipe)
    },
    [builderMode, loadRecipeIntoForge, loadRecipeIntoRefine],
  )

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

  const appendRefineIngredient = useCallback(() => {
    setRefineIngredients((prev) => [...prev, newIngredientRow()])
  }, [])

  const removeRefineIngredient = useCallback((index: number) => {
    setRefineIngredients((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }, [])

  async function persistRecipe(
    name: string,
    gold: number,
    ing: { materialItemId: string; quantity: number }[],
    out: { outputItemId: string; weight: number }[],
  ) {
    const filteredIng = ing.filter((r) => r.materialItemId)
    const filteredOut = out.filter((r) => r.outputItemId)
    if (filteredIng.length < 1) {
      adminToast.error('Add at least one material with a selected item.')
      return
    }
    if (filteredOut.length < 1) {
      adminToast.error('Add at least one outcome with a selected item.')
      return
    }
    const outIds = new Set(filteredOut.map((r) => r.outputItemId))
    if (outIds.size !== filteredOut.length) {
      adminToast.error('Each outcome must use a distinct shop item.')
      return
    }
    const matIds = new Set(filteredIng.map((r) => r.materialItemId))
    for (const oid of outIds) {
      if (matIds.has(oid)) {
        adminToast.error('An outcome item cannot be the same as a material in this recipe.')
        return
      }
    }

    const body = {
      recipeName: name.trim(),
      goldCost: gold,
      ingredients: filteredIng.map((r) => ({
        material_item_id: r.materialItemId,
        quantity_required: Math.max(1, Math.floor(Number(r.quantity))),
      })),
      outcomes: filteredOut.map((r) => ({
        output_item_id: r.outputItemId,
        weight: Math.max(1, Math.floor(Number(r.weight))),
      })),
    }

    setIsSubmitting(true)
    try {
      const isUpdate = !!editingRecipeId
      const res = await adminAuthorizedFetch('/api/admin/crafting/recipes', {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUpdate ? { id: editingRecipeId, ...body } : body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        adminToast.error(typeof json.error === 'string' ? json.error : 'Save failed')
        return
      }
      adminToast.success(isUpdate ? 'Recipe updated.' : `Recipe created (${json.recipeId?.slice?.(0, 8) ?? 'ok'}…)`)
      if (builderMode === 'forge') resetForgeForm()
      else resetRefineForm()
      void loadSavedRecipes()
    } catch (err) {
      console.error(err)
      adminToast.error('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onSubmitForge(e: React.FormEvent) {
    e.preventDefault()
    await persistRecipe(
      recipeName,
      goldCost,
      ingredients,
      outcomes.map((r) => ({ outputItemId: r.outputItemId, weight: r.weight })),
    )
  }

  async function onSubmitRefine(e: React.FormEvent) {
    e.preventDefault()
    await persistRecipe(refineRecipeName, refineGoldCost, refineIngredients, [
      { outputItemId: refineOutputItemId, weight: REFINE_OUTCOME_WEIGHT },
    ])
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
        <Hammer size={22} /> Recipe Builder
      </h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchBuilderMode('forge')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
            builderMode === 'forge'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-gray-900/60 border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          <Hammer className="h-4 w-4" aria-hidden />
          Forge (RNG)
        </button>
        <button
          type="button"
          onClick={() => switchBuilderMode('refine')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
            builderMode === 'refine'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'bg-gray-900/60 border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          <Layers className="h-4 w-4" aria-hidden />
          Refine (combine)
        </button>
      </div>
      <p className="text-xs text-gray-500">
        <span className="text-gray-300">Forge</span> supports weighted RNG outcomes.{' '}
        <span className="text-gray-300">Refine</span> is materials in → one guaranteed output (stored as a single
        outcome). Class tabs filter <span className="text-gray-300">output</span> pickers (includes &quot;All&quot;
        items). <span className="text-gray-300">Materials</span> use shop rows with category{' '}
        <span className="text-amber-200/90">crafting_material</span>.
      </p>

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

      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4 md:p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">
          Saved recipes by class (in-game forge)
        </h3>
        <p className="text-[10px] text-gray-600 mb-3">
          Click a recipe to load it into the form below. A recipe is listed under a class if at least one outcome item
          has class <span className="text-gray-400">All</span> (or blank) or that exact class — same logic as the
          mobile forge class tabs.
        </p>
        {recipesLoading ? (
          <p className="text-xs text-gray-500">Loading recipes…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RPG_CLASSES.map((cls) => {
              const list = savedRecipes.filter((r) => recipeVisibleForClass(r, shopById, cls))
              return (
                <div key={cls} className="rounded-xl border border-gray-800/80 bg-black/30 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-400">{cls}</span>
                    <span className="text-[10px] text-gray-600">
                      {list.length} recipe{list.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="max-h-36 space-y-0.5 overflow-y-auto text-xs text-gray-300">
                    {list.length === 0 ? (
                      <li className="text-gray-600">—</li>
                    ) : (
                      list.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => handleRecipeClick(r)}
                            className="w-full truncate rounded-md px-1.5 py-1 text-left transition-colors hover:bg-amber-500/10 hover:text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                          >
                            <span className="text-gray-200">{r.recipe_name}</span>
                            <span className="text-gray-600"> · {r.gold_cost}g</span>
                            {!r.is_active ? (
                              <span className="ml-1 rounded bg-red-950/80 px-1 text-[9px] font-bold text-red-300">
                                inactive
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editingRecipeId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200/90">
          <span>
            Editing recipe <span className="font-mono text-amber-100">{editingRecipeId.slice(0, 8)}…</span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (builderMode === 'forge') resetForgeForm()
              else resetRefineForm()
            }}
            className="rounded-lg border border-gray-600 px-3 py-1 font-bold text-gray-300 hover:bg-gray-800"
          >
            Cancel edit
          </button>
        </div>
      ) : null}

      {builderMode === 'forge' ? (
        <form onSubmit={onSubmitForge} className="space-y-6 bg-gray-900/40 border border-gray-800 rounded-2xl p-4 md:p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <Hammer className="h-4 w-4 text-amber-400" aria-hidden />
            Forge — weighted outcomes
          </h3>
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
            {isSubmitting ? 'Saving…' : editingRecipeId ? 'Update recipe' : 'Save recipe'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={onSubmitRefine}
          className="space-y-6 bg-gray-900/40 border border-emerald-900/40 rounded-2xl p-4 md:p-6"
        >
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" aria-hidden />
            Refine — combine materials → one item
          </h3>
          <p className="text-[11px] text-gray-500">
            One output ({activeClass} tab + &quot;All&quot; items). In-game this still uses the same craft roll with a
            single outcome (weight {REFINE_OUTCOME_WEIGHT}).
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Recipe name</label>
            <input
              className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={refineRecipeName}
              onChange={(e) => setRefineRecipeName(e.target.value)}
              required
              placeholder="Refine Iron Chunks"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1">Gold cost (coins)</label>
            <input
              type="number"
              min={0}
              className="w-full max-w-xs bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={Number.isNaN(refineGoldCost) ? '' : refineGoldCost}
              onChange={(e) => setRefineGoldCost(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">Materials to combine</span>
              <button
                type="button"
                onClick={appendRefineIngredient}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
              >
                + Add material
              </button>
            </div>
            <div className="space-y-2">
              {refineIngredients.map((row, index) => (
                <div key={row.id} className="flex flex-wrap gap-2 items-end">
                  <ItemSearchPicker
                    options={materialOptions}
                    value={row.materialItemId}
                    placeholder="— Material —"
                    showRarity={false}
                    onChange={(v) => {
                      setRefineIngredients((prev) => {
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
                      setRefineIngredients((prev) => {
                        const next = [...prev]
                        next[index] = { ...next[index], quantity: v }
                        return next
                      })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRefineIngredient(index)}
                    className="text-xs text-red-400 font-bold px-2 py-2"
                    disabled={refineIngredients.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2 block">
              Refined output ({activeClass})
            </span>
            <ItemSearchPicker
              options={outcomeOptions}
              value={refineOutputItemId}
              placeholder="— Refined item —"
              showRarity
              onChange={setRefineOutputItemId}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-sm"
          >
            {isSubmitting ? 'Saving…' : editingRecipeId ? 'Update refine recipe' : 'Save refine recipe'}
          </button>
        </form>
      )}
    </section>
  )
}
