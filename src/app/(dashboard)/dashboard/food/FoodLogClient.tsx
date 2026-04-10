'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addFoodLogEntry, addRecipeToLog, deleteFoodLogEntry, rollupOldEntries, toggleFoodLogStatus } from './actions'
import type { DailySummary } from './page'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const
type Meal = (typeof MEALS)[number]

export type FoodItem = {
  id: string
  name: string
  calories: number
  protein: number
  unit: string
}

export type RecipeItem = {
  id: string
  name: string
  calories: number
  protein: number
  quantity: number
  unit: string
}

export type Recipe = {
  id: string
  name: string
  recipe_items: RecipeItem[]
}

export type FoodLogEntry = {
  id: string
  food_item_id: string | null
  name: string
  calories: number
  protein: number
  quantity: number
  unit: string
  meal: string
  status: string
  date: string
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function today() {
  return formatDate(new Date())
}

type Props = {
  date: string
  entries: FoodLogEntry[]
  foodItems: FoodItem[]
  recipes: Recipe[]
  archivedSummary: DailySummary | null
}

export default function FoodLogClient({ date, entries, foodItems, recipes, archivedSummary }: Props) {
  const router = useRouter()
  const todayStr = today()
  const isFuture = date > todayStr
  const defaultStatus: 'planned' | 'eaten' = isFuture ? 'planned' : 'eaten'
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [archivedCount, setArchivedCount] = useState<number | null>(null)
  const [addMode, setAddMode] = useState<'item' | 'recipe'>('item')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [meal, setMeal] = useState<Meal>('breakfast')
  const [status, setStatus] = useState<'planned' | 'eaten'>(defaultStatus)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  const selectedItem = foodItems.find((f) => f.id === selectedItemId) ?? null
  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null
  const qty = parseFloat(quantity) || 0
  const computedCalories = selectedItem ? Math.round(selectedItem.calories * qty) : 0
  const computedProtein = selectedItem ? parseFloat((selectedItem.protein * qty).toFixed(1)) : 0
  const recipeCalories = selectedRecipe ? Math.round(selectedRecipe.recipe_items.reduce((s, i) => s + Number(i.calories), 0)) : 0
  const recipeProtein = selectedRecipe ? parseFloat(selectedRecipe.recipe_items.reduce((s, i) => s + Number(i.protein), 0).toFixed(1)) : 0

  const eaten = entries.filter((e) => e.status === 'eaten')
  const eatenCalories = Math.round(eaten.reduce((s, e) => s + Number(e.calories), 0))
  const eatenProtein = parseFloat(eaten.reduce((s, e) => s + Number(e.protein), 0).toFixed(1))
  const totalCalories = Math.round(entries.reduce((s, e) => s + Number(e.calories), 0))
  const totalProtein = parseFloat(entries.reduce((s, e) => s + Number(e.protein), 0).toFixed(1))

  const selectedEntry = selectedEntryId ? (entries.find((e) => e.id === selectedEntryId) ?? null) : null
  const detailRecipe = selectedEntry ? (recipes.find((r) => r.name === selectedEntry.name) ?? null) : null

  function changeDate(newDate: string) {
    router.push(`/dashboard/food?date=${newDate}`)
  }

  function prevDay() {
    const [y, m, d] = date.split('-').map(Number)
    changeDate(formatDate(new Date(y, m - 1, d - 1)))
  }

  function nextDay() {
    const [y, m, d] = date.split('-').map(Number)
    changeDate(formatDate(new Date(y, m - 1, d + 1)))
  }

  function resetForm() {
    setAddMode('item')
    setSelectedItemId('')
    setSelectedRecipeId('')
    setQuantity('1')
    setMeal('breakfast')
    setStatus(defaultStatus)
    setShowForm(false)
  }

  async function handleAdd() {
    if (addMode === 'item') {
      if (!selectedItem || qty <= 0) return
      startTransition(async () => {
        await addFoodLogEntry({
          food_item_id: selectedItem.id,
          name: selectedItem.name,
          calories: computedCalories,
          protein: computedProtein,
          quantity: qty,
          unit: selectedItem.unit,
          meal,
          status,
          date,
        })
        resetForm()
        router.refresh()
      })
    } else {
      if (!selectedRecipe) return
      startTransition(async () => {
        await addRecipeToLog(
          { id: selectedRecipe.id, name: selectedRecipe.name, totalCalories: recipeCalories, totalProtein: recipeProtein },
          meal,
          status,
          date
        )
        resetForm()
        router.refresh()
      })
    }
  }

  async function handleToggle(entry: FoodLogEntry) {
    startTransition(async () => {
      await toggleFoodLogStatus(entry.id, entry.status)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFoodLogEntry(id)
      router.refresh()
    })
  }

  async function handleArchive() {
    startTransition(async () => {
      const result = await rollupOldEntries(7)
      setArchivedCount(result.count)
      router.refresh()
    })
  }

  const isToday = date === today()
  const [y, m, d] = date.split('-').map(Number)
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  function EntryRow({ entry }: { entry: FoodLogEntry }) {
    const isEaten = entry.status === 'eaten'
    const isRecipe = entry.unit === 'recipe'
    const isSelected = selectedEntryId === entry.id
    const rowRecipe = isSelected ? detailRecipe : null
    return (
      <div className={`border rounded-xl overflow-hidden transition-colors ${
        isSelected ? 'border-gray-900' : isEaten ? 'border-gray-200' : 'border-dashed border-gray-300'
      }`}>
        <div
          onClick={isRecipe ? () => setSelectedEntryId(isSelected ? null : entry.id) : undefined}
          className={`flex items-center gap-3 px-4 py-3 group transition-colors ${
            isRecipe ? 'cursor-pointer' : ''
          } ${!isEaten && !isSelected ? 'bg-gray-50' : ''}`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(entry) }}
            disabled={isPending}
            title={isEaten ? 'Mark as planned' : 'Mark as eaten'}
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              isEaten
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {isEaten && <span className="text-[10px] leading-none">&#10003;</span>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isEaten ? 'text-gray-900' : 'text-gray-500'}`}>
              {entry.name}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {entry.quantity} {entry.unit} &middot; {entry.meal}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-sm ${isEaten ? 'text-gray-700' : 'text-gray-400'}`}>
              {Math.round(Number(entry.calories))} kcal
            </p>
            <p className="text-xs text-gray-400">{Number(entry.protein).toFixed(1)}g protein</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
            disabled={isPending}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-colors text-xs ml-1 shrink-0"
            aria-label="Delete"
          >
            &#10005;
          </button>
        </div>
        {isSelected && rowRecipe && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
            {rowRecipe.recipe_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.quantity} {item.unit}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{Math.round(Number(item.calories))} kcal</p>
                  <p className="text-xs text-gray-400">{Number(item.protein).toFixed(1)}g</p>
                </div>
              </div>
            ))}
            {rowRecipe.recipe_items.length > 0 && (
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-xs text-gray-400">Total</span>
                <span className="text-xs text-gray-700 font-medium">
                  {Math.round(rowRecipe.recipe_items.reduce((s, i) => s + Number(i.calories), 0))} kcal
                  &nbsp;&middot;&nbsp;
                  {parseFloat(rowRecipe.recipe_items.reduce((s, i) => s + Number(i.protein), 0).toFixed(1))}g
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Food</h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleArchive}
            disabled={isPending}
            title="Archive eaten entries older than 7 days into daily totals"
            className="text-sm text-gray-400 hover:text-gray-700 underline underline-offset-2 disabled:opacity-40"
          >
            Archive old entries
          </button>
          {archivedCount !== null && (
            <span className="text-xs text-gray-400">
              {archivedCount === 0 ? 'Nothing to archive' : `Archived ${archivedCount} day${archivedCount !== 1 ? 's' : ''}`}
            </span>
          )}
          <a href="/dashboard/food/recipes" className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2">Recipes</a>
          <a href="/dashboard/food/items" className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2">Food library</a>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={prevDay}
          className="px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
        >
          &larr;
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => changeDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={nextDay}
          className="px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
        >
          &rarr;
        </button>
        {isToday && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Today</span>
        )}
        {!isToday && (
          <button
            onClick={() => changeDate(today())}
            className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
          >
            Go to today
          </button>
        )}
      </div>

      {/* Totals */}
      {(() => {
        const isArchived = archivedSummary !== null && entries.length === 0
        return (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Calories */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {isArchived ? 'Calories eaten (archived)' : 'Calories eaten'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isArchived ? archivedSummary.total_calories : eatenCalories}{' '}
                  <span className="text-sm font-normal text-gray-400">kcal</span>
                </p>
              </div>
              {!isArchived && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-1">Planned total</p>
                  <p className="text-lg font-medium text-gray-400">{totalCalories} <span className="text-sm font-normal">kcal</span></p>
                </div>
              )}
            </div>
            {/* Protein */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {isArchived ? 'Protein eaten (archived)' : 'Protein eaten'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isArchived ? archivedSummary.total_protein : eatenProtein}{' '}
                  <span className="text-sm font-normal text-gray-400">g</span>
                </p>
              </div>
              {!isArchived && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-1">Planned total</p>
                  <p className="text-lg font-medium text-gray-400">{totalProtein} <span className="text-sm font-normal">g</span></p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Entries grouped by meal */}
      {entries.length > 0 && (
        <div className="space-y-5 mb-4">
          {(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const).map((mealGroup) => {
            const group = entries.filter((e) => e.meal === mealGroup)
            if (group.length === 0) return null
            const groupLabel = mealGroup.charAt(0).toUpperCase() + mealGroup.slice(1)
            return (
              <div key={mealGroup}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                  {groupLabel}
                </p>
                <div className="space-y-1.5">
                  {group.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div className="text-center py-10 text-gray-400 mb-4">
          {archivedSummary ? (
            <p className="text-sm">This day has been archived. Only the totals are kept.</p>
          ) : (
            <p className="text-sm">No food logged for {isToday ? 'today' : displayDate}.</p>
          )}
        </div>
      )}

      {/* Add entry form */}
      {showForm ? (
        <div className="border border-gray-200 rounded-xl p-4 mb-4">
          <div className="space-y-3">
            {/* Food item vs Recipe toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 w-fit">
              <button type="button" onClick={() => setAddMode('item')}
                className={`px-4 py-1.5 text-sm transition-colors ${addMode === 'item' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                Food item
              </button>
              <button type="button" onClick={() => setAddMode('recipe')}
                className={`px-4 py-1.5 text-sm transition-colors ${addMode === 'recipe' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                Recipe
              </button>
            </div>

            {addMode === 'item' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Food item</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Select a food item&hellip;</option>
                    {foodItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} &mdash; {item.calories} kcal / {item.unit}
                      </option>
                    ))}
                  </select>
                  {foodItems.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      No items yet. <a href="/dashboard/food/items" className="underline">Add some first.</a>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity{selectedItem ? ` (\u00d7 ${selectedItem.unit})` : ''}
                    </label>
                    <input type="number" min="0" step="any" value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Meal</label>
                    <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      {MEALS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                {selectedItem && qty > 0 && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    Total: <strong>{computedCalories} kcal</strong> &middot; <strong>{computedProtein}g</strong> protein
                  </p>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recipe</label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Select a recipe&hellip;</option>
                    {recipes.map((r) => {
                      const cal = Math.round(r.recipe_items.reduce((s, i) => s + Number(i.calories), 0))
                      return (
                        <option key={r.id} value={r.id}>
                          {r.name} &mdash; {cal} kcal
                        </option>
                      )
                    })}
                  </select>
                  {recipes.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      No recipes yet. <a href="/dashboard/food/recipes" className="underline">Create one first.</a>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meal</label>
                  <select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {MEALS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
                {selectedRecipe && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    {selectedRecipe.recipe_items.length} ingredient{selectedRecipe.recipe_items.length !== 1 ? 's' : ''} &middot;{' '}
                    <strong>{recipeCalories} kcal</strong> &middot; <strong>{recipeProtein}g</strong> protein
                  </p>
                )}
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 w-fit">
                <button
                  type="button"
                  onClick={() => setStatus('eaten')}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    status === 'eaten' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Eaten
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('planned')}
                  className={`px-4 py-1.5 text-sm transition-colors ${
                    status === 'planned' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Planned
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={(addMode === 'item' ? (!selectedItem || qty <= 0) : !selectedRecipeId) || isPending}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                Add
              </button>
              <button
                onClick={resetForm}
                className="text-sm px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + Add food
        </button>
      )}
    </div>
  )
}
