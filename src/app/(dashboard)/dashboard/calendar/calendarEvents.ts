type StudyBlockLike = {
  id: string
  course_id: string
  duration_minutes: number
  end_time: string | null
  date: string
  notes: string
  course: { name: string; color: string }
  tasks: { study_task_id: string; study_tasks: { title: string } | null }[]
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

export function mergeCalendarEntries(blocks: StudyBlockLike[], moments: TeachingMomentLike[]) {
  const tutoringBlocks: StudyBlockLike[] = (moments ?? []).map((moment) => ({
    id: `teaching-${moment.id}`,
    course_id: moment.student_id,
    duration_minutes: Math.max(toMinutes(moment.end_time) - toMinutes(moment.start_time), 0),
    end_time: moment.end_time,
    date: moment.date,
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

  return [...(blocks ?? []), ...tutoringBlocks].sort((left, right) => {
    const leftValue = `${left.date}T${left.end_time ?? '00:00:00'}`
    const rightValue = `${right.date}T${right.end_time ?? '00:00:00'}`
    return rightValue.localeCompare(leftValue)
  })
}
