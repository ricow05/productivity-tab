'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Courses ----

export async function addCourse(data: { name: string; color: string }) {
  const supabase = await createClient()
  await supabase.from('courses').insert(data)
  revalidatePath('/dashboard/study')
}

export async function deleteCourse(id: string) {
  const supabase = await createClient()
  await supabase.from('courses').delete().eq('id', id)
  revalidatePath('/dashboard/study')
}

// ---- Study Tasks ----

export async function addStudyTask(data: {
  course_id: string
  title: string
  estimated_minutes: number | null
  due_date: string | null
  due_date_end: string | null
}) {
  const supabase = await createClient()
  await supabase.from('study_tasks').insert(data)
  revalidatePath('/dashboard/study')
}

export async function cycleStudyTaskStatus(id: string, current: 'todo' | 'in_progress' | 'done') {
  const next = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo'
  const supabase = await createClient()
  await supabase.from('study_tasks').update({ status: next }).eq('id', id)
  revalidatePath('/dashboard/study')
  revalidatePath('/dashboard')
}

export async function updateStudyTask(id: string, data: {
  title: string
  estimated_minutes: number | null
  due_date: string | null
  due_date_end: string | null
}) {
  const supabase = await createClient()
  await supabase.from('study_tasks').update(data).eq('id', id)
  revalidatePath('/dashboard/study')
}

export async function deleteStudyTask(id: string) {
  const supabase = await createClient()
  await supabase.from('study_tasks').delete().eq('id', id)
  revalidatePath('/dashboard/study')
}

// ---- Study Blocks ----

export async function addStudyBlock(data: {
  course_id: string
  duration_minutes: number
  end_time: string | null
  date: string
  notes: string
  task_ids: string[]
}) {
  const supabase = await createClient()

  const { data: block, error } = await supabase
    .from('study_blocks')
    .insert({
      course_id: data.course_id,
      duration_minutes: data.duration_minutes,
      end_time: data.end_time ?? null,
      date: data.date,
      notes: data.notes,
    })
    .select('id')
    .single()

  if (error || !block) return

  if (data.task_ids.length > 0) {
    await supabase.from('study_block_tasks').insert(
      data.task_ids.map((task_id) => ({ study_block_id: block.id, study_task_id: task_id }))
    )
  }

  revalidatePath('/dashboard/study')
  revalidatePath('/dashboard')
}

export async function deleteStudyBlock(id: string) {
  const supabase = await createClient()
  await supabase.from('study_blocks').delete().eq('id', id)
  revalidatePath('/dashboard/study')
}
