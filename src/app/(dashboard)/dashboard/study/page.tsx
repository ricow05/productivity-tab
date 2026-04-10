import { createClient } from '@/lib/supabase/server'
import StudyClient, { type Course, type StudyTask, type StudyBlock } from './StudyClient'

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
  ] = await Promise.all([
    supabase.from('courses').select('id, name, color').order('created_at', { ascending: true }),
    supabase.from('study_tasks').select('id, course_id, title, status, estimated_minutes, due_date, due_date_end').order('created_at', { ascending: true }),
    supabase
      .from('study_blocks')
      .select('id, course_id, duration_minutes, end_time, date, notes, created_at, course:courses(name, color), tasks:study_block_tasks(study_task_id, study_tasks(title))')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('study_blocks').select('duration_minutes').eq('date', today),
    supabase.from('study_blocks').select('duration_minutes').gte('date', weekStart),
    supabase.from('study_block_tasks').select('study_task_id, study_blocks(duration_minutes)'),
  ])

  const todayMinutes = (todayBlocks ?? []).reduce((sum, b) => sum + b.duration_minutes, 0)
  const weekMinutes = (weekBlocks ?? []).reduce((sum, b) => sum + b.duration_minutes, 0)

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
      todayMinutes={todayMinutes}
      weekMinutes={weekMinutes}
      taskMinutes={taskMinutes}
      today={today}
    />
  )
}
