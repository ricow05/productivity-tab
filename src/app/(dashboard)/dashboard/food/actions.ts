'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Food Library ----

export async function addFoodItem(data: {
  name: string
  calories: number
  protein: number
  unit: string
}) {
  const supabase = await createClient()
  await supabase.from('food_items').insert(data)
  revalidatePath('/dashboard/food/items')
}

export async function deleteFoodItem(id: string) {
  const supabase = await createClient()
  await supabase.from('food_items').delete().eq('id', id)
  revalidatePath('/dashboard/food/items')
}

// ---- Food Log ----

export async function addFoodLogEntry(data: {
  food_item_id: string
  name: string
  calories: number
  protein: number
  quantity: number
  unit: string
  meal: string
  status: string
  date: string
}) {
  const supabase = await createClient()
  await supabase.from('food_log').insert(data)
  revalidatePath('/dashboard/food')
}

export async function toggleFoodLogStatus(id: string, current: string) {
  const supabase = await createClient()
  await supabase
    .from('food_log')
    .update({ status: current === 'eaten' ? 'planned' : 'eaten' })
    .eq('id', id)
  revalidatePath('/dashboard/food')
}

export async function deleteFoodLogEntry(id: string) {
  const supabase = await createClient()
  await supabase.from('food_log').delete().eq('id', id)
  revalidatePath('/dashboard/food')
}

// ---- Recipes ----

export async function addRecipe(name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recipes')
    .insert({ name })
    .select('id')
    .single()
  revalidatePath('/dashboard/food/recipes')
  if (error) throw error
  return data.id as string
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient()
  await supabase.from('recipes').delete().eq('id', id)
  revalidatePath('/dashboard/food/recipes')
}

export async function addRecipeItem(data: {
  recipe_id: string
  food_item_id: string
  name: string
  calories: number
  protein: number
  quantity: number
  unit: string
}) {
  const supabase = await createClient()
  await supabase.from('recipe_items').insert(data)
  revalidatePath('/dashboard/food/recipes')
}

export async function deleteRecipeItem(id: string) {
  const supabase = await createClient()
  await supabase.from('recipe_items').delete().eq('id', id)
  revalidatePath('/dashboard/food/recipes')
}

export async function addRecipeToLog(
  recipe: { id: string; name: string; totalCalories: number; totalProtein: number },
  meal: string,
  status: string,
  date: string
) {
  const supabase = await createClient()
  await supabase.from('food_log').insert({
    food_item_id: null,
    name: recipe.name,
    calories: recipe.totalCalories,
    protein: recipe.totalProtein,
    quantity: 1,
    unit: 'recipe',
    meal,
    status,
    date,
  })
  revalidatePath('/dashboard/food')
}

// ---- Archive ----

export async function rollupOldEntries(daysToKeep: number = 7) {
  const supabase = await createClient()

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  const cutoff = cutoffDate.toISOString().split('T')[0]

  // Fetch all eaten entries older than the cutoff
  const { data: oldEntries } = await supabase
    .from('food_log')
    .select('date, calories, protein')
    .eq('status', 'eaten')
    .lt('date', cutoff)

  if (!oldEntries || oldEntries.length === 0) return { count: 0 }

  // Aggregate by date
  const byDate: Record<string, { calories: number; protein: number }> = {}
  for (const entry of oldEntries) {
    if (!byDate[entry.date]) byDate[entry.date] = { calories: 0, protein: 0 }
    byDate[entry.date].calories += Number(entry.calories)
    byDate[entry.date].protein += Number(entry.protein)
  }

  const dates = Object.keys(byDate)

  // Upsert one summary row per date
  await supabase.from('daily_summaries').upsert(
    dates.map((date) => ({
      date,
      total_calories: Math.round(byDate[date].calories),
      total_protein: parseFloat(byDate[date].protein.toFixed(1)),
    })),
    { onConflict: 'date' }
  )

  // Delete ALL log entries (eaten + planned) for those dates
  await supabase.from('food_log').delete().lt('date', cutoff)

  revalidatePath('/dashboard/food')
  return { count: dates.length }
}
