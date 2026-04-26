import { createClient } from '@/lib/supabase/server'
import StudyClient, { type Course, type StudyTask, type StudyBlock, type StudyTaskSession } from './StudyClient'

export default async function StudyPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Start of current week (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysFromMonday)
  const weekStart = monday.toISOString().split('T')[0]

  const [
    { data: courses },
    { data: tasks },
    { data: blocks },
    { data: todayBlocks },
    { data: weekBlocks },
    { data: blockTasks },
    { data: sessions },
  ] = await Promise.all([
    supabase.from('courses').select('id, name, color, course_type').order('created_at', { ascending: true }),
    supabase.from('study_tasks').select('id, course_id, title, status, estimated_minutes, due_date, due_date_end, hard_deadline').order('created_at', { ascending: true }),
    supabase
      .from('study_blocks')
      .select('id, course_id, duration_minutes, end_time, date, notes, created_at, course:courses(name, color, course_type), tasks:study_block_tasks(study_task_id, study_tasks(title))')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('study_blocks').select('course_id, duration_minutes').eq('date', today),
    supabase.from('study_blocks').select('course_id, duration_minutes').gte('date', weekStart),
    supabase.from('study_block_tasks').select('study_task_id, study_blocks(duration_minutes)'),
    supabase
      .from('study_task_sessions')
      .select('id, study_task_id, date, start_time, end_time, notes, created_at')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true }),
  ])

  const courseTypeById = new Map(
    (courses ?? []).map((course) => [course.id, course.course_type ?? 'school'] as const)
  )

  function sumMinutesByType(entries: Array<{ course_id: string; duration_minutes: number }> | null | undefined) {
    const totals = { school: 0, side_project: 0 }

    for (const entry of entries ?? []) {
      const type = courseTypeById.get(entry.course_id) === 'side_project' ? 'side_project' : 'school'
      totals[type] += entry.duration_minutes
    }

    return totals
  }

  const todayMinutesByType = sumMinutesByType(todayBlocks)
  const weekMinutesByType = sumMinutesByType(weekBlocks)

  // Sum duration per task
  const taskMinutes: Record<string, number> = {}
  for (const bt of blockTasks ?? []) {
    const block = (bt.study_blocks as unknown as { duration_minutes: number } | null)
    if (!block) continue
    taskMinutes[bt.study_task_id] = (taskMinutes[bt.study_task_id] ?? 0) + block.duration_minutes
  }

  return (
    <StudyClient
      courses={(courses ?? []) as Course[]}
      tasks={(tasks ?? []) as StudyTask[]}
      blocks={(blocks ?? []) as unknown as StudyBlock[]}
      todayMinutesByType={todayMinutesByType}
      weekMinutesByType={weekMinutesByType}
      taskMinutes={taskMinutes}
      sessions={(sessions ?? []) as StudyTaskSession[]}
      today={today}
    />
  )
}
