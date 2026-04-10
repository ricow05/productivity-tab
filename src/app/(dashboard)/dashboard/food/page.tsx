import { createClient } from '@/lib/supabase/server'
import FoodLogClient, { type FoodItem, type FoodLogEntry, type Recipe } from './FoodLogClient'

export type DailySummary = {
  date: string
  total_calories: number
  total_protein: number
}

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const date = dateParam ?? new Date().toISOString().split('T')[0]

  const supabase = await createClient()
  const [{ data: entries }, { data: foodItems }, { data: recipes }, { data: archivedSummary }] = await Promise.all([
    supabase.from('food_log').select('*').eq('date', date).order('created_at', { ascending: true }),
    supabase.from('food_items').select('*').order('name', { ascending: true }),
    supabase.from('recipes').select('id, name, recipe_items(id, food_item_id, name, calories, protein, quantity, unit)').order('name', { ascending: true }),
    supabase.from('daily_summaries').select('date, total_calories, total_protein').eq('date', date).maybeSingle(),
  ])

  return (
    <FoodLogClient
      date={date}
      entries={(entries ?? []) as FoodLogEntry[]}
      foodItems={(foodItems ?? []) as FoodItem[]}
      recipes={(recipes ?? []) as Recipe[]}
      archivedSummary={(archivedSummary ?? null) as DailySummary | null}
    />
  )
}
