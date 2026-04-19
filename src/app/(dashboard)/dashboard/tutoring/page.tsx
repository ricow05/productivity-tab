import { createClient } from '@/lib/supabase/server'
import TutoringClient, { type Student, type TeachingMoment } from './TutoringClient'

export default async function TutoringPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: students }, { data: moments }] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, phone, email, hourly_rate, active, default_payment_method, default_location_type, created_at')
      .order('active', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('teaching_moments')
      .select('id, student_id, date, start_time, end_time, price, paid, payment_method, location_type, transfer_note, notes, created_at')
      .order('date', { ascending: false })
      .order('start_time', { ascending: false }),
  ])

  return (
    <TutoringClient
      students={(students ?? []) as Student[]}
      moments={(moments ?? []) as TeachingMoment[]}
      today={today}
    />
  )
}
