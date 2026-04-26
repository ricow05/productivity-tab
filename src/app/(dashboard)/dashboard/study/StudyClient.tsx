'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  addCourse,
  deleteCourse,
  addStudyTask,
  updateStudyTask,
  cycleStudyTaskStatus,
  deleteStudyTask,
  addStudyTaskSession,
  updateStudyTaskSession,
  deleteStudyTaskSession,
  addStudyBlock,
  deleteStudyBlock,
} from './actions'

export type CourseType = 'school' | 'side_project'

export type Course = {
  id: string
  name: string
  color: string
  course_type: CourseType
}

export type StudyTask = {
  id: string
  course_id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  estimated_minutes: number | null
  due_date: string | null
  due_date_end: string | null
  hard_deadline: string | null
}

export type StudyBlock = {
  id: string
  course_id: string
  duration_minutes: number
  end_time: string | null
  date: string
  notes: string
  created_at: string
  course: { name: string; color: string; course_type?: CourseType }
  tasks: { study_task_id: string; study_tasks: { title: string } | null }[]
}

export type StudyTaskSession = {
  id: string
  study_task_id: string
  date: string
  start_time: string
  end_time: string
  notes: string
  created_at: string
}

type TimeByType = Record<CourseType, number>

type Props = {
  courses: Course[]
  tasks: StudyTask[]
  blocks: StudyBlock[]
  todayMinutesByType: TimeByType
  weekMinutesByType: TimeByType
  taskMinutes: Record<string, number>
  sessions: StudyTaskSession[]
  today: string
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function getTimeValue(offsetMinutes = 0) {
  const date = new Date()
  date.setMinutes(date.getMinutes() + offsetMinutes)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatTimeRange(start: string, end: string) {
  return `${start.slice(0, 5)} → ${end.slice(0, 5)}`
}

function toDatetimeLocalValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6',
]

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  school: 'School',
  side_project: 'Side project',
}

function getCourseTypeLabel(type?: CourseType) {
  return COURSE_TYPE_LABELS[type ?? 'school']
}

