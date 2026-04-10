'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addHabit(data: {
  name: string
  description: string
  type: 'lifetime' | 'timed'
  start_date: string
  end_date?: string | null
}) {
  const supabase = await createClient()
  await supabase.from('habits').insert({
    name: data.name,
    description: data.description,
    type: data.type,
    start_date: data.start_date,
    end_date: data.type === 'timed' ? (data.end_date ?? null) : null,
  })
  revalidatePath('/dashboard/habits')
}

export async function deleteHabit(id: string) {
  const supabase = await createClient()
  await supabase.from('habits').delete().eq('id', id)
  revalidatePath('/dashboard/habits')
}

export async function toggleHabitLog(habitId: string, date: string, currentlyCompleted: boolean) {
  const supabase = await createClient()
  await supabase.from('habit_logs').upsert(
    { habit_id: habitId, date, completed: !currentlyCompleted },
    { onConflict: 'habit_id,date' }
  )
  revalidatePath('/dashboard/habits')
}
