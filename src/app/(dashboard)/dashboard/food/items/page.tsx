import { createClient } from '@/lib/supabase/server'
import FoodItemsClient, { type FoodItem } from './FoodItemsClient'

export default async function FoodItemsPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('food_items')
    .select('*')
    .order('name', { ascending: true })

  return <FoodItemsClient items={(items ?? []) as FoodItem[]} />
}
