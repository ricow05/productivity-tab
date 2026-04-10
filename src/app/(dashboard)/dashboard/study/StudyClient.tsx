'use client'

import { useState, useTransition } from 'react'
import {
  addCourse,
  deleteCourse,
  addStudyTask,
  updateStudyTask,
  cycleStudyTaskStatus,
  deleteStudyTask,
  addStudyBlock,
  deleteStudyBlock,
} from './actions'

export type Course = {
  id: string
  name: string
  color: string
}

export type StudyTask = {
  id: string
  course_id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  estimated_minutes: number | null
  due_date: string | null
  due_date_end: string | null
}

export type StudyBlock = {
  id: string
  course_id: string
  duration_minutes: number
  end_time: string | null
  date: string
  notes: string
  created_at: string
  course: { name: string; color: string }
  tasks: { study_task_id: string; study_tasks: { title: string } | null }[]
}

type Props = {
  courses: Course[]
  tasks: StudyTask[]
  blocks: StudyBlock[]
  todayMinutes: number
  weekMinutes: number
  taskMinutes: Record<string, number>
  today: string
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6',
]

export default function StudyClient({ courses, tasks, blocks, todayMinutes, weekMinutes, taskMinutes, today }: Props) {
  const [, startTransition] = useTransition()

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

  // --- Task form ---
  const [taskCourseId, setTaskCourseId] = useState(courses[0]?.id ?? '')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskEstHours, setTaskEstHours] = useState(0)
  const [taskEstMinutes, setTaskEstMinutes] = useState(0)
  const [taskDateType, setTaskDateType] = useState<'none' | 'day' | 'range'>('none')
  const [taskDueDate, setTaskDueDate] = useState(today)
  const [taskDueDateEnd, setTaskDueDateEnd] = useState(today)
  const [showTaskForm, setShowTaskForm] = useState(false)

  // --- Inline edit ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editEstHours, setEditEstHours] = useState(0)
  const [editEstMinutes, setEditEstMinutes] = useState(0)
  const [editDateType, setEditDateType] = useState<'none' | 'day' | 'range'>('none')
  const [editDueDate, setEditDueDate] = useState(today)
  const [editDueDateEnd, setEditDueDateEnd] = useState(today)

  function openEdit(t: StudyTask) {
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
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || !editingTaskId) return
    const totalEst = editEstHours * 60 + editEstMinutes
    const due_date = editDateType !== 'none' ? editDueDate : null
    const due_date_end = editDateType === 'range' ? editDueDateEnd : null
    startTransition(async () => {
      await updateStudyTask(editingTaskId, {
        title: editTitle.trim(),
        estimated_minutes: totalEst > 0 ? totalEst : null,
        due_date,
        due_date_end,
      })
      setEditingTaskId(null)
    })
  }

const courseTasks = tasks.filter((t) => t.course_id === (tab === 'tasks' ? taskCourseId : logCourseId) && t.status !== 'done')

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
      await addCourse({ name: courseName.trim(), color: courseColor })
      setCourseName('')
      setCourseColor(COLORS[0])
      setShowCourseForm(false)
    })
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim() || !taskCourseId) return
    const totalEst = taskEstHours * 60 + taskEstMinutes
    const due_date = taskDateType !== 'none' ? taskDueDate : null
    const due_date_end = taskDateType === 'range' ? taskDueDateEnd : null
    startTransition(async () => {
      await addStudyTask({
        course_id: taskCourseId,
        title: taskTitle.trim(),
        estimated_minutes: totalEst > 0 ? totalEst : null,
        due_date,
        due_date_end,
      })
      setTaskTitle('')
      setTaskEstHours(0)
      setTaskEstMinutes(0)
      setTaskDateType('none')
      setTaskDueDate(today)
      setTaskDueDateEnd(today)
      setShowTaskForm(false)
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Study Tracker</h1>
        <div className="flex gap-3">
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm text-center">
            <p className="text-xs text-gray-400">Today</p>
            <p className="text-lg font-bold text-gray-900">{formatMinutes(todayMinutes)}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm text-center">
            <p className="text-xs text-gray-400">This week</p>
            <p className="text-lg font-bold text-gray-900">{formatMinutes(weekMinutes)}</p>
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
            {t === 'log' ? 'Log' : t === 'courses' ? 'Courses' : 'Tasks'}
          </button>
        ))}
      </div>

      {/* ---- LOG TAB ---- */}
      {tab === 'log' && (
        <div className="space-y-6">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">Add a course first before logging study time.</p>
          ) : (
            <form onSubmit={handleAddBlock} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">New study block</p>

              {/* Course */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course *</label>
                <select
                  value={logCourseId}
                  onChange={(e) => { setLogCourseId(e.target.value); setLogTaskIds([]) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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
              <p className="text-sm text-gray-400">No study blocks logged yet.</p>
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
              {showCourseForm ? 'Cancel' : '+ Add course'}
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
                  placeholder="e.g. Mathematics"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
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
                Add course
              </button>
            </form>
          )}

          <div className="space-y-2">
            {courses.length === 0 ? (
              <p className="text-sm text-gray-400">No courses yet.</p>
            ) : (
              courses.map((c) => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-gray-900">{c.name}</span>
                  </div>
                  <button
                    onClick={() => startTransition(() => deleteCourse(c.id))}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                    aria-label="Delete course"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---- TASKS TAB ---- */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">Add a course first before creating tasks.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <select
                  value={taskCourseId}
                  onChange={(e) => setTaskCourseId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
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
                    <label className="block text-xs font-medium text-gray-700 mb-2">Schedule</label>
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
                  <button
                    type="submit"
                    className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add task
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {tasks.filter((t) => t.course_id === taskCourseId).length === 0 ? (
                  <p className="text-sm text-gray-400">No tasks for this course yet.</p>
                ) : (
                  tasks
                    .filter((t) => t.course_id === taskCourseId)
                    .map((t) => (
                      <div key={t.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Row */}
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                          {/* Status cycle button */}
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
                          {/* Clickable task info */}
                          <button
                            onClick={() => editingTaskId === t.id ? setEditingTaskId(null) : openEdit(t)}
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
                        {/* Inline edit form */}
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
                              <label className="block text-xs font-medium text-gray-700 mb-2">Schedule</label>
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
                            <div className="flex gap-2">
                              <button type="submit" className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                                Save
                              </button>
                              <button type="button" onClick={() => setEditingTaskId(null)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
