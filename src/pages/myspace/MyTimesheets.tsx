import { useState, useEffect } from 'react'
import { Clock, RefreshCw, Timer, CheckCircle2, FileEdit, Loader2, CalendarDays, Plus } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { useToast } from '../../hooks/useToast'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getMyTimesheets, getMyAttendance } from '../../services/timesheets'
import type { Timesheet, TimesheetStatus, AttendanceDay, AttendanceDayStatus } from '../../services/timesheets'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<TimesheetStatus, 'yellow' | 'green' | 'gray'> = {
  Draft: 'yellow',
  Submitted: 'green',
  Cancelled: 'gray',
}

const ATTENDANCE_STYLE: Record<AttendanceDayStatus, { bg: string; text: string; dot: string; label: string }> = {
  'Present':         { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Present' },
  'Absent':          { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Absent' },
  'Half Day':        { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Half Day' },
  'Work From Home':  { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'WFH' },
  'On Leave':        { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500',  label: 'Leave' },
}

const ATTENDANCE_BADGE: Record<AttendanceDayStatus, 'green' | 'red' | 'yellow' | 'blue' | 'purple'> = {
  'Present':        'green',
  'Absent':         'red',
  'Half Day':       'yellow',
  'Work From Home': 'blue',
  'On Leave':       'purple',
}

const DOW_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type MonthMode = 'this' | 'last' | 'custom'

function formatDate(date: string): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtHours(h: number): string {
  if (!h) return '0h'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function thisMonthHours(sheets: Timesheet[]): number {
  const now = new Date()
  return sheets
    .filter((s) => {
      if (!s.startDate) return false
      const d = new Date(s.startDate)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, s) => sum + s.totalHours, 0)
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function resolveYearMonth(mode: MonthMode, custom: string): [number, number] {
  const now = new Date()
  if (mode === 'this') return [now.getFullYear(), now.getMonth()]
  if (mode === 'last') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return [d.getFullYear(), d.getMonth()]
  }
  // custom: YYYY-MM
  const parts = custom.split('-')
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  if (!Number.isNaN(y) && !Number.isNaN(m)) return [y, m]
  return [now.getFullYear(), now.getMonth()]
}

function buildCalendarCells(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<Date | null> = Array(firstDay.getDay()).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── Attendance Calendar ───────────────────────────────────────────────────────

function AttendanceCalendar() {
  const now = new Date()
  const defaultCustom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const { addToast } = useToast()
  const [mode, setMode] = useState<MonthMode>('this')
  const [customValue, setCustomValue] = useState(defaultCustom)
  const [attendance, setAttendance] = useState<AttendanceDay[]>([])
  const [attLoading, setAttLoading] = useState(true)
  const [attError, setAttError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Date | null>(now)

  // Per-day detail fetch
  const [detailAtt, setDetailAtt] = useState<AttendanceDay | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [year, month] = resolveYearMonth(mode, customValue)

  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth())

  useEffect(() => {
    if (isFuture) {
      addToast('No attendance data for future months.', 'warning')
      setAttendance([])
      setAttLoading(false)
      return
    }
    let cancelled = false
    setAttLoading(true)
    setAttError(null)
    const { from, to } = getMonthRange(year, month)
    getMyAttendance(from, to)
      .then((data) => { if (!cancelled) setAttendance(data) })
      .catch((err) => { if (!cancelled) setAttError(err instanceof Error ? err.message : 'Failed to load attendance.') })
      .finally(() => { if (!cancelled) setAttLoading(false) })
    return () => { cancelled = true }
  }, [year, month, isFuture, addToast])

  // Fetch attendance detail for the selected day
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    const dateStr = toDateStr(selected)
    setDetailLoading(true)
    setDetailError(null)
    setDetailAtt(null)
    getMyAttendance(dateStr, dateStr)
      .then((data) => { if (!cancelled) setDetailAtt(data[0] ?? null) })
      .catch((err) => { if (!cancelled) setDetailError(err instanceof Error ? err.message : 'Failed to load record.') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selected])

  const attMap = new Map(attendance.map((a) => [a.date, a]))
  const cells = buildCalendarCells(year, month)
  const todayStr = toDateStr(now)

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const modeBtn = (m: MonthMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        mode === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

        {/* ── Left: Calendar ── */}
        <div className="p-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Attendance</h2>
              <p className="text-xs text-gray-500 mt-0.5">{monthLabel}</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {modeBtn('this', 'This Month')}
              {modeBtn('last', 'Last Month')}
              {modeBtn('custom', 'Custom')}
            </div>
          </div>

          {/* Custom month picker */}
          {mode === 'custom' && (
            <div className="mb-4">
              <input
                type="month"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="form-input w-44"
              />
            </div>
          )}

          {/* Calendar */}
          {attLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : attError ? (
            <div className="py-6 text-center text-sm text-red-600">{attError}</div>
          ) : (
            <>
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DOW_HEADERS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} />
                  const dateStr = toDateStr(date)
                  const att = attMap.get(dateStr)
                  const style = att ? ATTENDANCE_STYLE[att.status] : null
                  const isToday = dateStr === todayStr
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6
                  const isSelected = selected !== null && toDateStr(selected) === dateStr

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelected(date)}
                      className={[
                        'cal-day flex flex-col items-center justify-center rounded-lg min-h-[44px] px-1 py-1.5 select-none transition-colors relative',
                        style ? style.bg : isWeekend ? 'bg-gray-50' : 'bg-white border border-gray-100',
                        isToday ? 'ring-2 ring-blue-400 ring-offset-1' : '',
                        isSelected ? 'ring-2 ring-blue-600 ring-offset-1 scale-105' : '',
                      ].join(' ')}
                    >
                      <span className={`text-xs font-semibold leading-none ${style ? style.text : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </span>
                      {style && (
                        <span className={`text-[9px] font-medium leading-none mt-1 ${style.text}`}>
                          {style.label}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                {(Object.entries(ATTENDANCE_STYLE) as [AttendanceDayStatus, typeof ATTENDANCE_STYLE[AttendanceDayStatus]][]).map(([, s]) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="text-xs text-gray-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Right: Detail panel ── */}
        <div className="p-5">
          {selected ? (
            <>
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-900">Attendance Record</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : detailError ? (
                <div className="py-6 text-center text-sm text-red-600">{detailError}</div>
              ) : detailAtt ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge variant={ATTENDANCE_BADGE[detailAtt.status]}>{detailAtt.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Working Hours</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {detailAtt.workingHours ? fmtHours(detailAtt.workingHours) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Late Entry</span>
                    <span className={`text-sm font-medium ${detailAtt.lateEntry ? 'text-amber-600' : 'text-gray-400'}`}>
                      {detailAtt.lateEntry ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-500">Early Exit</span>
                    <span className={`text-sm font-medium ${detailAtt.earlyExit ? 'text-amber-600' : 'text-gray-400'}`}>
                      {detailAtt.earlyExit ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No attendance record</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">No record found for this date.</p>
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Attendance
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500 font-medium">Select a date</p>
              <p className="text-xs text-gray-400 mt-1">Click a day on the calendar to view its attendance details.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export function MyTimesheets() {
  const pageLoading = usePageLoad()
  const [sheets, setSheets] = useState<Timesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    setError(null)
    try {
      const data = await getMyTimesheets()
      setSheets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timesheets.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(false) })

  if (pageLoading || loading) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <SkPageHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          <SkTable rows={6} cols={4} />
        </div>
      </div>
    )
  }

  const totalHours = sheets.reduce((sum, s) => sum + s.totalHours, 0)
  const monthHours = thisMonthHours(sheets)
  const submittedCount = sheets.filter((s) => s.status === 'Submitted').length
  const draftCount = sheets.filter((s) => s.status === 'Draft').length

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="My Timesheets"
        subtitle={`${sheets.length} timesheet${sheets.length === 1 ? '' : 's'}`}
        action={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh"
            aria-label="Refresh timesheets"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500 font-medium">Total Hours</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtHours(totalHours)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-gray-500 font-medium">This Month</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtHours(monthHours)}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-gray-500 font-medium">Submitted</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{submittedCount}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileEdit className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-gray-500 font-medium">Draft</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{draftCount}</p>
          </div>
        </div>

        {/* Attendance Calendar */}
        <AttendanceCalendar />

        {/* Timesheets table */}
        {sheets.length === 0 ? (
          <div className="card p-12 text-center">
            <Timer className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No timesheets found</p>
            <p className="text-xs text-gray-400 mt-1">Your submitted timesheets will appear here.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Timesheet</th>
                    <th className="table-th">Start Date</th>
                    <th className="table-th">End Date</th>
                    <th className="table-th text-right">Hours</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sheets.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td">
                        <span className="font-medium text-gray-900 font-mono text-sm">{s.id}</span>
                        {s.company && (
                          <p className="text-xs text-gray-400 mt-0.5">{s.company}</p>
                        )}
                      </td>
                      <td className="table-td text-sm text-gray-700">{formatDate(s.startDate)}</td>
                      <td className="table-td text-sm text-gray-700">{formatDate(s.endDate)}</td>
                      <td className="table-td text-right tabular-nums font-medium text-gray-900">
                        {fmtHours(s.totalHours)}
                      </td>
                      <td className="table-td">
                        <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
