'use client'

import { useState, useTransition } from 'react'
import { addStudyBlock, cycleStudyTaskStatus } from './study/actions'

type Task = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  due_date_end: string | null
  course: { id: string; name: string; color: string }
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function TodayStudyTasks({ tasks, today, taskMinutes }: { tasks: Task[]; today: string; taskMinutes: Record<string, number> }) {
  const [, startTransition] = useTransition()
  // logTaskId -> which task the mini form is open for
  const [loggingTaskId, setLoggingTaskId] = useState<string | null>(null)
  const [logHours, setLogHours] = useState(0)
  const [logMinutes, setLogMinutes] = useState(30)
  const [logEndTime, setLogEndTime] = useState('')
  const [logNotes, setLogNotes] = useState('')

  if (tasks.length === 0) return null

  function openLog(id: string) {
    setLoggingTaskId(id)
    setLogHours(0)
    setLogMinutes(30)
    const now = new Date()
    setLogEndTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setLogNotes('')
  }

  function handleLog(e: React.FormEvent, task: Task) {
    e.preventDefault()
    const total = logHours * 60 + logMinutes
    if (total <= 0) return
    startTransition(async () => {
      await addStudyBlock({
        course_id: task.course.id,
        duration_minutes: total,
        end_time: logEndTime || null,
        date: today,
        notes: logNotes.trim(),
        task_ids: [task.id],
      })
      setLoggingTaskId(null)
    })
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500 mb-3">Study tasks due today</p>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5">
              {/* Status cycle button */}
              <button
                onClick={() => startTransition(() => cycleStudyTaskStatus(t.id, t.status))}
                className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                  t.status === 'done'
                    ? 'bg-green-500 border-green-500'
                    : t.status === 'in_progress'
                    ? 'bg-amber-400 border-amber-400'
                    : 'border-gray-300 hover:border-amber-400'
                }`}
                title={t.status === 'todo' ? 'Mark in progress' : t.status === 'in_progress' ? 'Mark done' : 'Reset to todo'}
                aria-label={t.status === 'todo' ? 'Mark in progress' : t.status === 'in_progress' ? 'Mark done' : 'Reset to todo'}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 truncate block">{t.title}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-xs font-medium"
                    style={{ color: t.course.color }}
                  >
                    {t.course.name}
                  </span>
                  {t.due_date && (
                    <span className="text-xs text-gray-400">
                      {t.due_date_end ? `${t.due_date} → ${t.due_date_end}` : t.due_date}
                    </span>
                  )}
                  {(taskMinutes[t.id] ?? 0) > 0 && (
                    <span className="text-xs text-blue-500 font-medium">{formatMinutes(taskMinutes[t.id])}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => loggingTaskId === t.id ? setLoggingTaskId(null) : openLog(t.id)}
                className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 transition-colors shrink-0"
              >
                + Log time
              </button>
            </div>

            {loggingTaskId === t.id && (
              <form
                onSubmit={(e) => handleLog(e, t)}
                className="border-t border-gray-100 px-3 py-3 bg-gray-50 space-y-2"
              >
                <div className="flex gap-2 items-center">
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
                  <span className="text-xs text-gray-400 ml-1">{logHours * 60 + logMinutes > 0 ? formatMinutes(logHours * 60 + logMinutes) : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time" value={logEndTime}
                    onChange={(e) => setLogEndTime(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                  {logEndTime && (logHours * 60 + logMinutes) > 0 && (() => {
                    const [eh, em] = logEndTime.split(':').map(Number)
                    const startMins = eh * 60 + em - (logHours * 60 + logMinutes)
                    const sh = Math.floor(((startMins % 1440) + 1440) % 1440 / 60)
                    const sm = ((startMins % 1440) + 1440) % 1440 % 60
                    return <span className="text-xs text-gray-400">{String(sh).padStart(2,'0')}:{String(sm).padStart(2,'0')} → {logEndTime}</span>
                  })()}
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
                    onClick={() => setLoggingTaskId(null)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
