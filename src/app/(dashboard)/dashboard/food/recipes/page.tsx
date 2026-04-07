import { createClient } from '@/lib/supabase/server'
import RecipesClient, { type Recipe } from './RecipesClient'
import type { FoodItem } from '../FoodLogClient'

export default async function RecipesPage() {
  const supabase = await createClient()
  const [{ data: recipes }, { data: foodItems }] = await Promise.all([
    supabase
      .from('recipes')
      .select('id, name, created_at, recipe_items(id, food_item_id, name, calories, protein, quantity, unit)')
      .order('created_at', { ascending: true }),
    supabase.from('food_items').select('*').order('name', { ascending: true }),
  ])

  return (
    <RecipesClient
      recipes={(recipes ?? []) as Recipe[]}
      foodItems={(foodItems ?? []) as FoodItem[]}
    />
  )
}
