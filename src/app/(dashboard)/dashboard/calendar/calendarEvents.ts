type StudyBlockLike = {
  id: string
  course_id: string
  duration_minutes: number
  end_time: string | null
  date: string
  notes: string
  course: { name: string; color: string; course_type?: 'school' | 'side_project' }
  tasks: { study_task_id: string; study_tasks: { title: string } | null }[]
  entry_type?: 'study_block' | 'teaching_moment' | 'study_session'
  source_id?: string
  source_task_id?: string
}

type TeachingMomentLike = {
  id: string
  student_id: string
  date: string
  start_time: string
  end_time: string
  price: number | string
  paid: boolean
  payment_method: 'cash' | 'bank_transfer'
  location_type: 'online' | 'in_person'
  transfer_note: string
  notes: string
  student?: { name: string } | { name: string }[] | null
}

type StudyTaskSessionLike = {
  id: string
  study_task_id: string
  date: string
  start_time: string
  end_time: string
  notes: string
  task?: {
    title: string
    status?: 'todo' | 'in_progress' | 'done'
    course?: { id?: string; name: string; color: string; course_type?: 'school' | 'side_project' } | { id?: string; name: string; color: string; course_type?: 'school' | 'side_project' }[] | null
  } | {
    title: string
    status?: 'todo' | 'in_progress' | 'done'
    course?: { id?: string; name: string; color: string; course_type?: 'school' | 'side_project' } | { id?: string; name: string; color: string; course_type?: 'school' | 'side_project' }[] | null
  }[] | null
}

function toMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

function getStudentName(student: TeachingMomentLike['student']) {
  if (!student) return 'Student'
  return Array.isArray(student) ? (student[0]?.name ?? 'Student') : student.name
}

function getTaskData(task: StudyTaskSessionLike['task']) {
  if (!task) return null
  return Array.isArray(task) ? (task[0] ?? null) : task
}

type TaskData = NonNullable<ReturnType<typeof getTaskData>>

function getCourseTypeLabel(type?: 'school' | 'side_project') {
  return type === 'side_project' ? 'Project' : 'Study'
}

function getCourseData(course: TaskData['course']) {
  if (!course) return { name: 'Study', color: '#6366f1', course_type: 'school' as const }
  return Array.isArray(course) ? (course[0] ?? { name: 'Study', color: '#6366f1', course_type: 'school' as const }) : course
}

export function mergeCalendarEntries(
  blocks: StudyBlockLike[],
  moments: TeachingMomentLike[],
  sessions: StudyTaskSessionLike[] = []
) {
  const tutoringBlocks: StudyBlockLike[] = (moments ?? []).map((moment) => ({
    id: `teaching-${moment.id}`,
    course_id: moment.student_id,
    duration_minutes: Math.max(toMinutes(moment.end_time) - toMinutes(moment.start_time), 0),
    end_time: moment.end_time,
    date: moment.date,
    entry_type: 'teaching_moment',
    source_id: moment.id,
    notes: [
      moment.location_type === 'online' ? 'Online session' : 'In-person session',
      moment.paid ? 'Paid' : 'Not paid yet',
      formatCurrency(moment.price),
      moment.transfer_note ? `Ref: ${moment.transfer_note}` : '',
      moment.notes,
    ]
      .filter(Boolean)
      .join(' • '),
    course: {
      name: `Tutoring • ${getStudentName(moment.student)}`,
      color: '#059669',
    },
    tasks: [
      {
        study_task_id: `payment-${moment.id}`,
        study_tasks: { title: moment.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Cash' },
      },
      {
        study_task_id: `location-${moment.id}`,
        study_tasks: { title: moment.location_type === 'online' ? 'Online' : 'In person' },
      },
    ],
  }))

  const studySessionBlocks: StudyBlockLike[] = (sessions ?? []).map((session) => {
    const task = getTaskData(session.task)
    const course = getCourseData(task?.course)

    return {
      id: `study-session-${session.id}`,
      course_id: course.id ?? session.study_task_id,
      duration_minutes: Math.max(toMinutes(session.end_time) - toMinutes(session.start_time), 0),
      end_time: session.end_time,
      date: session.date,
      entry_type: 'study_session',
      source_id: session.id,
      source_task_id: session.study_task_id,
      notes: ['Planned study session', session.notes].filter(Boolean).join(' • '),
      course: {
        name: `${getCourseTypeLabel(course.course_type)} • ${course.name}`,
        color: course.color,
        course_type: course.course_type,
      },
      tasks: task
        ? [{ study_task_id: session.study_task_id, study_tasks: { title: task.title } }]
        : [],
    }
  })

  return [...(blocks ?? []), ...tutoringBlocks, ...studySessionBlocks].sort((left, right) => {
    const leftValue = `${left.date}T${left.end_time ?? '00:00:00'}`
    const rightValue = `${right.date}T${right.end_time ?? '00:00:00'}`
    return rightValue.localeCompare(leftValue)
  })
}
