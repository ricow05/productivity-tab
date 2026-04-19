import { createClient } from '@/lib/supabase/server'
import CalendarClient from '../calendar/CalendarClient'
import { mergeCalendarEntries } from '../calendar/calendarEvents'

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: moments } = await supabase
    .from('teaching_moments')
    .select('id, student_id, date, start_time, end_time, price, paid, payment_method, location_type, transfer_note, notes, student:students(name)')
    .order('date', { ascending: false })

  const calendarEntries = mergeCalendarEntries([], (moments ?? []) as any)

  return <CalendarClient blocks={calendarEntries as any} title="Schedule" />
}
