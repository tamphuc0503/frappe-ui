import { useState, useEffect, useCallback } from 'react'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useAuth } from '../../hooks/useAuth'
import { Sk, SkPageHeader, SkStatCards, SkCalendarGrid, SkClockPanel } from '../../components/ui/Skeleton'
import {
  Clock,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Timer,
  CalendarDays,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import type { ClockRecord } from '../../types/hrm'

const STORAGE_KEY = 'oceanfleet_clock_records'

const SEED_RECORDS: ClockRecord[] = [
  { date: '2026-04-28', clockIn: '08:05', clockOut: '17:10' },
  { date: '2026-04-29', clockIn: '07:58', clockOut: '17:02' },
  { date: '2026-04-30', clockIn: '08:12', clockOut: '17:20' },
  { date: '2026-05-01', clockIn: '08:02', clockOut: '17:15' },
  { date: '2026-05-02', clockIn: '08:00', clockOut: '16:55' },
  { date: '2026-05-04', clockIn: '07:55', clockOut: '17:05' },
  { date: '2026-05-05', clockIn: '08:08', clockOut: '17:30' },
  { date: '2026-05-06', clockIn: '08:00', clockOut: '17:00' },
  { date: '2026-05-07', clockIn: '09:14', clockOut: '18:30' },
]

function loadRecords(): ClockRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ClockRecord[]
  } catch {
    /* ignore */
  }
  return SEED_RECORDS
}

