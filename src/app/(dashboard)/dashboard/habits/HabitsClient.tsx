'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addHabit, deleteHabit, toggleHabitLog } from './actions'

export type Habit = {
  id: string
  name: string
  description: string
  type: 'lifetime' | 'timed'
  start_date: string
  end_date: string | null
  created_at: string
}

export type HabitLog = {
  habit_id: string
  date: string
  completed: boolean
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function today() {
  return formatDate(new Date())
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function displayDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

type Props = {
  date: string
  habits: Habit[]
  logs: HabitLog[]
}

export default function HabitsClient({ date, habits, logs }: Props) {
  const router = useRouter()
  const todayStr = today()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)

  // form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'lifetime' | 'timed'>('lifetime')
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState('')

  const logMap = new Map(logs.map((l) => [l.habit_id, l.completed]))

  function navigate(days: number) {
    const next = shiftDate(date, days)
    router.push(`/dashboard/habits?date=${next}`)
  }

  function handleToggle(habitId: string) {
    const current = logMap.get(habitId) ?? false
    startTransition(() => toggleHabitLog(habitId, date, current))
  }

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      await addHabit({
        name: name.trim(),
        description: description.trim(),
        type,
        start_date: startDate,
        end_date: type === 'timed' && endDate ? endDate : null,
      })
      setName('')
      setDescription('')
      setType('lifetime')
      setStartDate(todayStr)
      setEndDate('')
      setShowForm(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteHabit(id))
  }

  const completedCount = habits.filter((h) => logMap.get(h.id) === true).length

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Daily Habits</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New habit'}
        </button>
      </div>

      {/* Add habit form */}
      {showForm && (
        <form
          onSubmit={handleAddHabit}
          className="border border-gray-200 rounded-xl p-4 mb-6 space-y-3 bg-gray-50"
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Morning walk"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-3">
              {(['lifetime', 'timed'] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => setType(t)}
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            {type === 'timed' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  required={type === 'timed'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Add habit
          </button>
        </form>
      )}

      {/* Date navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          ← Prev
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{displayDate(date)}</p>
          {date !== todayStr && (
            <button
              onClick={() => router.push('/dashboard/habits')}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Go to today
            </button>
          )}
        </div>
        <button
          onClick={() => navigate(1)}
          className="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{completedCount} / {habits.length} completed</span>
            <span>{Math.round((completedCount / habits.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-gray-900 h-2 rounded-full transition-all"
              style={{ width: `${habits.length > 0 ? (completedCount / habits.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Habits list */}
      {habits.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">◈</p>
          <p className="text-sm">No habits yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const done = logMap.get(habit.id) ?? false
            return (
              <div
                key={habit.id}
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl transition-colors ${
                  done ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  onClick={() => handleToggle(habit.id)}
                  disabled={isPending}
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    done
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                >
                  {done && <span className="text-xs leading-none">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {habit.name}
                  </p>
                  {habit.description && (
                    <p className="text-xs text-gray-400 truncate">{habit.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {habit.type === 'timed' && habit.end_date && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      until {new Date(habit.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {habit.type === 'lifetime' && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">lifetime</span>
                  )}
                  <button
                    onClick={() => handleDelete(habit.id)}
                    disabled={isPending}
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    aria-label="Delete habit"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
