import { createClient } from '@/lib/supabase/server'
import CalendarClient from '../calendar/CalendarClient'
import { mergeCalendarEntries } from '../calendar/calendarEvents'

export default async function SchedulePage() {
  const supabase = await createClient()

  const [{ data: moments }, { data: sessions }] = await Promise.all([
    supabase
      .from('teaching_moments')
      .select('id, student_id, date, start_time, end_time, price, paid, payment_method, location_type, transfer_note, notes, student:students(name)')
      .order('date', { ascending: false }),
    supabase
      .from('study_task_sessions')
      .select('id, study_task_id, date, start_time, end_time, notes, task:study_tasks(title, status, course:courses(id, name, color, course_type))')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false }),
  ])

  const calendarEntries = mergeCalendarEntries([], (moments ?? []) as any, (sessions ?? []) as any)

  return <CalendarClient blocks={calendarEntries as any} title="Schedule" />
}
