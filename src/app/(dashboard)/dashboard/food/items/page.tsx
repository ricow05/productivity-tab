import { createClient } from '@/lib/supabase/server'
import FoodItemsClient from './FoodItemsClient'
import type { FoodItem } from '../FoodLogClient'

export default async function FoodItemsPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('food_items')
    .select('*')
    .order('name', { ascending: true })

  return <FoodItemsClient items={(items ?? []) as FoodItem[]} />
}
