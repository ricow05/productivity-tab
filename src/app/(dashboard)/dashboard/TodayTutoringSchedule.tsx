type Moment = {
  id: string
  date: string
  start_time: string
  end_time: string
  price: number | string
  paid: boolean
  location_type: 'online' | 'in_person'
  student: { name: string } | { name: string }[] | null
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value ?? 0))
}

function getStudentName(student: Moment['student']) {
  if (!student) return 'Student'
  return Array.isArray(student) ? (student[0]?.name ?? 'Student') : student.name
}

export default function TodayTutoringSchedule({ moments }: { moments: Moment[] }) {
  if (moments.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-500 mb-2">Today’s schedule</p>
        <p className="text-sm text-gray-400">No tutoring sessions planned for today.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-gray-500">Today’s schedule</p>
        <span className="text-xs text-gray-400">{moments.length} session{moments.length === 1 ? '' : 's'}</span>
      </div>
      <div className="space-y-2">
        {moments.map((moment) => (
          <div key={moment.id} className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-900">{getStudentName(moment.student)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {moment.start_time.slice(0, 5)} - {moment.end_time.slice(0, 5)} · {moment.location_type === 'online' ? 'Online' : 'In person'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-700">{formatCurrency(moment.price)}</p>
                <p className={`text-xs ${moment.paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {moment.paid ? 'Paid' : 'Unpaid'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
