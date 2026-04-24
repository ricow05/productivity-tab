'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  addStudent,
  addTeachingMoment,
  deleteTeachingMoment,
  setStudentActive as updateStudentActive,
  toggleTeachingMomentPaid,
  updateStudent,
  updateTeachingMoment,
} from './actions'

export type Student = {
  id: string
  name: string
  phone: string
  email: string
  hourly_rate: number | string
  active: boolean
  default_payment_method: 'cash' | 'bank_transfer'
  default_location_type: 'online' | 'in_person'
  created_at: string
}

export type TeachingMoment = {
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
  created_at: string
}

type Props = {
  students: Student[]
  moments: TeachingMoment[]
  today: string
}

function minutesBetween(start: string, end: string) {
  const [startHour, startMinute] = start.slice(0, 5).split(':').map(Number)
  const [endHour, endMinute] = end.slice(0, 5).split(':').map(Number)
  return endHour * 60 + endMinute - (startHour * 60 + startMinute)
}

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value ?? 0))
}

function formatMomentDate(value: string) {
  return new Date(value + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function TutoringClient({ students, moments, today }: Props) {
  const [, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editMomentParam = searchParams.get('editMoment')

  const allStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students]
  )
  const activeStudents = allStudents.filter((student) => student.active)
  const defaultStudentId = activeStudents[0]?.id ?? allStudents[0]?.id ?? ''

  const [selectedStudentId, setSelectedStudentId] = useState(defaultStudentId)
  const [showStudentForm, setShowStudentForm] = useState(allStudents.length === 0)
  const [showAllStudents, setShowAllStudents] = useState(false)
  const [showUnpaidSessions, setShowUnpaidSessions] = useState(false)
  const [showMomentForm, setShowMomentForm] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null)
  const [momentStudentId, setMomentStudentId] = useState(defaultStudentId)

  const [studentName, setStudentName] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentRate, setStudentRate] = useState('25')
  const [studentActive, setStudentActive] = useState(true)
  const [studentDefaultPaymentMethod, setStudentDefaultPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash')
  const [studentDefaultLocationType, setStudentDefaultLocationType] = useState<'online' | 'in_person'>('in_person')

  const [momentDate, setMomentDate] = useState(today)
  const [momentStartTime, setMomentStartTime] = useState('16:00')
  const [momentEndTime, setMomentEndTime] = useState('17:00')
  const [momentPrice, setMomentPrice] = useState('')
  const [momentPaid, setMomentPaid] = useState(false)
  const [momentPaymentMethod, setMomentPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash')
  const [momentLocationType, setMomentLocationType] = useState<'online' | 'in_person'>('in_person')
  const [momentTransferNote, setMomentTransferNote] = useState('')
  const [momentNotes, setMomentNotes] = useState('')

  const selectedStudent = allStudents.find((student) => student.id === selectedStudentId) ?? null
  const currentMomentStudent = allStudents.find((student) => student.id === momentStudentId) ?? null

  const selectedMoments = useMemo(() => {
    if (!selectedStudent) return []

    return moments
      .filter((moment) => moment.student_id === selectedStudent.id)
      .sort((left, right) => {
        const leftValue = `${left.date}T${left.start_time}`
        const rightValue = `${right.date}T${right.start_time}`
        return rightValue.localeCompare(leftValue)
      })
  }, [moments, selectedStudent])

  const unpaidMoments = moments.filter((moment) => !moment.paid)
  const unpaidCount = unpaidMoments.length
  const outstandingAmount = unpaidMoments.reduce((sum, moment) => sum + Number(moment.price ?? 0), 0)
  const totalRevenue = moments.reduce((sum, moment) => sum + Number(moment.price ?? 0), 0)

  const suggestedPrice = currentMomentStudent
    ? (Number(currentMomentStudent.hourly_rate ?? 0) * Math.max(minutesBetween(momentStartTime, momentEndTime), 0)) / 60
    : 0

  function getStudentDefaults(studentId: string) {
    const student = allStudents.find((item) => item.id === studentId)
    return {
      paymentMethod: student?.default_payment_method ?? 'cash',
      locationType: student?.default_location_type ?? 'in_person',
    }
  }

  function openMomentForm(studentId: string) {
    setEditingMomentId(null)
    setSelectedStudentId(studentId)
    setMomentStudentId(studentId)
    setMomentDate(today)
    setMomentStartTime('16:00')
    setMomentEndTime('17:00')
    const defaults = getStudentDefaults(studentId)
    setMomentPrice('')
    setMomentPaid(false)
    setMomentPaymentMethod(defaults.paymentMethod)
    setMomentLocationType(defaults.locationType)
    setMomentTransferNote('')
    setMomentNotes('')
    setShowMomentForm(true)
  }

  function openEditMoment(moment: TeachingMoment) {
    setEditingMomentId(moment.id)
    setSelectedStudentId(moment.student_id)
    setMomentStudentId(moment.student_id)
    setMomentDate(moment.date)
    setMomentStartTime(moment.start_time.slice(0, 5))
    setMomentEndTime(moment.end_time.slice(0, 5))
    setMomentPrice(String(Number(moment.price ?? 0)))
    setMomentPaid(moment.paid)
    setMomentPaymentMethod(moment.payment_method)
    setMomentLocationType(moment.location_type)
    setMomentTransferNote(moment.transfer_note)
    setMomentNotes(moment.notes)
    setShowMomentForm(true)
  }

  function openEditStudent(student: Student) {
    setEditingStudentId(student.id)
    setSelectedStudentId(student.id)
    setStudentName(student.name)
    setStudentPhone(student.phone)
    setStudentEmail(student.email)
    setStudentRate(String(Number(student.hourly_rate ?? 0)))
    setStudentActive(student.active)
    setStudentDefaultPaymentMethod(student.default_payment_method)
    setStudentDefaultLocationType(student.default_location_type)
    setShowStudentForm(true)
  }

  useEffect(() => {
    if (!editMomentParam) return

    const moment = moments.find((item) => item.id === editMomentParam)
    if (!moment) return

    openEditMoment(moment)
    router.replace('/dashboard/tutoring', { scroll: false })
  }, [editMomentParam, moments, router])

  function resetStudentForm() {
    setEditingStudentId(null)
    setStudentName('')
    setStudentPhone('')
    setStudentEmail('')
    setStudentRate('25')
    setStudentActive(true)
    setStudentDefaultPaymentMethod('cash')
    setStudentDefaultLocationType('in_person')
    setShowStudentForm(false)
  }

  function handleAddStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentName.trim()) return

    const payload = {
      name: studentName.trim(),
      phone: studentPhone.trim(),
      email: studentEmail.trim(),
      hourly_rate: Number(studentRate || 0),
      active: studentActive,
      default_payment_method: studentDefaultPaymentMethod,
      default_location_type: studentDefaultLocationType,
    }

    startTransition(async () => {
      if (editingStudentId) {
        await updateStudent(editingStudentId, payload)
      } else {
        await addStudent(payload)
      }

      resetStudentForm()
    })
  }

  function handleAddMoment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!momentStudentId || !momentDate || !momentStartTime || !momentEndTime) return

    const duration = minutesBetween(momentStartTime, momentEndTime)
    if (duration <= 0) return

    const payload = {
      student_id: momentStudentId,
      date: momentDate,
      start_time: momentStartTime,
      end_time: momentEndTime,
      price: Number(momentPrice || suggestedPrice || 0),
      paid: momentPaid,
      payment_method: momentPaymentMethod,
      location_type: momentLocationType,
      transfer_note: momentTransferNote.trim(),
      notes: momentNotes.trim(),
    }

    startTransition(async () => {
      if (editingMomentId) {
        await updateTeachingMoment(editingMomentId, payload)
      } else {
        await addTeachingMoment(payload)
      }

      setEditingMomentId(null)
      setMomentDate(today)
      setMomentStartTime('16:00')
      setMomentEndTime('17:00')
      setMomentPrice('')
      setMomentPaid(false)
      setMomentPaymentMethod('cash')
      setMomentLocationType('in_person')
      setMomentTransferNote('')
      setMomentNotes('')
      setShowMomentForm(false)
    })
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-900">Tutoring</h1>
        <div className="flex gap-3 flex-wrap">
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm text-center min-w-28">
            <p className="text-xs text-gray-400">Active students</p>
            <p className="text-lg font-bold text-gray-900">{activeStudents.length}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm text-center min-w-28">
            <p className="text-xs text-gray-400">Unpaid</p>
            <p className="text-lg font-bold text-amber-600">{unpaidCount}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowUnpaidSessions((value) => !value)}
            className="bg-white rounded-xl px-4 py-2 shadow-sm text-center min-w-28 hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs text-gray-400">Outstanding</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(outstandingAmount)}</p>
          </button>
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm text-center min-w-28">
            <p className="text-xs text-gray-400">Total planned</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {showUnpaidSessions && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Unpaid sessions</h2>
            <span className="text-sm text-amber-700 font-medium">
              {formatCurrency(outstandingAmount)} open
            </span>
          </div>

          {unpaidMoments.length === 0 ? (
            <p className="text-sm text-gray-500">No unpaid sessions.</p>
          ) : (
            <div className="space-y-2">
              {unpaidMoments
                .slice()
                .sort((left, right) => `${right.date}T${right.start_time}`.localeCompare(`${left.date}T${left.start_time}`))
                .map((moment) => {
                  const student = allStudents.find((item) => item.id === moment.student_id)
                  return (
                    <button
                      key={`unpaid-${moment.id}`}
                      type="button"
                      onClick={() => openEditMoment(moment)}
                      className="w-full text-left border border-amber-100 rounded-xl p-3 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student?.name ?? 'Student'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatMomentDate(moment.date)} · {moment.start_time.slice(0, 5)} - {moment.end_time.slice(0, 5)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-amber-700">{formatCurrency(moment.price)}</span>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => {
            if (showStudentForm) {
              resetStudentForm()
            } else {
              setEditingStudentId(null)
              setShowStudentForm(true)
            }
          }}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {showStudentForm ? 'Close student form' : '+ Add student'}
        </button>
        <button
          onClick={() => openMomentForm(selectedStudent?.id ?? defaultStudentId)}
          disabled={!defaultStudentId}
          className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors disabled:bg-gray-300"
        >
          + Add teaching moment
        </button>
      </div>

      {showStudentForm && (
        <form onSubmit={handleAddStudent} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-700">
              {editingStudentId ? 'Edit student' : 'New student'}
            </p>
            {editingStudentId && (
              <button
                type="button"
                onClick={resetStudentForm}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel editing
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price per hour</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={studentRate}
                onChange={(event) => setStudentRate(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Telephone number</label>
              <input
                type="text"
                value={studentPhone}
                onChange={(event) => setStudentPhone(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Usually</label>
              <select
                value={studentDefaultLocationType}
                onChange={(event) => setStudentDefaultLocationType(event.target.value as 'online' | 'in_person')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="in_person">In person</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Usually pays by</label>
              <select
                value={studentDefaultPaymentMethod}
                onChange={(event) => setStudentDefaultPaymentMethod(event.target.value as 'cash' | 'bank_transfer')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={studentActive}
              onChange={(event) => setStudentActive(event.target.checked)}
            />
            Active student
          </label>
          <button
            type="submit"
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {editingStudentId ? 'Update student' : 'Save student'}
          </button>
        </form>
      )}

      {showMomentForm && (
        <form onSubmit={handleAddMoment} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-700">
              {editingMomentId ? 'Edit teaching moment' : 'New teaching moment'}
            </p>
            {editingMomentId && (
              <button
                type="button"
                onClick={() => {
                  setEditingMomentId(null)
                  setShowMomentForm(false)
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel editing
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Student *</label>
              <select
                required
                value={momentStudentId}
                onChange={(event) => {
                  const nextStudentId = event.target.value
                  const defaults = getStudentDefaults(nextStudentId)
                  setMomentStudentId(nextStudentId)
                  setMomentPaymentMethod(defaults.paymentMethod)
                  setMomentLocationType(defaults.locationType)
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                {allStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={momentDate}
                onChange={(event) => setMomentDate(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={momentPrice}
                onChange={(event) => setMomentPrice(event.target.value)}
                placeholder={suggestedPrice > 0 ? `${suggestedPrice.toFixed(2)}` : '0.00'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to use the hourly rate automatically.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start hour *</label>
              <input
                type="time"
                required
                value={momentStartTime}
                onChange={(event) => setMomentStartTime(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End hour *</label>
              <input
                type="time"
                required
                value={momentEndTime}
                onChange={(event) => setMomentEndTime(event.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <select
                value={momentLocationType}
                onChange={(event) => setMomentLocationType(event.target.value as 'online' | 'in_person')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="in_person">In person</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment method</label>
              <select
                value={momentPaymentMethod}
                onChange={(event) => setMomentPaymentMethod(event.target.value as 'cash' | 'bank_transfer')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank transfer note</label>
              <input
                type="text"
                value={momentTransferNote}
                onChange={(event) => setMomentTransferNote(event.target.value)}
                placeholder="Reference or file note"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={momentNotes}
              onChange={(event) => setMomentNotes(event.target.value)}
              placeholder="Optional"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={momentPaid}
              onChange={(event) => setMomentPaid(event.target.checked)}
            />
            Already paid
          </label>

          <button
            type="submit"
            className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-500 transition-colors"
          >
            {editingMomentId ? 'Update teaching moment' : 'Save teaching moment'}
          </button>
        </form>
      )}

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Active students</h2>
              <span className="text-sm text-gray-400">{activeStudents.length} total</span>
            </div>

            {activeStudents.length === 0 ? (
              <p className="text-sm text-gray-500">No active students yet.</p>
            ) : (
              <div className="space-y-2">
                {activeStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`w-full border rounded-xl p-4 transition-colors ${
                      selectedStudentId === student.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(student.id)}
                        className="text-left"
                      >
                        <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{student.phone || 'No phone'}{student.email ? ` · ${student.email}` : ''}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Usually {student.default_location_type === 'online' ? 'online' : 'in person'} · {student.default_payment_method === 'bank_transfer' ? 'bank transfer' : 'cash'}
                        </p>
                        <p className="text-xs text-emerald-700 mt-1">{formatCurrency(student.hourly_rate)} / hour</p>
                      </button>
                      <div className="shrink-0 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditStudent(student)}
                          className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openMomentForm(student.id)}
                          className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          + Session
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <button
              onClick={() => setShowAllStudents((value) => !value)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-lg font-semibold text-gray-900">All students</span>
              <span className="text-sm text-gray-400">{showAllStudents ? 'Hide' : 'Show'}</span>
            </button>

            {showAllStudents && (
              <div className="mt-4 space-y-2">
                {allStudents.map((student) => (
                  <div key={student.id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <button
                        onClick={() => setSelectedStudentId(student.id)}
                        className="text-sm font-medium text-gray-900 hover:text-emerald-700 transition-colors"
                      >
                        {student.name}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {student.active ? 'Active' : 'Inactive'} · {student.default_location_type === 'online' ? 'online' : 'in person'} · {student.default_payment_method === 'bank_transfer' ? 'bank transfer' : 'cash'}
                      </p>
                    </div>
                    <button
                      onClick={() => startTransition(async () => {
                        await updateStudentActive(student.id, !student.active)
                      })}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        student.active
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {student.active ? 'Set inactive' : 'Set active'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {selectedStudent ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedStudent.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedStudent.phone || 'No phone'}{selectedStudent.email ? ` · ${selectedStudent.email}` : ''}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Usually {selectedStudent.default_location_type === 'online' ? 'online' : 'in person'} · {selectedStudent.default_payment_method === 'bank_transfer' ? 'bank transfer' : 'cash'}
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">{formatCurrency(selectedStudent.hourly_rate)} / hour</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => openEditStudent(selectedStudent)}
                    className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Edit student
                  </button>
                  <button
                    onClick={() => openMomentForm(selectedStudent.id)}
                    className="bg-emerald-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    + New teaching moment
                  </button>
                  <button
                    onClick={() => startTransition(async () => {
                      await updateStudentActive(selectedStudent.id, !selectedStudent.active)
                    })}
                    className="bg-gray-100 text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {selectedStudent.active ? 'Set inactive' : 'Set active'}
                  </button>
                </div>
              </div>

              {selectedMoments.length === 0 ? (
                <p className="text-sm text-gray-500">No teaching moments saved for this student yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedMoments.map((moment) => {
                    const duration = minutesBetween(moment.start_time, moment.end_time)
                    const hours = Math.floor(duration / 60)
                    const minutes = duration % 60

                    return (
                      <div
                        key={moment.id}
                        className="w-full border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditMoment(moment)}
                            className="text-left flex-1 min-w-0"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{formatMomentDate(moment.date)}</span>
                              <span className="text-xs text-gray-400">{moment.start_time.slice(0, 5)} - {moment.end_time.slice(0, 5)}</span>
                              <span className="text-xs text-emerald-700 font-semibold">{formatCurrency(moment.price)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {hours > 0 ? `${hours}h ` : ''}{minutes}m · {moment.location_type === 'online' ? 'Online' : 'In person'} · {moment.payment_method === 'bank_transfer' ? 'Bank transfer' : 'Cash'}
                            </p>
                            {(moment.transfer_note || moment.notes) && (
                              <p className="text-xs text-gray-500 mt-1">
                                {[moment.transfer_note, moment.notes].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </button>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => startTransition(async () => {
                                await toggleTeachingMomentPaid(moment.id, !moment.paid)
                              })}
                              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                moment.paid
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {moment.paid ? 'Paid' : 'Mark paid'}
                            </button>
                            <button
                              type="button"
                              onClick={() => startTransition(async () => {
                                await deleteTeachingMoment(moment.id)
                              })}
                              className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                              aria-label="Delete teaching moment"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Select a student to see all teaching moments.</p>
          )}
        </div>
      </div>
    </div>
  )
}
