import { useEffect, useState } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Combobox } from './Combobox'
import { getLeaveTypes, type LeaveTypeOption } from '../../services/leaves'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import type { LeaveDay, LeaveDayType, LeaveRequestPayload } from '../../types/leave'

export type { LeaveDay, LeaveDayType, LeaveRequestPayload }

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLong(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TYPE_LABEL: Record<LeaveDayType, string> = { full: 'All day', half: 'Half day', custom: 'Custom' }

interface LeaveRequestDialogProps {
  onClose: () => void
  onSubmit: (payload: LeaveRequestPayload) => void
}

export function LeaveRequestDialog({ onClose, onSubmit }: LeaveRequestDialogProps) {
  const today = new Date()
  const [month, setMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
  const [dates, setDates] = useState<Map<string, LeaveDay>>(new Map())
  const [leaveType, setLeaveType] = useState<string>('')
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useFetchOnce(() => {
    setLoadingTypes(true)
    getLeaveTypes()
      .then((data) => { setLeaveTypes(data); setTypeError(null) })
      .catch((err) => setTypeError(err instanceof Error ? err.message : 'Failed to load leave types.'))
      .finally(() => setLoadingTypes(false))
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  function toggleDate(d: Date) {
    const key = ymd(d)
    setDates((prev) => {
      const n = new Map(prev)
      if (n.has(key)) n.delete(key)
      else n.set(key, { type: 'full', fromTime: '09:00', endTime: '17:00' })
      return n
    })
  }

  function setDayType(key: string, type: LeaveDayType) {
    setDates((prev) => {
      const n = new Map(prev)
      const d = n.get(key)
      if (d) n.set(key, { ...d, type })
      return n
    })
  }

  function setDayTime(key: string, field: 'fromTime' | 'endTime', value: string) {
    setDates((prev) => {
      const n = new Map(prev)
      const d = n.get(key)
      if (d) n.set(key, { ...d, [field]: value })
      return n
    })
  }

  function removeDate(key: string) {
    setDates((prev) => {
      const n = new Map(prev)
      n.delete(key)
      return n
    })
  }

  const startDow = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d))
  while (cells.length < 42) cells.push(null)

  const todayKey = ymd(today)

  async function handleSubmit() {
    if (!leaveType) {
      setSubmitError('Pick a leave type.')
      return
    }
    if (dates.size === 0) {
      setSubmitError('Pick at least one date.')
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      const ordered = Array.from(dates.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, day]) => ({ date, day }))
      await new Promise((r) => setTimeout(r, 400))
      onSubmit({ leaveType, days: ordered })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const sortedKeys = Array.from(dates.keys()).sort()

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={submitting ? undefined : onClose}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-2xl max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — pinned */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">New Leave Request</h2>
              <p className="text-sm text-gray-500 mt-0.5">Pick the dates you need off and how long each one is.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body — scrolls */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
            {/* Leave type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <Combobox
                options={leaveTypes}
                value={leaveType ? [leaveType] : []}
                onChange={(vs) => setLeaveType(vs[0] ?? '')}
                max={1}
                placeholder="Select a leave type"
                loading={loadingTypes}
              />
              {typeError && <p className="text-xs text-red-500 mt-1">{typeError}</p>}
            </div>

            {/* Calendar */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DOW.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((c, i) => {
                  if (!c) return <div key={i} className="h-9" />
                  const key = ymd(c)
                  const selected = dates.has(key)
                  const isToday = key === todayKey
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDate(c)}
                      className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : isToday
                            ? 'border border-blue-400 text-blue-600 hover:bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {c.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected dates */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-3 mt-1">
                Selected{dates.size > 0 ? ` (${dates.size})` : ''}
              </h3>
              {dates.size === 0 ? (
                <p className="text-sm text-gray-400">Pick one or more dates from the calendar above.</p>
              ) : (
                <div className="space-y-2">
                  {sortedKeys.map((key) => {
                    const day = dates.get(key)!
                    return (
                      <div key={key} className="border border-gray-200 rounded-lg p-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                        <span className="text-sm font-medium text-gray-900 min-w-[96px]">{formatLong(key)}</span>

                        <div className="inline-flex border border-gray-200 rounded-lg overflow-hidden text-xs">
                          {(['full', 'half', 'custom'] as LeaveDayType[]).map((t, idx) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setDayType(key, t)}
                              className={`px-2.5 py-1.5 transition-colors ${idx > 0 ? 'border-l border-gray-200' : ''} ${
                                day.type === t
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {TYPE_LABEL[t]}
                            </button>
                          ))}
                        </div>

                        {day.type === 'custom' && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="time"
                              value={day.fromTime}
                              onChange={(e) => setDayTime(key, 'fromTime', e.target.value)}
                              className="form-input py-1 px-1.5 text-xs w-[92px]"
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={day.endTime}
                              onChange={(e) => setDayTime(key, 'endTime', e.target.value)}
                              className="form-input py-1 px-1.5 text-xs w-[92px]"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => removeDate(key)}
                          className="ml-auto p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Remove ${formatLong(key)}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-600 text-sm">{submitError}</span>
              </div>
            )}
          </div>

          {/* Footer — pinned */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || dates.size === 0 || !leaveType}
              className="btn-primary min-w-[160px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
