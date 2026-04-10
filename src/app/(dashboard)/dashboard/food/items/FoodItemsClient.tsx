'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addFoodItem, deleteFoodItem, updateFoodItem } from '../actions'
import { FOOD_TYPES } from '../FoodLogClient'
import type { FoodItem } from '../FoodLogClient'

export default function FoodItemsClient({ items }: { items: FoodItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [foodType, setFoodType] = useState<string>('other')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [unit, setUnit] = useState('100g')

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editFoodType, setEditFoodType] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editUnit, setEditUnit] = useState('')

  function openEdit(item: FoodItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditFoodType(item.food_type || 'other')
    setEditCalories(String(item.calories))
    setEditProtein(String(item.protein))
    setEditUnit(item.unit)
  }

  function closeEdit() {
    setEditingId(null)
  }

  async function handleUpdate() {
    if (!editingId || !editName || !editCalories || !editProtein) return
    startTransition(async () => {
      await updateFoodItem(editingId, {
        name: editName.trim(),
        food_type: editFoodType,
        calories: parseFloat(editCalories),
        protein: parseFloat(editProtein),
        unit: editUnit.trim() || '100g',
      })
      closeEdit()
      router.refresh()
    })
  }

  function resetForm() {
    setName('')
    setFoodType('other')
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
        food_type: foodType,
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
        <div className="space-y-5 mb-4">
          {FOOD_TYPES.filter((t) => items.some((i) => (i.food_type || 'other') === t)).map((type) => (
            <div key={type}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </p>
              <div className="space-y-1">
                {items.filter((i) => (i.food_type || 'other') === type).map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-xl overflow-hidden transition-colors ${editingId === item.id ? 'border-gray-900' : 'border-gray-200'}`}
                  >
                    {editingId === item.id ? (
                      <div className="px-4 py-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                            <select value={editFoodType} onChange={(e) => setEditFoodType(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900">
                              {FOOD_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Calories (kcal)</label>
                            <input type="number" min="0" step="any" value={editCalories} onChange={(e) => setEditCalories(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Protein (g)</label>
                            <input type="number" min="0" step="any" value={editProtein} onChange={(e) => setEditProtein(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Per unit</label>
                            <input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleUpdate} disabled={!editName || !editCalories || !editProtein || isPending}
                            className="bg-gray-900 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40">
                            Save
                          </button>
                          <button onClick={closeEdit}
                            className="text-sm px-4 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => { closeEdit(); handleDelete(item.id) }} disabled={isPending}
                            className="ml-auto text-sm px-3 py-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => openEdit(item)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-400">per {item.unit}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-gray-700">{item.calories} kcal</p>
                          <p className="text-xs text-gray-400">{item.protein}g protein</p>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 text-gray-300 text-xs ml-1 shrink-0">&#9998;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {FOOD_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
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

