'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addFoodItem, deleteFoodItem } from '../actions'

export type FoodItem = {
  id: string
  name: string
  calories: number
  protein: number
  unit: string
}

export default function FoodItemsClient({ items }: { items: FoodItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [unit, setUnit] = useState('100g')

  function resetForm() {
    setName('')
    setCalories('')
    setProtein('')
    setUnit('100g')
    setShowForm(false)
  }

  async function handleAdd() {
    if (!name || !calories || !protein) return
    startTransition(async () => {
      await addFoodItem({
        name: name.trim(),
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        unit: unit.trim() || '100g',
      })
      resetForm()
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFoodItem(id)
      router.refresh()
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Food library</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calories and protein per unit</p>
        </div>
        <a
          href="/dashboard/food"
          className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          ← Back to log
        </a>
      </div>

      {items.length === 0 && !showForm && (
        <div className="text-center py-10 text-gray-400 mb-4">
          <p className="text-sm">No food items yet. Add your first one below.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-1 mb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-400">per {item.unit}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-gray-700">{item.calories} kcal</p>
                <p className="text-xs text-gray-400">{item.protein}g protein</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-colors text-xs ml-1 shrink-0"
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken breast, Oats, Banana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g. 165"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="e.g. 31"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Per unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="100g, item, cup…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Example: Chicken breast — 165 kcal, 31g protein per 100g. When logging, enter
              quantity as multiples of this unit (e.g. 1.5 for 150g).
            </p>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={!name || !calories || !protein || isPending}
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                Save
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
          + Add food item
        </button>
      )}
    </div>
  )
}

