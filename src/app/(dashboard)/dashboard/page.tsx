import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('food_log')
    .select('calories, protein, status')
    .eq('date', today)
    .eq('status', 'eaten')

  const totalCalories = entries?.reduce((sum, e) => sum + Number(e.calories), 0) ?? 0
  const totalProtein = entries?.reduce((sum, e) => sum + Number(e.protein), 0) ?? 0

  return (
    <div className="flex justify-end">
      <div className="flex flex-col gap-2">
        <div className="bg-white rounded-2xl p-6 shadow-sm text-right">
          <p className="text-sm text-gray-500">Calories today</p>
          <p className="text-4xl font-bold text-gray-900">{Math.round(totalCalories)} <span className="text-sm font-normal text-gray-400">kcal</span></p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm text-right">
          <p className="text-sm text-gray-500">Protein today</p>
          <p className="text-4xl font-bold text-gray-900">{Math.round(totalProtein)} <span className="text-sm font-normal text-gray-400">g</span></p>
        </div>
      </div>
    </div>
  )
}