export default function StudyClient({ courses, tasks, blocks, todayMinutesByType, weekMinutesByType, taskMinutes, sessions, today }: Props) {
  const [, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editTaskParam = searchParams.get('editTask')
  const editSessionParam = searchParams.get('editSession')

  // --- Tab state ---
  const [tab, setTab] = useState<'log' | 'courses' | 'tasks'>('log')

  // --- Log block form ---
  const [logCourseId, setLogCourseId] = useState(courses[0]?.id ?? '')
  const [logHours, setLogHours] = useState(0)
  const [logMinutes, setLogMinutes] = useState(30)
  const [logEndTime, setLogEndTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [logDate, setLogDate] = useState(today)
  const [logNotes, setLogNotes] = useState('')
  const [logTaskIds, setLogTaskIds] = useState<string[]>([])

  // --- Course form ---
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courseName, setCourseName] = useState('')
  const [courseColor, setCourseColor] = useState(COLORS[0])
  const [courseType, setCourseType] = useState<CourseType>('school')

  // --- Task form ---
  const [taskCourseId, setTaskCourseId] = useState(courses[0]?.id ?? '')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskEstHours, setTaskEstHours] = useState(0)
  const [taskEstMinutes, setTaskEstMinutes] = useState(0)
  const [taskDateType, setTaskDateType] = useState<'none' | 'day' | 'range'>('none')
  const [taskDueDate, setTaskDueDate] = useState(today)
  const [taskDueDateEnd, setTaskDueDateEnd] = useState(today)
  const [taskHardDeadline, setTaskHardDeadline] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)

  // --- Inline edit ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editEstHours, setEditEstHours] = useState(0)
  const [editEstMinutes, setEditEstMinutes] = useState(0)
  const [editDateType, setEditDateType] = useState<'none' | 'day' | 'range'>('none')
  const [editDueDate, setEditDueDate] = useState(today)
  const [editDueDateEnd, setEditDueDateEnd] = useState(today)
  const [editHardDeadline, setEditHardDeadline] = useState('')
  const [sessionDate, setSessionDate] = useState(today)
  const [sessionStartTime, setSessionStartTime] = useState(() => getTimeValue(0))
  const [sessionEndTime, setSessionEndTime] = useState(() => getTimeValue(60))
  const [sessionNotes, setSessionNotes] = useState('')

  function openEdit(t: StudyTask, session?: StudyTaskSession | null) {
    setEditingTaskId(t.id)
    setEditTitle(t.title)
    const est = t.estimated_minutes ?? 0
    setEditEstHours(Math.floor(est / 60))
    setEditEstMinutes(est % 60)
    if (!t.due_date) {
      setEditDateType('none')
      setEditDueDate(today)
      setEditDueDateEnd(today)
    } else if (t.due_date_end) {
      setEditDateType('range')
      setEditDueDate(t.due_date)
      setEditDueDateEnd(t.due_date_end)
    } else {
      setEditDateType('day')
      setEditDueDate(t.due_date)
      setEditDueDateEnd(today)
    }
    setEditHardDeadline(toDatetimeLocalValue(t.hard_deadline))

    if (session) {
      setEditingSessionId(session.id)
      setSessionDate(session.date)
      setSessionStartTime(session.start_time.slice(0, 5))
      setSessionEndTime(session.end_time.slice(0, 5))
      setSessionNotes(session.notes)
      return
    }

    setEditingSessionId(null)
    setSessionDate(t.due_date ?? today)
    setSessionStartTime(getTimeValue(0))
    setSessionEndTime(getTimeValue(60))
    setSessionNotes('')
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || !editingTaskId) return
    const totalEst = editEstHours * 60 + editEstMinutes
    const due_date = editDateType !== 'none' ? editDueDate : null
    const due_date_end = editDateType === 'range' ? editDueDateEnd : null
    const hard_deadline = toIsoFromDatetimeLocal(editHardDeadline)
    startTransition(async () => {
      await updateStudyTask(editingTaskId, {
        title: editTitle.trim(),
        estimated_minutes: totalEst > 0 ? totalEst : null,
        due_date,
        due_date_end,
        hard_deadline,
      })
      setEditingTaskId(null)
      setEditingSessionId(null)
    })
  }

  useEffect(() => {
    if (!editTaskParam && !editSessionParam) return

    const targetSession = editSessionParam
      ? sessions.find((session) => session.id === editSessionParam) ?? null
      : null
    const targetTaskId = targetSession?.study_task_id ?? editTaskParam
    const targetTask = tasks.find((task) => task.id === targetTaskId)

    if (!targetTask) return

    setTab('tasks')
    openEdit(targetTask, targetSession)
    router.replace('/dashboard/study', { scroll: false })
  }, [editTaskParam, editSessionParam, tasks, sessions, router])

  useEffect(() => {
    if (courses.length === 0) {
      setLogCourseId('')
      setTaskCourseId('')
      return
    }

    if (!courses.some((course) => course.id === logCourseId)) {
      setLogCourseId(courses[0]?.id ?? '')
    }

    if (!courses.some((course) => course.id === taskCourseId)) {
      setTaskCourseId(courses[0]?.id ?? '')
    }
  }, [courses, logCourseId, taskCourseId])

  const courseTasks = tasks.filter((t) => t.course_id === (tab === 'tasks' ? taskCourseId : logCourseId) && t.status !== 'done')
  const groupedCourses = {
    school: courses.filter((course) => (course.course_type ?? 'school') === 'school'),
    side_project: courses.filter((course) => (course.course_type ?? 'school') === 'side_project'),
  }

  function renderCourseOptions() {
    return (Object.entries(groupedCourses) as [CourseType, Course[]][]).map(([type, list]) => {
      if (list.length === 0) return null

      return (
        <optgroup key={type} label={COURSE_TYPE_LABELS[type]}>
          {list.map((course) => (
            <option key={course.id} value={course.id}>{course.name}</option>
          ))}
        </optgroup>
      )
    })
  }

  const sessionsByTask = sessions.reduce<Record<string, StudyTaskSession[]>>((acc, session) => {
    if (!acc[session.study_task_id]) acc[session.study_task_id] = []
    acc[session.study_task_id].push(session)
    return acc
  }, {})

  for (const taskId of Object.keys(sessionsByTask)) {
    sessionsByTask[taskId].sort((left, right) =>
      `${left.date}T${left.start_time}`.localeCompare(`${right.date}T${right.start_time}`)
    )
  }

  function handleAddBlock(e: React.FormEvent) {
    e.preventDefault()
    const total = logHours * 60 + logMinutes
    if (!logCourseId || total <= 0) return
    startTransition(async () => {
      await addStudyBlock({
        course_id: logCourseId,
        duration_minutes: total,
        end_time: logEndTime || null,
        date: logDate,
        notes: logNotes.trim(),
        task_ids: logTaskIds,
      })
      setLogHours(0)
      setLogMinutes(30)
      setLogNotes('')
      setLogTaskIds([])
    })
  }

  function handleAddCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!courseName.trim()) return
    startTransition(async () => {
      await addCourse({ name: courseName.trim(), color: courseColor, course_type: courseType })
      setCourseName('')
      setCourseColor(COLORS[0])
      setCourseType('school')
      setShowCourseForm(false)
    })
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim() || !taskCourseId) return
    const totalEst = taskEstHours * 60 + taskEstMinutes
    const due_date = taskDateType !== 'none' ? taskDueDate : null
    const due_date_end = taskDateType === 'range' ? taskDueDateEnd : null
    const hard_deadline = toIsoFromDatetimeLocal(taskHardDeadline)
    startTransition(async () => {
      await addStudyTask({
        course_id: taskCourseId,
        title: taskTitle.trim(),
        estimated_minutes: totalEst > 0 ? totalEst : null,
        due_date,
        due_date_end,
        hard_deadline,
      })
      setTaskTitle('')
      setTaskEstHours(0)
      setTaskEstMinutes(0)
      setTaskDateType('none')
      setTaskDueDate(today)
      setTaskDueDateEnd(today)
      setTaskHardDeadline('')
      setShowTaskForm(false)
    })
  }

  function handleAddSession(taskId: string) {
    if (!sessionDate || !sessionStartTime || !sessionEndTime || sessionEndTime <= sessionStartTime) return

    startTransition(async () => {
      const payload = {
        study_task_id: taskId,
        date: sessionDate,
        start_time: sessionStartTime,
        end_time: sessionEndTime,
        notes: sessionNotes.trim(),
      }

      if (editingSessionId) {
        await updateStudyTaskSession(editingSessionId, payload)
      } else {
        await addStudyTaskSession(payload)
      }

      setEditingSessionId(null)
      setSessionDate(today)
      setSessionStartTime(getTimeValue(0))
      setSessionEndTime(getTimeValue(60))
      setSessionNotes('')
    })
  }

  function toggleLogTask(id: string) {
    setLogTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header with summary cards */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-900">Study &amp; Side Projects</h1>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm min-w-[170px]">
            <p className="text-xs text-gray-400">Today</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">School</span>
                <span className="font-semibold text-gray-900">{formatMinutes(todayMinutesByType.school)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Side project</span>
                <span className="font-semibold text-gray-900">{formatMinutes(todayMinutesByType.side_project)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm min-w-[170px]">
            <p className="text-xs text-gray-400">This week</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">School</span>
                <span className="font-semibold text-gray-900">{formatMinutes(weekMinutesByType.school)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Side project</span>
                <span className="font-semibold text-gray-900">{formatMinutes(weekMinutesByType.side_project)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['log', 'courses', 'tasks'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-gray-900 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'log' ? 'Log' : t === 'courses' ? 'Tracks' : 'Tasks'}
          </button>
        ))}
      </div>

      {/* ---- LOG TAB ---- */}
      {tab === 'log' && (
        <div className="space-y-6">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">Add a course or side project first before logging time.</p>
          ) : (
            <form onSubmit={handleAddBlock} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">New time block</p>

              {/* Course */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course / project *</label>
                <select
                  value={logCourseId}
                  onChange={(e) => { setLogCourseId(e.target.value); setLogTaskIds([]) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                >
                  {renderCourseOptions()}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration *</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={logHours}
                    onChange={(e) => setLogHours(Number(e.target.value))}
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <span className="text-sm text-gray-500">h</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={logMinutes}
                    onChange={(e) => setLogMinutes(Number(e.target.value))}
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  <span className="text-sm text-gray-500">min</span>
                </div>
              </div>

              {/* End time */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End time</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={logEndTime}
                    onChange={(e) => setLogEndTime(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  {logEndTime && (logHours * 60 + logMinutes) > 0 && (() => {
                    const [eh, em] = logEndTime.split(':').map(Number)
                    const totalMins = logHours * 60 + logMinutes
                    const startMins = eh * 60 + em - totalMins
                    const sh = Math.floor(((startMins % 1440) + 1440) % 1440 / 60)
                    const sm = ((startMins % 1440) + 1440) % 1440 % 60
                    return (
                      <span className="text-xs text-gray-400">
                        {String(sh).padStart(2, '0')}:{String(sm).padStart(2, '0')} → {logEndTime}
                      </span>
                    )
                  })()}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              {/* Link tasks */}
              {courseTasks.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Link tasks (optional)</label>
                  <div className="flex flex-col gap-1.5">
                    {courseTasks.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={logTaskIds.includes(t.id)}
                          onChange={() => toggleLogTask(t.id)}
                          className="rounded"
                        />
                        <span className={t.status === 'done' ? 'line-through text-gray-400' : ''}>{t.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Log block
              </button>
            </form>
          )}

          {/* Logged blocks list */}
          <div className="space-y-2">
            {blocks.length === 0 ? (
              <p className="text-sm text-gray-400">No time blocks logged yet.</p>
            ) : (
              blocks.map((b) => (
                <div key={b.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: b.course.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{b.course.name}</span>
                        <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{getCourseTypeLabel(b.course.course_type)}</span>
                        <span className="text-xs text-gray-400">{b.date}</span>
                        {b.end_time && (() => {
                          const [eh, em] = b.end_time.slice(0, 5).split(':').map(Number)
                          const startMins = eh * 60 + em - b.duration_minutes
                          const sh = Math.floor(((startMins % 1440) + 1440) % 1440 / 60)
                          const sm = ((startMins % 1440) + 1440) % 1440 % 60
                          return (
                            <span className="text-xs text-gray-400">
                              {String(sh).padStart(2, '0')}:{String(sm).padStart(2, '0')} → {b.end_time.slice(0, 5)}
                            </span>
                          )
                        })()}
                        <span className="text-xs font-semibold text-indigo-600">{formatMinutes(b.duration_minutes)}</span>
                      </div>
                      {b.notes && <p className="text-xs text-gray-500 mt-0.5">{b.notes}</p>}
                      {b.tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {b.tasks.map((bt) => (
                            <span key={bt.study_task_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {bt.study_tasks?.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => startTransition(() => deleteStudyBlock(b.id))}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none shrink-0"
                    aria-label="Delete block"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---- COURSES TAB ---- */}
      {tab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCourseForm((v) => !v)}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {showCourseForm ? 'Cancel' : '+ Add course / project'}
            </button>
          </div>

          {showCourseForm && (
            <form onSubmit={handleAddCourse} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                  placeholder="e.g. Mathematics or Portfolio site"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Type</label>
                <div className="flex gap-3 flex-wrap">
                  {(['school', 'side_project'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="courseType"
                        value={type}
                        checked={courseType === type}
                        onChange={() => setCourseType(type)}
                      />
                      {COURSE_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCourseColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        courseColor === c ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Add track
              </button>
            </form>
          )}

          <div className="space-y-4">
            {courses.length === 0 ? (
              <p className="text-sm text-gray-400">No courses or side projects yet.</p>
            ) : (
              (Object.entries(groupedCourses) as [CourseType, Course[]][]).map(([type, list]) => {
                if (list.length === 0) return null

                return (
                  <section key={type} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <h3 className="text-sm font-semibold text-gray-900">{COURSE_TYPE_LABELS[type]}</h3>
                      <span className="text-xs text-gray-400">{list.length} item{list.length === 1 ? '' : 's'}</span>
                    </div>
                    {list.map((c) => (
                      <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="text-sm text-gray-900">{c.name}</span>
                          <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{getCourseTypeLabel(c.course_type)}</span>
                        </div>
                        <button
                          onClick={() => startTransition(() => deleteCourse(c.id))}
                          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                          aria-label="Delete course"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </section>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ---- TASKS TAB ---- */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">Add a course or side project first before creating tasks.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <select
                  value={taskCourseId}
                  onChange={(e) => setTaskCourseId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                >
                  {renderCourseOptions()}
                </select>
                <button
                  onClick={() => setShowTaskForm((v) => !v)}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
                >
                  {showTaskForm ? 'Cancel' : '+ Add task'}
                </button>
              </div>

              {showTaskForm && (
                <form onSubmit={handleAddTask} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Task title *</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      placeholder="e.g. Chapter 3 exercises"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estimated time</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={taskEstHours}
                        onChange={(e) => setTaskEstHours(Number(e.target.value))}
                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      />
                      <span className="text-sm text-gray-500">h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={taskEstMinutes}
                        onChange={(e) => setTaskEstMinutes(Number(e.target.value))}
                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      />
                      <span className="text-sm text-gray-500">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Deadline</label>
                    <div className="flex gap-3 mb-2">
                      {(['none', 'day', 'range'] as const).map((dt) => (
                        <label key={dt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="taskDateType"
                            value={dt}
                            checked={taskDateType === dt}
                            onChange={() => setTaskDateType(dt)}
                          />
                          {dt === 'none' ? 'None' : dt === 'day' ? 'Specific day' : 'Range'}
                        </label>
                      ))}
                    </div>
                    {taskDateType === 'day' && (
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      />
                    )}
                    {taskDateType === 'range' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        />
                        <span className="text-sm text-gray-400">→</span>
                        <input
                          type="date"
                          value={taskDueDateEnd}
                          min={taskDueDate}
                          onChange={(e) => setTaskDueDateEnd(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hard deadline</label>
                    <input
                      type="datetime-local"
                      value={taskHardDeadline}
                      onChange={(e) => setTaskHardDeadline(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add task
                  </button>
                </form>
              )}

              <div className="space-y-4">
                {courses.every((course) => tasks.filter((t) => t.course_id === course.id).length === 0) ? (
                  <p className="text-sm text-gray-400">No tasks yet.</p>
                ) : (
                  courses.map((course) => {
                    const courseTaskList = tasks.filter((t) => t.course_id === course.id)
                    if (courseTaskList.length === 0) return null

                    return (
                      <section key={course.id} className="space-y-2">
                        <div className="flex items-center gap-2 px-1 flex-wrap">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                          <h3 className="text-sm font-semibold text-gray-900">{course.name}</h3>
                          <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{getCourseTypeLabel(course.course_type)}</span>
                          <span className="text-xs text-gray-400">{courseTaskList.length} task{courseTaskList.length === 1 ? '' : 's'}</span>
                        </div>

                        {courseTaskList.map((t) => {
                          const scheduledSessions = sessionsByTask[t.id] ?? []

                          return (
                            <div key={t.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                              <div className="px-4 py-3 flex items-center justify-between gap-3">
                                <button
                                  onClick={() => startTransition(() => cycleStudyTaskStatus(t.id, t.status))}
                                  className={`w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${
                                    t.status === 'done'
                                      ? 'bg-green-500 border-green-500'
                                      : t.status === 'in_progress'
                                      ? 'bg-amber-400 border-amber-400'
                                      : 'border-gray-300 hover:border-amber-400'
                                  }`}
                                  title={t.status === 'todo' ? 'Mark in progress' : t.status === 'in_progress' ? 'Mark done' : 'Reset to todo'}
                                  aria-label={t.status === 'todo' ? 'Mark in progress' : t.status === 'in_progress' ? 'Mark done' : 'Reset to todo'}
                                />
                                <button
                                  onClick={() => {
                                    if (editingTaskId === t.id) {
                                      setEditingTaskId(null)
                                      setEditingSessionId(null)
                                      return
                                    }

                                    openEdit(t)
                                  }}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-sm ${
                                      t.status === 'done' ? 'line-through text-gray-400' :
                                      t.status === 'in_progress' ? 'text-amber-700 font-medium' :
                                      'text-gray-900'
                                    }`}>
                                      {t.title}
                                    </span>
                                    {t.status !== 'todo' && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                        t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {t.status === 'done' ? 'Done' : 'In progress'}
                                      </span>
                                    )}
                                    {t.estimated_minutes != null && t.estimated_minutes > 0 && (
                                      <span className="text-xs text-gray-400">~{formatMinutes(t.estimated_minutes)}</span>
                                    )}
                                    {(taskMinutes[t.id] ?? 0) > 0 && (
                                      <span className="text-xs text-indigo-400">{formatMinutes(taskMinutes[t.id])} spent</span>
                                    )}
                                    {t.due_date && (
                                      <span className="text-xs text-indigo-500">
                                        {t.due_date_end ? `${t.due_date} → ${t.due_date_end}` : t.due_date}
                                      </span>
                                    )}
                                    {t.hard_deadline && (
                                      <span className="text-xs text-rose-600">
                                        Hard deadline: {formatDateTime(t.hard_deadline)}
                                      </span>
                                    )}
                                    {scheduledSessions.length > 0 && (
                                      <span className="text-xs text-sky-600">
                                        {scheduledSessions.length} scheduled
                                      </span>
                                    )}
                                  </div>
                                </button>
                                <button
                                  onClick={() => startTransition(() => deleteStudyTask(t.id))}
                                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none shrink-0"
                                  aria-label="Delete task"
                                >
                                  ×
                                </button>
                              </div>

                              {editingTaskId === t.id && (
                                <form
                                  onSubmit={handleSaveEdit}
                                  className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50"
                                >
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                      type="text"
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      required
                                      autoFocus
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Estimated time</label>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="number" min={0} max={23} value={editEstHours}
                                        onChange={(e) => setEditEstHours(Number(e.target.value))}
                                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                      />
                                      <span className="text-sm text-gray-500">h</span>
                                      <input
                                        type="number" min={0} max={59} value={editEstMinutes}
                                        onChange={(e) => setEditEstMinutes(Number(e.target.value))}
                                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                      />
                                      <span className="text-sm text-gray-500">min</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Deadline</label>
                                    <div className="flex gap-3 mb-2">
                                      {(['none', 'day', 'range'] as const).map((dt) => (
                                        <label key={dt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                          <input
                                            type="radio" name={`editDateType-${t.id}`} value={dt}
                                            checked={editDateType === dt}
                                            onChange={() => setEditDateType(dt)}
                                          />
                                          {dt === 'none' ? 'None' : dt === 'day' ? 'Specific day' : 'Range'}
                                        </label>
                                      ))}
                                    </div>
                                    {editDateType === 'day' && (
                                      <input type="date" value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                      />
                                    )}
                                    {editDateType === 'range' && (
                                      <div className="flex items-center gap-2">
                                        <input type="date" value={editDueDate}
                                          onChange={(e) => setEditDueDate(e.target.value)}
                                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        />
                                        <span className="text-sm text-gray-400">→</span>
                                        <input type="date" value={editDueDateEnd} min={editDueDate}
                                          onChange={(e) => setEditDueDateEnd(e.target.value)}
                                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Hard deadline</label>
                                    <input
                                      type="datetime-local"
                                      value={editHardDeadline}
                                      onChange={(e) => setEditHardDeadline(e.target.value)}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    />
                                  </div>
                                  <div className="border-t border-gray-200 pt-3 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <label className="block text-xs font-medium text-gray-700">Planned sessions</label>
                                      {scheduledSessions.length > 0 && (
                                        <span className="text-xs text-sky-600">{scheduledSessions.length} total</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400">These sessions appear on the Schedule and Calendar pages.</p>

                                    {scheduledSessions.length === 0 ? (
                                      <p className="text-xs text-gray-400">No sessions scheduled yet.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {scheduledSessions.map((session) => {
                                          const isEditingSession = editingSessionId === session.id

                                          return (
                                            <div key={session.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                              <button
                                                type="button"
                                                onClick={() => openEdit(t, session)}
                                                className="min-w-0 flex-1 text-left"
                                              >
                                                <p className="text-sm text-gray-800">{session.date} · {formatTimeRange(session.start_time, session.end_time)}</p>
                                                {session.notes && <p className="text-xs text-gray-500 mt-0.5">{session.notes}</p>}
                                                <p className={`mt-1 text-[11px] ${isEditingSession ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                                                  {isEditingSession ? 'Editing this session' : 'Click to edit session'}
                                                </p>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => startTransition(() => deleteStudyTaskSession(session.id))}
                                                className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none shrink-0"
                                                aria-label="Delete scheduled session"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}

                                    <div className="grid gap-2 sm:grid-cols-3">
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
                                        min={sessionStartTime}
                                        onChange={(e) => setSessionEndTime(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                      />
                                    </div>

                                    <input
                                      type="text"
                                      value={sessionNotes}
                                      onChange={(e) => setSessionNotes(e.target.value)}
                                      placeholder="Optional note for this session"
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    />

                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleAddSession(t.id)}
                                        className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-500 transition-colors"
                                      >
                                        {editingSessionId ? 'Update session' : '+ Schedule session'}
                                      </button>
                                      {editingSessionId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSessionId(null)
                                            setSessionDate(t.due_date ?? today)
                                            setSessionStartTime(getTimeValue(0))
                                            setSessionEndTime(getTimeValue(60))
                                            setSessionNotes('')
                                          }}
                                          className="text-sm px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        >
                                          Cancel session edit
                                        </button>
                                      )}
                                      <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingTaskId(null)
                                          setEditingSessionId(null)
                                        }}
                                        className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </form>
                              )}
                            </div>
                          )
                        })}
                      </section>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
