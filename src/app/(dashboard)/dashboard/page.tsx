import { createClient } from '@/lib/supabase/server'
import IncompleteHabits from './IncompleteHabits'
import TodayTutoringSchedule from './TodayTutoringSchedule'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: entries }, { data: habits }, { data: habitLogs }, { data: tutoringMoments }, { data: studySessions }, { data: studyTasks }] = await Promise.all([
    supabase.from('food_log').select('calories, protein, status').eq('date', today).eq('status', 'eaten'),
    supabase.from('habits').select('id, name'),
    supabase.from('habit_logs').select('habit_id, completed').eq('date', today).eq('completed', true),
    supabase
      .from('teaching_moments')
      .select('id, student_id, date, start_time, end_time, price, paid, payment_method, location_type, transfer_note, notes, student:students(name)')
      .eq('date', today)
      .order('start_time', { ascending: true }),
    supabase
      .from('study_task_sessions')
      .select('id, study_task_id, date, start_time, end_time, notes, task:study_tasks(title, status, course:courses(id, name, color, course_type))')
      .eq('date', today)
      .order('start_time', { ascending: true }),
    supabase
      .from('study_tasks')
      .select('id, title, status, course:courses(name, course_type)')
      .neq('status', 'done')
      .order('created_at', { ascending: true }),
  ])

  const totalCalories = entries?.reduce((sum, e) => sum + Number(e.calories), 0) ?? 0
  const totalProtein = entries?.reduce((sum, e) => sum + Number(e.protein), 0) ?? 0

  const completedIds = new Set((habitLogs ?? []).map((l) => l.habit_id))
  const incompleteHabits = (habits ?? []).filter((h) => !completedIds.has(h.id))
  const allDone = (habits ?? []).length > 0 && incompleteHabits.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start mb-6">
        <span className="font-bold text-gray-900 text-4xl">Home</span>
      </div>
      {/* Row 1: habits (1/3) + food stats (right) */}
      <div className="flex items-start gap-4">
        <div className="w-1/3">
          <IncompleteHabits habits={incompleteHabits} today={today} allDone={allDone} />
        </div>
        <div className="flex-1 flex justify-end">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-6">
            <span className="text-4xl">🍔</span>
            <div className="text-right">
              <p className="text-sm text-gray-500">Calories today</p>
              <p className="text-4xl font-bold text-gray-900">{Math.round(totalCalories)} <span className="text-sm font-normal text-gray-400">kcal</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Protein today</p>
              <p className="text-4xl font-bold text-gray-900">{Math.round(totalProtein)} <span className="text-sm font-normal text-gray-400">g</span></p>
            </div>
          </div>
        </div>
      </div>
      {/* Row 2: today's schedule + study tasks */}
      <div className="w-full lg:w-1/2">
        <TodayTutoringSchedule
          moments={(tutoringMoments ?? []) as any}
          sessions={(studySessions ?? []) as any}
          tasks={(studyTasks ?? []) as any}
          today={today}
        />
      </div>
    </div>
  )
}
