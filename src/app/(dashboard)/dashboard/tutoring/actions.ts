'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const PATHS_TO_REFRESH = [
  '/dashboard',
  '/dashboard/tutoring',
  '/dashboard/calendar',
  '/dashboard/schedule',
]

function refreshTutoringViews() {
  PATHS_TO_REFRESH.forEach((path) => revalidatePath(path))
}

export async function addStudent(data: {
  name: string
  phone: string
  email: string
  hourly_rate: number
  active: boolean
  default_payment_method: 'cash' | 'bank_transfer'
  default_location_type: 'online' | 'in_person'
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('students').insert(data)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}

export async function updateStudent(
  id: string,
  data: {
    name: string
    phone: string
    email: string
    hourly_rate: number
    active: boolean
    default_payment_method: 'cash' | 'bank_transfer'
    default_location_type: 'online' | 'in_person'
  }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('students').update(data).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}

export async function setStudentActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('students').update({ active }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}

export async function addTeachingMoment(data: {
  student_id: string
  date: string
  start_time: string
  end_time: string
  price: number
  paid: boolean
  payment_method: 'cash' | 'bank_transfer'
  location_type: 'online' | 'in_person'
  transfer_note: string
  notes: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('teaching_moments').insert(data)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}

export async function updateTeachingMoment(
  id: string,
  data: {
    student_id: string
    date: string
    start_time: string
    end_time: string
    price: number
    paid: boolean
    payment_method: 'cash' | 'bank_transfer'
    location_type: 'online' | 'in_person'
    transfer_note: string
    notes: string
  }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('teaching_moments').update(data).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}

export async function toggleTeachingMomentPaid(id: string, paid: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('teaching_moments').update({ paid }).eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}

export async function deleteTeachingMoment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('teaching_moments').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  refreshTutoringViews()
}
