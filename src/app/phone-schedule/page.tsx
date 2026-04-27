import { createClient } from '@/lib/supabase/server'
import TodayTutoringSchedule from '@/app/(dashboard)/dashboard/TodayTutoringSchedule'

export default async function PhoneSchedulePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = tomorrowDate.toISOString().split('T')[0]

  const [{ data: tutoringMoments }, { data: studySessions }, { data: studyTasks }] = await Promise.all([
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
      .select('id, title, status, course:courses(name, course_type)')
      .neq('status', 'done')
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start">
        <span className="font-bold text-gray-900 text-3xl">Schedule</span>
      </div>

      <TodayTutoringSchedule
        moments={(tutoringMoments ?? []) as any}
        sessions={(studySessions ?? []) as any}
        tasks={(studyTasks ?? []) as any}
        today={today}
        tomorrow={tomorrow}
      />
    </div>
  )
}
