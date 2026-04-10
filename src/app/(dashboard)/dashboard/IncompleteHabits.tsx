'use client'

import { useTransition } from 'react'
import { toggleHabitLog } from './habits/actions'

type Habit = { id: string; name: string }

export default function IncompleteHabits({ habits, today, allDone }: { habits: Habit[]; today: string; allDone: boolean }) {
  const [, startTransition] = useTransition()

  function complete(id: string) {
    startTransition(() => toggleHabitLog(id, today, false))
  }

  if (allDone) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm w-full flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <p className="text-sm text-gray-500">All habits done today!</p>
      </div>
    )
  }

  if (habits.length === 0) return null

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm w-full">
      <p className="text-sm text-gray-500 mb-3">Habits not yet done today</p>
      <ul className="flex flex-col gap-2">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center gap-3 text-gray-800">
            <button
              onClick={() => complete(h.id)}
              className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-100 transition-colors shrink-0"
              aria-label={`Complete ${h.name}`}
            />
            {h.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
