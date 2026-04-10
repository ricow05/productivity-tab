import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: blocks } = await supabase
    .from('study_blocks')
    .select('id, course_id, duration_minutes, end_time, date, notes, course:courses(name, color), tasks:study_block_tasks(study_task_id, study_tasks(title))')
    .order('date', { ascending: false })

  return <CalendarClient blocks={(blocks ?? []) as any} />
}
