import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'
import { mergeCalendarEntries } from './calendarEvents'

export default async function CalendarPage() {
  const supabase = await createClient()

  const [{ data: blocks }, { data: moments }] = await Promise.all([
    supabase
      .from('study_blocks')
      .select('id, course_id, duration_minutes, end_time, date, notes, course:courses(name, color, course_type), tasks:study_block_tasks(study_task_id, study_tasks(title))')
      .order('date', { ascending: false }),
    supabase
      .from('teaching_moments')
      .select('id, student_id, date, start_time, end_time, price, paid, payment_method, location_type, transfer_note, notes, student:students(name)')
      .order('date', { ascending: false }),
  ])

  const calendarEntries = mergeCalendarEntries((blocks ?? []) as any, (moments ?? []) as any)

  return <CalendarClient blocks={calendarEntries as any} title="Calendar" />
}
