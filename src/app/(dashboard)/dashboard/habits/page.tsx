import { createClient } from '@/lib/supabase/server'
import HabitsClient, { type Habit, type HabitLog } from './HabitsClient'

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const date = dateParam ?? new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  // Fetch all habits that are active on the selected date:
  // - lifetime habits whose start_date <= date
  // - timed habits whose start_date <= date AND end_date >= date
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .lte('start_date', date)
    .or(`type.eq.lifetime,and(type.eq.timed,end_date.gte.${date})`)
    .order('created_at', { ascending: true })

  // Fetch logs for those habits on this date
  const habitIds = (habits ?? []).map((h: Habit) => h.id)
  const { data: logs } =
    habitIds.length > 0
      ? await supabase.from('habit_logs').select('habit_id, date, completed').in('habit_id', habitIds).eq('date', date)
      : { data: [] }

  return (
    <HabitsClient
      date={date}
      habits={(habits ?? []) as Habit[]}
      logs={(logs ?? []) as HabitLog[]}
    />
  )
}