function saveRecords(records: ClockRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function toTimeStr(d: Date): string {
  return d.toTimeString().slice(0, 5)
}

function calcDuration(clockIn: string, clockOut: string): string {
  const [ih, im] = clockIn.split(':').map(Number)
  const [oh, om] = clockOut.split(':').map(Number)
  const totalMins = (oh * 60 + om) - (ih * 60 + im)
  if (totalMins <= 0) return '0h 0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${h}h ${m}m`
}

function calcMinutes(clockIn: string, clockOut: string): number {
  const [ih, im] = clockIn.split(':').map(Number)
  const [oh, om] = clockOut.split(':').map(Number)
  return Math.max(0, (oh * 60 + om) - (ih * 60 + im))
}

function durationFromNow(clockIn: string, now: Date): string {
  const [ih, im] = clockIn.split(':').map(Number)
  const totalMins = (now.getHours() * 60 + now.getMinutes()) - (ih * 60 + im)
  if (totalMins <= 0) return '0h 0m'
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return `${h}h ${m}m`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ClockInOut() {
  const pageLoading = usePageLoad()
  const { user } = useAuth()
  const [now, setNow] = useState(new Date())
  const [records, setRecords] = useState<ClockRecord[]>(loadRecords)
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const todayStr = toDateStr(now)
  const todayRecord = records.find((r) => r.date === todayStr) ?? null
  const isClockedIn = todayRecord?.clockIn != null && todayRecord.clockOut == null

  const handleClockIn = useCallback(() => {
    const timeStr = toTimeStr(now)
    setRecords((prev) => {
      const existing = prev.find((r) => r.date === todayStr)
      let next: ClockRecord[]
      if (existing) {
        next = prev.map((r) =>
          r.date === todayStr ? { ...r, clockIn: timeStr, clockOut: null } : r
        )
      } else {
        next = [...prev, { date: todayStr, clockIn: timeStr, clockOut: null }]
      }
      saveRecords(next)
      return next
    })
  }, [now, todayStr])

  const handleClockOut = useCallback(() => {
    const timeStr = toTimeStr(now)
    setRecords((prev) => {
      const next = prev.map((r) =>
        r.date === todayStr ? { ...r, clockOut: timeStr } : r
      )
      saveRecords(next)
      return next
    })
  }, [now, todayStr])

  // Stats
  const thisWeekTotal = (() => {
    const day = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - day)
    weekStart.setHours(0, 0, 0, 0)
    let mins = 0
    records.forEach((r) => {
      if (r.date >= toDateStr(weekStart) && r.date <= todayStr && r.clockIn && r.clockOut) {
        mins += calcMinutes(r.clockIn, r.clockOut)
      }
    })
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  })()

  const thisMonthDaysWorked = records.filter((r) => {
    const [y, m] = r.date.split('-').map(Number)
    return y === now.getFullYear() && m - 1 === now.getMonth() && r.clockIn
  }).length

  const avgStartTime = (() => {
    const monthRecs = records.filter((r) => {
      const [y, m] = r.date.split('-').map(Number)
      return y === now.getFullYear() && m - 1 === now.getMonth() && r.clockIn
    })
    if (!monthRecs.length) return '—'
    const totalMins = monthRecs.reduce((sum, r) => {
      const [h, m] = r.clockIn!.split(':').map(Number)
      return sum + h * 60 + m
    }, 0)
    const avg = Math.round(totalMins / monthRecs.length)
    const h = Math.floor(avg / 60)
    const m = avg % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })()

  // Calendar grid
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDay + 1
    return day >= 1 && day <= daysInMonth ? day : null
  })

  const getRecord = (day: number) => {
    const d = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return records.find((r) => r.date === d)
  }

  const isToday = (day: number) =>
    day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear()

  const isPast = (day: number) => {
    const d = new Date(calYear, calMonth, day)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return d < today
  }

  const isFuture = (day: number) => {
    const d = new Date(calYear, calMonth, day)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return d > today
  }

  const isWeekend = (day: number) => {
    const dow = new Date(calYear, calMonth, day).getDay()
    return dow === 0 || dow === 6
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) }
    else setCalMonth((m) => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) }
    else setCalMonth((m) => m + 1)
  }

  function getDayLabel(day: number | null): string {
    if (!day) return ''
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const selectedRecord = selectedDate ? records.find((r) => r.date === selectedDate) : null

  const todayDuration = todayRecord?.clockIn
    ? todayRecord.clockOut
      ? calcDuration(todayRecord.clockIn, todayRecord.clockOut)
      : durationFromNow(todayRecord.clockIn, now)
    : '—'

  if (pageLoading) return (
    <div className="h-full flex flex-col min-h-0">
      <SkPageHeader hasAction={false} />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="card p-6 space-y-4">
            <Sk className="h-4 w-20 rounded-md" />
            <Sk className="h-10 w-48 rounded-lg" />
            <Sk className="h-4 w-40 rounded-md" />
            <div className="pt-5 border-t border-gray-100 grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="space-y-1.5"><Sk className="h-3 w-14 rounded-md" /><Sk className="h-5 w-10 rounded-md" /></div>)}
            </div>
          </div>
          <div className="card p-6 flex flex-col items-center justify-center gap-5">
            <Sk className="h-8 w-48 rounded-full" />
            <Sk className="h-14 w-36 rounded-2xl" />
            <Sk className="h-4 w-32 rounded-md" />
          </div>
        </div>
        <SkStatCards count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2"><SkCalendarGrid /></div>
          <SkClockPanel />
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="Clock In / Out"
        subtitle={`Welcome, ${user?.name ?? 'User'} — track your work hours`}
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Top section: live clock + action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Live clock card */}
        <div className="card p-6 flex flex-col justify-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            {now.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          {/* Today summary */}
          <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Clock In</p>
              <p className="text-sm font-semibold text-gray-900">
                {todayRecord?.clockIn ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Clock Out</p>
              <p className="text-sm font-semibold text-gray-900">
                {todayRecord?.clockOut ?? (isClockedIn ? <span className="text-blue-500">In progress</span> : '—')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="text-sm font-semibold text-gray-900">{todayDuration}</p>
            </div>
          </div>
        </div>

        {/* Clock in/out action card */}
        <div className="card p-6 flex flex-col items-center justify-center text-center gap-5">
          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
            isClockedIn
              ? 'bg-emerald-100 text-emerald-700'
              : todayRecord?.clockOut
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isClockedIn ? 'bg-emerald-500 animate-pulse' : todayRecord?.clockOut ? 'bg-blue-500' : 'bg-gray-400'
            }`} />
            {isClockedIn
              ? `Clocked in since ${todayRecord?.clockIn}`
              : todayRecord?.clockOut
              ? 'Work day complete'
              : 'Not clocked in'}
          </div>

          {/* Big action button */}
          {!isClockedIn && !todayRecord?.clockOut ? (
            <button
              onClick={handleClockIn}
              className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-emerald-200 active:scale-95"
            >
              <LogIn className="w-6 h-6" />
              Clock In
            </button>
          ) : isClockedIn ? (
            <button
              onClick={handleClockOut}
              className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-red-200 active:scale-95"
            >
              <LogOut className="w-6 h-6" />
              Clock Out
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-sm text-gray-500">You've completed your day</p>
              <button
                onClick={handleClockIn}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
              >
                Clock in again
              </button>
            </div>
          )}

          {isClockedIn && (
            <p className="text-xs text-gray-400">
              Working for <span className="font-semibold text-gray-700">{durationFromNow(todayRecord!.clockIn!, now)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Today</p>
            <p className="text-base font-bold text-gray-900">{todayDuration}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Timer className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">This Week</p>
            <p className="text-base font-bold text-gray-900">{thisWeekTotal}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Days Worked</p>
            <p className="text-base font-bold text-gray-900">{thisMonthDaysWorked}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg. Start</p>
            <p className="text-base font-bold text-gray-900">{avgStartTime}</p>
          </div>
        </div>
      </div>

      {/* Calendar + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-5">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">
              {MONTH_NAMES[calMonth]} {calYear}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCalMonth(now.getMonth())
                  setCalYear(now.getFullYear())
                }}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="aspect-square" />
              }

              const record = getRecord(day)
              const today = isToday(day)
              const future = isFuture(day)
              const past = isPast(day)
              const weekend = isWeekend(day)
              const dateStr = getDayLabel(day)
              const selected = selectedDate === dateStr

              const hasClockIn = record?.clockIn != null
              const hasClockOut = record?.clockOut != null
              const complete = hasClockIn && hasClockOut
              const inProgress = hasClockIn && !hasClockOut

              let cellBg = 'bg-transparent hover:bg-gray-50'
              if (today) cellBg = 'bg-blue-600 hover:bg-blue-700'
              else if (selected) cellBg = 'bg-blue-50 ring-2 ring-blue-400'
              else if (complete) cellBg = 'bg-emerald-50 hover:bg-emerald-100'
              else if (inProgress) cellBg = 'bg-amber-50 hover:bg-amber-100'
              else if (past && !weekend) cellBg = 'bg-red-50/60 hover:bg-red-50'

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(selected ? null : dateStr)}
                  className={`relative rounded-xl p-1.5 flex flex-col items-center transition-colors ${cellBg} ${
                    future ? 'opacity-40 cursor-default pointer-events-none' : 'cursor-pointer'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold leading-tight ${
                      today
                        ? 'text-white'
                        : weekend && !complete && !inProgress
                        ? 'text-gray-300'
                        : complete
                        ? 'text-emerald-700'
                        : inProgress
                        ? 'text-amber-700'
                        : past && !weekend
                        ? 'text-red-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>

                  {hasClockIn && (
                    <span
                      className={`text-[9px] font-medium leading-tight mt-0.5 ${
                        today ? 'text-blue-100' : 'text-emerald-600'
                      }`}
                    >
                      {record!.clockIn}
                    </span>
                  )}
                  {hasClockOut && (
                    <span
                      className={`text-[9px] font-medium leading-tight ${
                        today ? 'text-blue-200' : 'text-red-500'
                      }`}
                    >
                      {record!.clockOut}
                    </span>
                  )}
                  {inProgress && !today && (
                    <span className="text-[9px] font-medium text-amber-500 leading-tight">active</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-200" />
              <span>Complete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
              <span>In progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-50 border border-red-100" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-600" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="card p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900 text-sm">
            {selectedDate
              ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })
              : 'Select a day'}
          </h2>

          {selectedDate && selectedRecord ? (
            <div className="space-y-4">
              {/* Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                selectedRecord.clockIn && selectedRecord.clockOut
                  ? 'bg-emerald-50 text-emerald-700'
                  : selectedRecord.clockIn
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-50 text-gray-500'
              }`}>
                {selectedRecord.clockIn && selectedRecord.clockOut ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                {selectedRecord.clockIn && selectedRecord.clockOut
                  ? 'Complete'
                  : selectedRecord.clockIn
                  ? 'In progress'
                  : 'No record'}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Clock In</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRecord.clockIn ?? '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Clock Out</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRecord.clockOut ?? '—'}</p>
                </div>
              </div>

              {selectedRecord.clockIn && selectedRecord.clockOut && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-blue-500 mb-1">Total Duration</p>
                  <p className="text-xl font-bold text-blue-700">
                    {calcDuration(selectedRecord.clockIn, selectedRecord.clockOut)}
                  </p>
                </div>
              )}
            </div>
          ) : selectedDate ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <XCircle className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">No record for this day</p>
              <p className="text-xs text-gray-400 mt-1">Weekend or no clock-in recorded</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <CalendarDays className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">Click any day on the calendar</p>
              <p className="text-xs text-gray-400 mt-1">to view clock-in/out details</p>
            </div>
          )}

          {/* Recent 5 records */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Recent Activity
            </p>
            <div className="space-y-2">
              {[...records]
                .filter((r) => r.clockIn)
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((r) => (
                  <div
                    key={r.date}
                    onClick={() => setSelectedDate(r.date)}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-gray-900">
                        {new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {r.clockIn} → {r.clockOut ?? 'active'}
                      </p>
                    </div>
                    {r.clockIn && r.clockOut ? (
                      <span className="text-xs font-semibold text-emerald-600">
                        {calcDuration(r.clockIn, r.clockOut)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-500">—</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
