'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addRecipe, deleteRecipe, addRecipeItem, deleteRecipeItem } from '../actions'
import type { FoodItem } from '../FoodLogClient'

export type RecipeItem = {
  id: string
  food_item_id: string | null
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

type Props = {
  recipes: Recipe[]
  foodItems: FoodItem[]
}

export default function RecipesClient({ recipes, foodItems }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewRecipe, setShowNewRecipe] = useState(false)
  const [newRecipeName, setNewRecipeName] = useState('')
  // per-recipe add ingredient form state
  const [addingToRecipeId, setAddingToRecipeId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const selectedItem = foodItems.find((f) => f.id === selectedItemId) ?? null
  const qty = parseFloat(quantity) || 0
  const computedCalories = selectedItem ? Math.round(selectedItem.calories * qty) : 0
  const computedProtein = selectedItem ? parseFloat((selectedItem.protein * qty).toFixed(1)) : 0

  function resetIngredientForm() {
    setSelectedItemId('')
    setQuantity('1')
    setAddingToRecipeId(null)
  }

  async function handleAddRecipe() {
    if (!newRecipeName.trim()) return
    startTransition(async () => {
      const id = await addRecipe(newRecipeName.trim())
      setNewRecipeName('')
      setShowNewRecipe(false)
      setExpandedId(id)
      router.refresh()
    })
  }

  async function handleDeleteRecipe(id: string) {
    startTransition(async () => {
      await deleteRecipe(id)
      if (expandedId === id) setExpandedId(null)
      router.refresh()
    })
  }

  async function handleAddIngredient(recipeId: string) {
    if (!selectedItem || qty <= 0) return
    startTransition(async () => {
      await addRecipeItem({
        recipe_id: recipeId,
        food_item_id: selectedItem.id,
        name: selectedItem.name,
        calories: computedCalories,
        protein: computedProtein,
        quantity: qty,
        unit: selectedItem.unit,
      })
      resetIngredientForm()
      router.refresh()
    })
  }

  async function handleDeleteIngredient(id: string) {
    startTransition(async () => {
      await deleteRecipeItem(id)
      router.refresh()
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Recipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build meals from your food library</p>
        </div>
        <a
          href="/dashboard/food"
          className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2"
        >
          &larr; Back to log
        </a>
      </div>

      {/* Recipe list */}
      {recipes.length > 0 && (
        <div className="space-y-2 mb-4">
          {recipes.map((recipe) => {
            const isExpanded = expandedId === recipe.id
            const totalCal = Math.round(recipe.recipe_items.reduce((s, i) => s + Number(i.calories), 0))
            const totalProt = parseFloat(recipe.recipe_items.reduce((s, i) => s + Number(i.protein), 0).toFixed(1))

            return (
              <div key={recipe.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Recipe header */}
                <div className="flex items-center gap-3 px-4 py-3 group">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <span className="text-xs text-gray-400 transition-transform">{isExpanded ? '&#9660;' : '&#9654;'}</span>
                    <span className="text-sm font-medium text-gray-900">{recipe.name}</span>
                    <span className="text-xs text-gray-400 ml-1">
                      {recipe.recipe_items.length} item{recipe.recipe_items.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <div className="text-right shrink-0">
                    <span className="text-sm text-gray-700">{totalCal} kcal</span>
                    <span className="text-xs text-gray-400 ml-2">{totalProt}g protein</span>
                  </div>
                  <button
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-colors text-xs ml-1 shrink-0"
                    aria-label="Delete recipe"
                  >
                    &#10005;
                  </button>
                </div>

                {/* Expanded ingredients */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
                    {recipe.recipe_items.length === 0 && (
                      <p className="text-xs text-gray-400 py-1">No ingredients yet.</p>
                    )}
                    {recipe.recipe_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group/item">
                        <span className="flex-1 text-sm text-gray-700 truncate">
                          {item.name}
                          <span className="text-xs text-gray-400 ml-1">
                            &middot; {item.quantity} {item.unit}
                          </span>
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {Math.round(Number(item.calories))} kcal &middot; {Number(item.protein).toFixed(1)}g
                        </span>
                        <button
                          onClick={() => handleDeleteIngredient(item.id)}
                          disabled={isPending}
                          className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0"
                          aria-label="Remove ingredient"
                        >
                          &#10005;
                        </button>
                      </div>
                    ))}

                    {/* Add ingredient form */}
                    {addingToRecipeId === recipe.id ? (
                      <div className="pt-2 space-y-2">
                        <select
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                        >
                          <option value="">Select food item&hellip;</option>
                          {foodItems.map((fi) => (
                            <option key={fi.id} value={fi.id}>
                              {fi.name} &mdash; {fi.calories} kcal / {fi.unit}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder={selectedItem ? `qty (\u00d7 ${selectedItem.unit})` : 'quantity'}
                            className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                          />
                          {selectedItem && qty > 0 && (
                            <span className="text-xs text-gray-400">
                              {computedCalories} kcal &middot; {computedProtein}g
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddIngredient(recipe.id)}
                            disabled={!selectedItem || qty <= 0 || isPending}
                            className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
                          >
                            Add
                          </button>
                          <button
                            onClick={resetIngredientForm}
                            className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingToRecipeId(recipe.id); setSelectedItemId(''); setQuantity('1') }}
                        className="text-xs text-gray-400 hover:text-gray-700 pt-1 transition-colors"
                      >
                        + Add ingredient
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {recipes.length === 0 && !showNewRecipe && (
        <div className="text-center py-10 text-gray-400 mb-4">
          <p className="text-sm">No recipes yet. Create your first one below.</p>
        </div>
      )}

      {/* New recipe form */}
      {showNewRecipe ? (
        <div className="border border-gray-200 rounded-xl p-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Recipe name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRecipeName}
              onChange={(e) => setNewRecipeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRecipe()}
              placeholder="e.g. Chicken & rice bowl"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              autoFocus
            />
            <button
              onClick={handleAddRecipe}
              disabled={!newRecipeName.trim() || isPending}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              Create
            </button>
            <button
              onClick={() => { setShowNewRecipe(false); setNewRecipeName('') }}
              className="text-sm px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewRecipe(true)}
          className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          + New recipe
        </button>
      )}
    </div>
  )
}
