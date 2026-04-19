'use client'

import { useState, useMemo } from 'react'

type Block = {
  id: string
  course_id: string
  duration_minutes: number
  end_time: string | null
  date: string
  notes: string
  course: { name: string; color: string }
  tasks: { study_task_id: string; study_tasks: { title: string } | null }[]
}

type Props = {
  blocks: Block[]
  title?: string
}

const HOUR_HEIGHT = 52 // px per hour
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function getBlockTimes(b: Block): { startMin: number; endMin: number } | null {
  if (!b.end_time) return null
  const [h, m] = b.end_time.slice(0, 5).split(':').map(Number)
  const endMin = h * 60 + m
  const startMin = endMin - b.duration_minutes
  return { startMin, endMin }
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export default function CalendarClient({ blocks, title = 'Calendar' }: Props) {
  const todayDate = new Date()
  const todayStr = toDateStr(todayDate)

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    }), [weekStart])

  const weekDateStrs = useMemo(() => weekDays.map(toDateStr), [weekDays])

  const weekBlocks = useMemo(() =>
    blocks.filter(b => weekDateStrs.includes(b.date)),
    [blocks, weekDateStrs])

  // Compute display hour range from the week's blocks
  const { displayStart, displayEnd } = useMemo(() => {
    let minMin = 8 * 60
    let maxMin = 20 * 60
    for (const b of weekBlocks) {
      const times = getBlockTimes(b)
      if (!times) continue
      if (times.startMin < minMin) minMin = times.startMin
      if (times.endMin > maxMin) maxMin = times.endMin
    }
    return {
      displayStart: Math.max(0, Math.floor(minMin / 60) - 1),
      displayEnd: Math.min(24, Math.ceil(maxMin / 60) + 1),
    }
  }, [weekBlocks])

  const displayHours = displayEnd - displayStart
  const gridHeight = displayHours * HOUR_HEIGHT

  function prevWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })
    setSelectedBlock(null)
  }
  function nextWeek() {
    setWeekStart(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })
    setSelectedBlock(null)
  }
  function goToday() {
    setWeekStart(getMonday(new Date()))
    setSelectedBlock(null)
  }

  const weekLabel = (() => {
    const s = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const e = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${s} – ${e}`
  })()

  const byDate: Record<string, Block[]> = {}
  for (const b of weekBlocks) {
    if (!byDate[b.date]) byDate[b.date] = []
    byDate[b.date].push(b)
  }

  const noTimeDayBlocks: Record<string, Block[]> = {}
  for (const b of weekBlocks) {
    if (!b.end_time) {
      if (!noTimeDayBlocks[b.date]) noTimeDayBlocks[b.date] = []
      noTimeDayBlocks[b.date].push(b)
    }
  }
  const hasNoTimeBlocks = Object.keys(noTimeDayBlocks).length > 0

  const totalWeekMins = weekBlocks.reduce((s, b) => s + b.duration_minutes, 0)
  const selectedBlockData = selectedBlock ? blocks.find(b => b.id === selectedBlock) ?? null : null

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {totalWeekMins > 0 && (
          <span className="text-sm text-gray-500">
            Week total:{' '}
            <span className="font-semibold text-indigo-600">{formatMinutes(totalWeekMins)}</span>
          </span>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={prevWeek}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Previous week"
        >
          ←
        </button>
        <button
          onClick={goToday}
          className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Today
        </button>
        <h2 className="text-base font-semibold text-gray-900 flex-1 text-center">{weekLabel}</h2>
        <button
          onClick={nextWeek}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Day headers */}
        <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '3rem repeat(7, 1fr)' }}>
          <div />
          {weekDays.map((d, i) => {
            const isToday = weekDateStrs[i] === todayStr
            return (
              <div key={i} className={`py-2 text-center border-l border-gray-100 ${isToday ? 'bg-indigo-50' : ''}`}>
                <div className="text-xs font-medium text-gray-400">{DAYS_SHORT[i]}</div>
                <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-700'}`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* All-day row for blocks without an end time */}
        {hasNoTimeBlocks && (
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '3rem repeat(7, 1fr)' }}>
            <div className="flex items-center justify-center">
              <span className="text-xs text-gray-300">–</span>
            </div>
            {weekDateStrs.map((dateStr, i) => (
              <div key={i} className="border-l border-gray-100 p-1 flex flex-col gap-0.5 min-h-[2rem]">
                {(noTimeDayBlocks[dateStr] ?? []).map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBlock(b.id === selectedBlock ? null : b.id)}
                    className="text-xs px-1.5 py-0.5 rounded truncate text-left"
                    style={{ backgroundColor: b.course.color + '30', color: b.course.color }}
                  >
                    {b.course.name} · {formatMinutes(b.duration_minutes)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: '72vh' }}>
          <div className="grid" style={{ gridTemplateColumns: '3rem repeat(7, 1fr)' }}>

            {/* Hour labels */}
            <div className="relative select-none" style={{ height: gridHeight }}>
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

            {/* Day columns */}
            {weekDateStrs.map((dateStr, dayIdx) => {
              const isToday = dateStr === todayStr
              const timedBlocks = (byDate[dateStr] ?? []).filter(b => !!b.end_time)

              return (
                <div
                  key={dateStr}
                  className={`relative border-l border-gray-100 ${isToday ? 'bg-indigo-50/40' : ''}`}
                  style={{ height: gridHeight }}
                >
                  {/* Hour lines */}
                  {Array.from({ length: displayHours + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Half-hour lines (lighter) */}
                  {Array.from({ length: displayHours }).map((_, i) => (
                    <div
                      key={`h${i}`}
                      className="absolute left-0 right-0 border-t border-gray-50"
                      style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Study blocks */}
                  {timedBlocks.map(b => {
                    const times = getBlockTimes(b)!
                    const clampedStart = Math.max(times.startMin, displayStart * 60)
                    const clampedEnd = Math.min(times.endMin, displayEnd * 60)
                    const top = (clampedStart - displayStart * 60) / 60 * HOUR_HEIGHT
                    const height = Math.max((clampedEnd - clampedStart) / 60 * HOUR_HEIGHT, 18)
                    const isSelected = b.id === selectedBlock

                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBlock(b.id === selectedBlock ? null : b.id)}
                        className={`absolute left-0.5 right-0.5 rounded text-left overflow-hidden transition-opacity ${
                          isSelected ? 'ring-2 ring-gray-800 ring-offset-1 z-10' : 'hover:opacity-80 z-0'
                        }`}
                        style={{
                          top,
                          height,
                          backgroundColor: b.course.color + '30',
                          borderLeft: `3px solid ${b.course.color}`,
                        }}
                      >
                        <div className="px-1 pt-0.5 h-full overflow-hidden">
                          {height >= 20 && (
                            <p
                              className="text-xs font-semibold leading-tight truncate"
                              style={{ color: b.course.color }}
                            >
                              {b.course.name}
                            </p>
                          )}
                          {height >= 36 && (
                            <p className="text-xs leading-tight text-gray-500 truncate">
                              {formatMinutes(b.duration_minutes)}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedBlockData && (() => {
        const b = selectedBlockData
        const times = getBlockTimes(b)
        const timeLabel = times
          ? `${pad2(Math.floor(((times.startMin % 1440) + 1440) % 1440 / 60))}:${pad2(((times.startMin % 1440) + 1440) % 1440 % 60)} → ${b.end_time!.slice(0, 5)}`
          : null

        return (
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: b.course.color }} />
              <span className="font-semibold text-gray-900">{b.course.name}</span>
              <span className="text-sm font-semibold text-indigo-600">{formatMinutes(b.duration_minutes)}</span>
              {timeLabel && <span className="text-sm text-gray-400">{timeLabel}</span>}
              <span className="text-sm text-gray-400 ml-auto">
                {new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'short', day: 'numeric',
                })}
              </span>
            </div>
            {b.notes && <p className="text-sm text-gray-600 mb-2">{b.notes}</p>}
            {b.tasks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {b.tasks.map(bt => (
                  <span key={bt.study_task_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {bt.study_tasks?.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
