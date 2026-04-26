import { createClient } from '@/lib/supabase/server'
import IncompleteHabits from './IncompleteHabits'
import TodayTutoringSchedule from './TodayTutoringSchedule'

type DeadlineTask = {
  id: string
  title: string
  hard_deadline: string | null
  course: { name: string; course_type?: 'school' | 'side_project' } | { name: string; course_type?: 'school' | 'side_project' }[] | null
}

function getCourseLabel(course: DeadlineTask['course']) {
  if (!course) return 'Study'
  const value = Array.isArray(course) ? course[0] : course
  if (!value) return 'Study'
  return value.course_type === 'side_project' ? `${value.name} · Side project` : `${value.name} · School`
}

function formatDeadline(deadlineAt: Date) {
  const now = new Date()
  const isToday = deadlineAt.toDateString() === now.toDateString()

  if (isToday) {
    return `Today ${deadlineAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return deadlineAt.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDeadlineBlockTone(deadlineAt: Date, now: Date) {
  const msUntilDeadline = deadlineAt.getTime() - now.getTime()
  const oneDayMs = 24 * 60 * 60 * 1000
  const threeDaysMs = 3 * oneDayMs

  if (msUntilDeadline <= oneDayMs) {
    return {
      container: 'bg-red-50 border-red-200',
      title: 'text-red-900',
      meta: 'text-red-700',
      deadline: 'text-red-700',
    }
  }

  if (msUntilDeadline <= threeDaysMs) {
    return {
      container: 'bg-orange-50 border-orange-200',
      title: 'text-orange-900',
      meta: 'text-orange-700',
      deadline: 'text-orange-700',
    }
  }

  return {
    container: 'bg-white border-gray-200',
    title: 'text-gray-900',
    meta: 'text-gray-500',
    deadline: 'text-rose-600',
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().split('T')[0]

  const [{ data: entries }, { data: habits }, { data: habitLogs }, { data: tutoringMoments }, { data: studySessions }, { data: studyTasks }] = await Promise.all([
    supabase.from('food_log').select('calories, protein, status').eq('date', today).eq('status', 'eaten'),
    supabase.from('habits').select('id, name'),
    supabase.from('habit_logs').select('habit_id, completed').eq('date', today).eq('completed', true),
    supabase
      .from('teaching_moments')
      .select('id, student_id, date, start_time, end_time, price, paid, payment_method, location_type, transfer_note, notes, student:students(name)')
      .in('date', [today, tomorrow])
      .order('start_time', { ascending: true }),
    supabase
      .from('study_task_sessions')
      .select('id, study_task_id, date, start_time, end_time, notes, task:study_tasks(title, status, course:courses(id, name, color, course_type))')
      .in('date', [today, tomorrow])
      .order('start_time', { ascending: true }),
    supabase
      .from('study_tasks')
      .select('id, title, status, hard_deadline, course:courses(name, course_type)')
      .neq('status', 'done')
      .order('created_at', { ascending: true }),
  ])

  const totalCalories = entries?.reduce((sum, e) => sum + Number(e.calories), 0) ?? 0
  const totalProtein = entries?.reduce((sum, e) => sum + Number(e.protein), 0) ?? 0

  const completedIds = new Set((habitLogs ?? []).map((l) => l.habit_id))
  const incompleteHabits = (habits ?? []).filter((h) => !completedIds.has(h.id))
  const allDone = (habits ?? []).length > 0 && incompleteHabits.length === 0

  const now = new Date()
  const upcomingDeadlines = ((studyTasks ?? []) as DeadlineTask[])
    .map((task) => {
      if (!task.hard_deadline) return null

      const deadlineAt = new Date(task.hard_deadline)
      if (Number.isNaN(deadlineAt.getTime())) return null
      if (deadlineAt < now) return null

      return {
        id: task.id,
        title: task.title,
        courseLabel: getCourseLabel(task.course),
        deadlineAt,
      }
    })
    .filter((item): item is { id: string; title: string; courseLabel: string; deadlineAt: Date } => item !== null)
    .sort((left, right) => left.deadlineAt.getTime() - right.deadlineAt.getTime())
    .slice(0, 3)

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
      {/* Row 2: upcoming deadlines + today's schedule */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="bg-white rounded-2xl p-5 shadow-sm xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-500">Upcoming deadlines</p>
            <span className="text-xs text-gray-400">Next 3</span>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming deadlines.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingDeadlines.map((item) => {
                const tone = getDeadlineBlockTone(item.deadlineAt, now)

                return (
                  <li key={item.id} className={`rounded-xl border px-3 py-2 ${tone.container}`}>
                    <p className={`text-sm font-medium truncate ${tone.title}`}>{item.title}</p>
                    <p className={`text-xs mt-0.5 ${tone.meta}`}>{item.courseLabel}</p>
                    <p className={`text-xs mt-1 ${tone.deadline}`}>
                      Hard deadline: {formatDeadline(item.deadlineAt)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="xl:col-span-2">
          <TodayTutoringSchedule
            moments={(tutoringMoments ?? []) as any}
            sessions={(studySessions ?? []) as any}
            tasks={(studyTasks ?? []) as any}
            today={today}
            tomorrow={tomorrow}
          />
        </div>
      </div>
    </div>
  )
}
