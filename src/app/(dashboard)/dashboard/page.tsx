import { createClient } from '@/lib/supabase/server'
import IncompleteHabits from './IncompleteHabits'
import TodayStudyTasks from './TodayStudyTasks'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: entries }, { data: habits }, { data: habitLogs }, { data: studyTasks }, { data: blockTasks }] = await Promise.all([
    supabase.from('food_log').select('calories, protein, status').eq('date', today).eq('status', 'eaten'),
    supabase.from('habits').select('id, name'),
    supabase.from('habit_logs').select('habit_id, completed').eq('date', today).eq('completed', true),
    // Tasks due on or before today, not done
    supabase
      .from('study_tasks')
      .select('id, title, status, due_date, due_date_end, course:courses(id, name, color)')
      .neq('status', 'done')
      .not('due_date', 'is', null)
      .lte('due_date', today),
    supabase.from('study_block_tasks').select('study_task_id, study_blocks(duration_minutes)'),
  ])

  const totalCalories = entries?.reduce((sum, e) => sum + Number(e.calories), 0) ?? 0
  const totalProtein = entries?.reduce((sum, e) => sum + Number(e.protein), 0) ?? 0

  const taskMinutes: Record<string, number> = {}
  for (const bt of blockTasks ?? []) {
    const block = (bt.study_blocks as unknown as { duration_minutes: number } | null)
    if (!block) continue
    taskMinutes[bt.study_task_id] = (taskMinutes[bt.study_task_id] ?? 0) + block.duration_minutes
  }

  const completedIds = new Set((habitLogs ?? []).map((l) => l.habit_id))
  const incompleteHabits = (habits ?? []).filter((h) => !completedIds.has(h.id))
  const allDone = (habits ?? []).length > 0 && incompleteHabits.length === 0

  type TaskRow = {
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'done'
    due_date: string | null
    due_date_end: string | null
    course: { id: string; name: string; color: string }
  }

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
      {/* Row 2: study tasks (2/3) */}
      <div className="w-2/3">
        <TodayStudyTasks tasks={(studyTasks ?? []) as unknown as TaskRow[]} today={today} taskMinutes={taskMinutes} />
      </div>
    </div>
  )
}
