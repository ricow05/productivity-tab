'use client'

import { useState, useTransition } from 'react'
import { addStudyBlock, addStudyTaskSession, cycleStudyTaskStatus, deleteStudyTaskSession, updateStudyTaskSession } from './study/actions'
import { deleteTeachingMoment, updateTeachingMoment } from './tutoring/actions'

type Moment = {
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
  student: { name: string } | { name: string }[] | null
}

type StudySession = {
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

type HomeTask = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  course?: { name: string; course_type?: 'school' | 'side_project' } | { name: string; course_type?: 'school' | 'side_project' }[] | null
}

type ScheduleItem = {
  id: string
  kind: 'tutoring' | 'study'
  date: string
  start_time: string
  end_time: string
  title: string
  subtitle: string
  accentColor: string
  trailingTop: string
  trailingBottom: string
  trailingTone: string
  taskStatus?: 'todo' | 'in_progress' | 'done'
  studyTaskId?: string
  studySessionId?: string
  tutoringMomentId?: string
  courseId?: string
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

function getTaskData(task: StudySession['task']) {
  if (!task) return null
  return Array.isArray(task) ? (task[0] ?? null) : task
}

type TaskData = NonNullable<ReturnType<typeof getTaskData>>

function getCourseTypeLabel(type?: 'school' | 'side_project') {
  return type === 'side_project' ? 'Side project' : 'School'
}

function getCourseData(course: TaskData['course']) {
  if (!course) return { name: 'Study', color: '#6366f1', course_type: 'school' as const }
  return Array.isArray(course) ? (course[0] ?? { name: 'Study', color: '#6366f1', course_type: 'school' as const }) : course
}

function getTaskCourseName(course: HomeTask['course']) {
  if (!course) return 'Study'
  const value = Array.isArray(course) ? course[0] : course
  if (!value) return 'Study'
  return `${value.name} · ${getCourseTypeLabel(value.course_type)}`
}

function getTimeValue(offsetMinutes = 0) {
  const date = new Date()
  date.setMinutes(date.getMinutes() + offsetMinutes)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getDurationMinutes(start: string, end: string) {
  const [startHour, startMinute] = start.slice(0, 5).split(':').map(Number)
  const [endHour, endMinute] = end.slice(0, 5).split(':').map(Number)
  return Math.max(endHour * 60 + endMinute - (startHour * 60 + startMinute), 0)
}

function toMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const HOUR_HEIGHT = 64

export default function TodayTutoringSchedule({ moments, sessions = [], tasks = [], today }: { moments: Moment[]; sessions?: StudySession[]; tasks?: HomeTask[]; today: string }) {
  const [, startTransition] = useTransition()
  const [loggingItemId, setLoggingItemId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showAddSession, setShowAddSession] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? '')
  const [sessionDate, setSessionDate] = useState(today)
  const [sessionStartTime, setSessionStartTime] = useState(() => getTimeValue(0))
  const [sessionEndTime, setSessionEndTime] = useState(() => getTimeValue(60))
  const [sessionNotes, setSessionNotes] = useState('')
  const [logHours, setLogHours] = useState(0)
  const [logMinutes, setLogMinutes] = useState(30)
  const [logEndTime, setLogEndTime] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [editStudyTaskId, setEditStudyTaskId] = useState('')
  const [editDate, setEditDate] = useState(today)
  const [editStartTime, setEditStartTime] = useState(() => getTimeValue(0))
  const [editEndTime, setEditEndTime] = useState(() => getTimeValue(60))
  const [editNotes, setEditNotes] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editPaid, setEditPaid] = useState(false)
  const [editLocationType, setEditLocationType] = useState<'online' | 'in_person'>('in_person')
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash')
  const [editTransferNote, setEditTransferNote] = useState('')

  const items: ScheduleItem[] = [
    ...moments.map((moment) => ({
      id: `tutoring-${moment.id}`,
      kind: 'tutoring' as const,
      date: moment.date,
      start_time: moment.start_time,
      end_time: moment.end_time,
      title: getStudentName(moment.student),
      subtitle: moment.location_type === 'online' ? 'Tutoring · Online' : 'Tutoring · In person',
      accentColor: '#059669',
      trailingTop: formatCurrency(moment.price),
      trailingBottom: moment.paid ? 'Paid' : 'Unpaid',
      trailingTone: moment.paid ? 'text-emerald-600' : 'text-amber-600',
      tutoringMomentId: moment.id,
    })),
    ...sessions.map((session) => {
      const task = getTaskData(session.task)
      const course = getCourseData(task?.course)

      return {
        id: `study-${session.id}`,
        kind: 'study' as const,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        title: task?.title ?? 'Study session',
        subtitle: session.notes ? `${getCourseTypeLabel(course.course_type)} · ${course.name} · ${session.notes}` : `${getCourseTypeLabel(course.course_type)} · ${course.name}`,
        accentColor: course.color,
        trailingTop: `Planned ${formatMinutes(getDurationMinutes(session.start_time, session.end_time))}`,
        trailingBottom: task?.status === 'done' ? 'Done' : task?.status === 'in_progress' ? 'In progress' : 'Todo',
        trailingTone: task?.status === 'done' ? 'text-emerald-600' : task?.status === 'in_progress' ? 'text-amber-600' : 'text-blue-600',
        taskStatus: task?.status ?? 'todo',
        studyTaskId: session.study_task_id,
        studySessionId: session.id,
        courseId: course.id,
      }
    }),
  ].sort((left, right) => left.start_time.localeCompare(right.start_time))

  const { displayStart, displayEnd } = (() => {
    let minMin = 8 * 60
    let maxMin = 20 * 60

    for (const item of items) {
      const start = toMinutes(item.start_time)
      const end = toMinutes(item.end_time)
      if (start < minMin) minMin = start
      if (end > maxMin) maxMin = end
    }

    return {
      displayStart: Math.max(0, Math.floor(minMin / 60) - 1),
      displayEnd: Math.min(24, Math.ceil(maxMin / 60) + 1),
    }
  })()

  const displayHours = displayEnd - displayStart
  const gridHeight = displayHours * HOUR_HEIGHT
  const activeItem = items.find((item) => item.id === loggingItemId) ?? null
  const activeEditItem = items.find((item) => item.id === editingItemId) ?? null

  const tasksByCourse = tasks.reduce<Record<string, HomeTask[]>>((acc, task) => {
    const courseName = getTaskCourseName(task.course)
    if (!acc[courseName]) acc[courseName] = []
    acc[courseName].push(task)
    return acc
  }, {})

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const showCurrentTime = currentMinutes >= displayStart * 60 && currentMinutes <= displayEnd * 60
  const currentTimeTop = ((currentMinutes - displayStart * 60) / 60) * HOUR_HEIGHT

  function openLog(item: ScheduleItem) {
    setLoggingItemId(item.id)
    const totalMinutes = getDurationMinutes(item.start_time, item.end_time)
    setLogHours(Math.floor(totalMinutes / 60))
    setLogMinutes(totalMinutes % 60)
    setLogEndTime(item.end_time.slice(0, 5))
    setLogNotes('')
  }

  function openEditor(item: ScheduleItem) {
    if (editingItemId === item.id) {
      setEditingItemId(null)
      return
    }

    setLoggingItemId(null)

    if (item.kind === 'study' && item.studySessionId) {
      const session = sessions.find((entry) => entry.id === item.studySessionId)
      if (!session) return

      setEditStudyTaskId(session.study_task_id)
      setEditDate(session.date)
      setEditStartTime(session.start_time.slice(0, 5))
      setEditEndTime(session.end_time.slice(0, 5))
      setEditNotes(session.notes ?? '')
      setEditingItemId(item.id)
      return
    }

    if (item.kind === 'tutoring' && item.tutoringMomentId) {
      const moment = moments.find((entry) => entry.id === item.tutoringMomentId)
      if (!moment) return

      setEditDate(moment.date)
      setEditStartTime(moment.start_time.slice(0, 5))
      setEditEndTime(moment.end_time.slice(0, 5))
      setEditNotes(moment.notes ?? '')
      setEditPrice(String(Number(moment.price ?? 0)))
      setEditPaid(moment.paid)
      setEditLocationType(moment.location_type)
      setEditPaymentMethod(moment.payment_method)
      setEditTransferNote(moment.transfer_note ?? '')
      setEditingItemId(item.id)
    }
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeEditItem || !editDate || !editStartTime || !editEndTime || editEndTime <= editStartTime) return

    startTransition(async () => {
      if (activeEditItem.kind === 'study' && activeEditItem.studySessionId && editStudyTaskId) {
        await updateStudyTaskSession(activeEditItem.studySessionId, {
          study_task_id: editStudyTaskId,
          date: editDate,
          start_time: editStartTime,
          end_time: editEndTime,
          notes: editNotes.trim(),
        })
      }

      if (activeEditItem.kind === 'tutoring' && activeEditItem.tutoringMomentId) {
        const moment = moments.find((entry) => entry.id === activeEditItem.tutoringMomentId)
        if (!moment?.student_id) return

        await updateTeachingMoment(activeEditItem.tutoringMomentId, {
          student_id: moment.student_id,
          date: editDate,
          start_time: editStartTime,
          end_time: editEndTime,
          price: Number(editPrice || 0),
          paid: editPaid,
          payment_method: editPaymentMethod,
          location_type: editLocationType,
          transfer_note: editTransferNote.trim(),
          notes: editNotes.trim(),
        })
      }

      setEditingItemId(null)
    })
  }

  function handleDeleteItem() {
    if (!activeEditItem) return

    startTransition(async () => {
      if (activeEditItem.kind === 'study' && activeEditItem.studySessionId) {
        await deleteStudyTaskSession(activeEditItem.studySessionId)
      }

      if (activeEditItem.kind === 'tutoring' && activeEditItem.tutoringMomentId) {
        await deleteTeachingMoment(activeEditItem.tutoringMomentId)
      }

      setEditingItemId(null)
      setLoggingItemId(null)
    })
  }

  function handleLog(e: React.FormEvent, item: ScheduleItem) {
    e.preventDefault()
    if (item.kind !== 'study' || !item.studyTaskId || !item.courseId) return

    const courseId = item.courseId
    const studyTaskId = item.studyTaskId
    const total = logHours * 60 + logMinutes
    if (total <= 0) return

    startTransition(async () => {
      await addStudyBlock({
        course_id: courseId,
        duration_minutes: total,
        end_time: logEndTime || item.end_time || null,
        date: item.date,
        notes: logNotes.trim(),
        task_ids: [studyTaskId],
      })
      setLoggingItemId(null)
    })
  }

  function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTaskId || !sessionDate || !sessionStartTime || !sessionEndTime || sessionEndTime <= sessionStartTime) return

    startTransition(async () => {
      await addStudyTaskSession({
        study_task_id: selectedTaskId,
        date: sessionDate,
        start_time: sessionStartTime,
        end_time: sessionEndTime,
        notes: sessionNotes.trim(),
      })
      setSessionNotes('')
      setShowAddSession(false)
    })
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-medium text-gray-500 mb-2">Today’s schedule</p>
        <p className="text-sm text-gray-400">No sessions or study blocks planned for today.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-gray-500">Today’s schedule</p>
          <p className="text-xs text-gray-400">Click a session to edit it</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{items.length} item{items.length === 1 ? '' : 's'}</span>
          <button
            onClick={() => setShowAddSession((value) => !value)}
            className="text-xs bg-gray-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add session
          </button>
        </div>
      </div>

      {showAddSession && (
        <form onSubmit={handleAddSession} className="mb-3 border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
          <p className="text-sm font-semibold text-gray-900">New study session</p>
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500">Create a study task first to link a session.</p>
          ) : (
            <>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
              >
                {Object.entries(tasksByCourse).map(([courseName, courseTasks]) => (
                  <optgroup key={courseName} label={courseName}>
                    {courseTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <input
                  type="time"
                  value={sessionStartTime}
                  onChange={(e) => setSessionStartTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <input
                  type="time"
                  value={sessionEndTime}
                  onChange={(e) => setSessionEndTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <input
                type="text"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Save session
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSession(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid border-b border-gray-100 bg-gray-50" style={{ gridTemplateColumns: '3.5rem 1fr' }}>
          <div />
          <div className="px-3 py-2 text-sm font-semibold text-gray-700">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '32rem' }}>
          <div className="grid" style={{ gridTemplateColumns: '3.5rem 1fr' }}>
            <div className="relative select-none bg-white" style={{ height: gridHeight }}>
              {Array.from({ length: displayHours + 1 }).map((_, i) => {
                const hour = displayStart + i
                return (
                  <div
                    key={hour}
                    className="absolute right-2 flex items-center"
                    style={{ top: i * HOUR_HEIGHT - 8, height: 16 }}
                  >
                    <span className="text-xs text-gray-300">{pad2(hour)}:00</span>
                  </div>
                )
              })}
            </div>

            <div className="relative bg-white border-l border-gray-100" style={{ height: gridHeight }}>
              {Array.from({ length: displayHours + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}

              {Array.from({ length: displayHours }).map((_, i) => (
                <div
                  key={`half-${i}`}
                  className="absolute left-0 right-0 border-t border-gray-50"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              ))}

              {showCurrentTime && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: currentTimeTop }}
                >
                  <div className="relative flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                    <div className="h-0.5 flex-1 bg-red-500" />
                  </div>
                </div>
              )}

              {items.map((item) => {
                const startMin = toMinutes(item.start_time)
                const endMin = toMinutes(item.end_time)
                const top = ((startMin - displayStart * 60) / 60) * HOUR_HEIGHT
                const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 56)
                const isActive = item.id === loggingItemId

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEditor(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openEditor(item)
                      }
                    }}
                    className={`absolute left-2 right-2 rounded-xl border p-2 shadow-sm cursor-pointer transition-shadow ${isActive ? 'ring-2 ring-gray-800 ring-offset-1 z-10' : 'z-0 hover:shadow-md'}`}
                    style={{
                      top,
                      minHeight: height,
                      backgroundColor: item.accentColor + '18',
                      borderColor: item.accentColor + '55',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium" style={{ color: item.accentColor }}>
                          {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.subtitle}</p>
                      </div>
                      {item.kind === 'study' && item.studyTaskId && item.courseId && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              startTransition(() => cycleStudyTaskStatus(item.studyTaskId!, item.taskStatus ?? 'todo'))
                            }}
                            className={`w-5 h-5 rounded-full border-2 transition-colors ${
                              item.taskStatus === 'done'
                                ? 'bg-green-500 border-green-500'
                                : item.taskStatus === 'in_progress'
                                ? 'bg-amber-400 border-amber-400'
                                : 'border-gray-300 hover:border-amber-400 bg-white'
                            }`}
                            title={item.taskStatus === 'todo' ? 'Mark in progress' : item.taskStatus === 'in_progress' ? 'Mark done' : 'Reset to todo'}
                            aria-label={item.taskStatus === 'todo' ? 'Mark in progress' : item.taskStatus === 'in_progress' ? 'Mark done' : 'Reset to todo'}
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              loggingItemId === item.id ? setLoggingItemId(null) : openLog(item)
                            }}
                            className="text-[11px] bg-gray-900 text-white px-2 py-1 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
                          >
                            Log time
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-gray-600">
                      <span>{item.trailingTop}</span>
                      <span className={item.trailingTone}>{item.trailingBottom}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {activeEditItem && (
        <form
          onSubmit={handleEditSave}
          className="mt-3 border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Edit {activeEditItem.kind === 'tutoring' ? 'tutoring session' : 'study session'}
              </p>
              <p className="text-xs text-gray-500">You can change it directly from Home.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>

          {activeEditItem.kind === 'study' && (
            <select
              value={editStudyTaskId}
              onChange={(e) => setEditStudyTaskId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
            >
              {!tasks.some((task) => task.id === editStudyTaskId) && editStudyTaskId && (
                <option value={editStudyTaskId}>{activeEditItem.title}</option>
              )}
              {Object.entries(tasksByCourse).map(([courseName, courseTasks]) => (
                <optgroup key={courseName} label={courseName}>
                  {courseTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <div className="grid sm:grid-cols-3 gap-2">
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              type="time"
              value={editStartTime}
              onChange={(e) => setEditStartTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              type="time"
              value={editEndTime}
              onChange={(e) => setEditEndTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {activeEditItem.kind === 'tutoring' && (
            <>
              <div className="grid sm:grid-cols-3 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="Price"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <select
                  value={editLocationType}
                  onChange={(e) => setEditLocationType(e.target.value as 'online' | 'in_person')}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                >
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                </select>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value as 'cash' | 'bank_transfer')}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editPaid}
                  onChange={(e) => setEditPaid(e.target.checked)}
                />
                Mark as paid
              </label>

              {editPaymentMethod === 'bank_transfer' && (
                <input
                  type="text"
                  value={editTransferNote}
                  onChange={(e) => setEditTransferNote(e.target.value)}
                  placeholder="Transfer note (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              )}
            </>
          )}

          <input
            type="text"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />

          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={handleDeleteItem}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setEditingItemId(null)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {activeItem?.kind === 'study' && activeItem.studyTaskId && activeItem.courseId && (
        <form
          onSubmit={(e) => handleLog(e, activeItem)}
          className="mt-3 border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">Log time for {activeItem.title}</p>
            <p className="text-xs text-gray-500">
              {activeItem.start_time.slice(0, 5)} - {activeItem.end_time.slice(0, 5)}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="number" min={0} max={23} value={logHours}
              onChange={(e) => setLogHours(Number(e.target.value))}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <span className="text-sm text-gray-500">h</span>
            <input
              type="number" min={0} max={59} value={logMinutes}
              onChange={(e) => setLogMinutes(Number(e.target.value))}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <span className="text-sm text-gray-500">min</span>
            <input
              type="time" value={logEndTime}
              onChange={(e) => setLogEndTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <span className="text-xs text-gray-400">{logHours * 60 + logMinutes > 0 ? formatMinutes(logHours * 60 + logMinutes) : ''}</span>
          </div>
          <input
            type="text" value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Log
            </button>
            <button
              type="button"
              onClick={() => setLoggingItemId(null)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
