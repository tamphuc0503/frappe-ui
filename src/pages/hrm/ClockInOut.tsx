import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Loader2,
  RefreshCw,
  // BarChart3,
  // List,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { createEmployeeCheckin, getMonthlyCheckins, type EmployeeCheckinRecord } from '../../services/hrm'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
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
  const [monthlyCheckins, setMonthlyCheckins] = useState<EmployeeCheckinRecord[]>([])
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(new Date()))
  const [detailView] = useState<'timeline' | 'list'>('list')

  // Build daily summaries from monthly checkins
  const dailySummary = useMemo(() => {
    const map = new Map<string, { clockIn: string | null; clockOut: string | null; totalMins: number }>()
    const sorted = [...monthlyCheckins].sort((a, b) => a.time.localeCompare(b.time))
    for (const c of sorted) {
      const date = c.time.slice(0, 10)
      if (!map.has(date)) map.set(date, { clockIn: null, clockOut: null, totalMins: 0 })
      const entry = map.get(date)!
      const t = c.time.slice(11, 16)
      if (c.log_type === 'IN' && !entry.clockIn) entry.clockIn = t
      if (c.log_type === 'OUT') entry.clockOut = t
    }
    // Calc total work minutes per day (pair IN→OUT)
    for (const [date] of map) {
      const dayCheckins = sorted.filter((c) => c.time.slice(0, 10) === date)
      let openIn: number | null = null
      let totalMins = 0
      for (const c of dayCheckins) {
        const [h, m] = c.time.slice(11, 16).split(':').map(Number)
        if (c.log_type === 'IN' && openIn === null) openIn = h * 60 + m
        else if (c.log_type === 'OUT' && openIn !== null) {
          totalMins += (h * 60 + m) - openIn
          openIn = null
        }
      }
      map.get(date)!.totalMins = totalMins
    }
    return map
  }, [monthlyCheckins])

  // Fetch monthly checkins when calendar month changes
  useEffect(() => {
    getMonthlyCheckins(calYear, calMonth)
      .then((data) => setMonthlyCheckins(data))
      .catch(() => setMonthlyCheckins([]))
  }, [calYear, calMonth])

  // Derive selected date checkins from monthly data
  const checkins = useMemo(() => {
    if (!selectedDate) return []
    return [...monthlyCheckins]
      .filter((c) => c.time.slice(0, 10) === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [monthlyCheckins, selectedDate])

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const todayStr = toDateStr(now)
  const todaySummary = dailySummary.get(todayStr)

  // Determine clock state from last checkin of today
  const todayCheckins = useMemo(() =>
    [...monthlyCheckins]
      .filter((c) => c.time.slice(0, 10) === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [monthlyCheckins, todayStr]
  )
  const lastCheckin = todayCheckins.at(-1) ?? null
  const isClockedIn = lastCheckin?.log_type === 'IN'

  const [clockError, setClockError] = useState<string | null>(null)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Refresh monthly data after clock in/out
  const refreshMonthly = useCallback(() => {
    return getMonthlyCheckins(calYear, calMonth)
      .then((data) => setMonthlyCheckins(data))
      .catch(() => {/* ignore */})
  }, [calYear, calMonth])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    refreshMonthly().finally(() => setRefreshing(false))
  }, [refreshMonthly])

  const handleClockIn = useCallback(() => {
    setClockError(null)
    setClockingIn(true)
    createEmployeeCheckin('IN')
      .then(() => refreshMonthly())
      .catch((err) => setClockError(err instanceof Error ? err.message : 'Failed to clock in.'))
      .finally(() => setClockingIn(false))
  }, [refreshMonthly])

  const handleClockOut = useCallback(() => {
    setClockError(null)
    setClockingOut(true)
    createEmployeeCheckin('OUT')
      .then(() => refreshMonthly())
      .catch((err) => setClockError(err instanceof Error ? err.message : 'Failed to clock out.'))
      .finally(() => setClockingOut(false))
  }, [refreshMonthly])

  // Stats from dailySummary
  const thisWeekTotal = (() => {
    const day = now.getDay()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - day)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = toDateStr(weekStart)
    let mins = 0
    for (const [date, s] of dailySummary) {
      if (date >= weekStartStr && date <= todayStr) mins += s.totalMins
    }
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  })()

  const thisMonthDaysWorked = dailySummary.size

  const avgStartTime = (() => {
    const clockIns: number[] = []
    for (const [, s] of dailySummary) {
      if (s.clockIn) {
        const [h, m] = s.clockIn.split(':').map(Number)
        clockIns.push(h * 60 + m)
      }
    }
    if (!clockIns.length) return '—'
    const avg = Math.round(clockIns.reduce((a, b) => a + b, 0) / clockIns.length)
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

  const getDaySummary = (day: number) => {
    const d = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dailySummary.get(d) ?? null
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

  const todayDuration = (() => {
    if (!todaySummary?.clockIn) return '—'
    const mins = todaySummary.totalMins
    if (mins <= 0) return '0h 0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  })()

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
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Clock In / Out"
          subtitle={`Welcome, ${user?.name ?? 'User'} — track your work hours`}
        />
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
                {todaySummary?.clockIn ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Clock Out</p>
              <p className="text-sm font-semibold text-gray-900">
                {todaySummary?.clockOut ?? (isClockedIn ? <span className="text-blue-500">In progress</span> : '—')}
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
              : todaySummary?.clockOut
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isClockedIn ? 'bg-emerald-500 animate-pulse' : todaySummary?.clockOut ? 'bg-blue-500' : 'bg-gray-400'
            }`} />
            {isClockedIn
              ? `Clocked in since ${todaySummary?.clockIn}`
              : todaySummary?.clockOut
              ? 'Work day complete'
              : 'Not clocked in'}
          </div>

          {/* Big action button */}
          {!isClockedIn && !todaySummary?.clockOut ? (
            <button
              onClick={handleClockIn}
              disabled={clockingIn}
              className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {clockingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
              {clockingIn ? 'Clocking In…' : 'Clock In'}
            </button>
          ) : isClockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={clockingOut}
              className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-red-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {clockingOut ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
              {clockingOut ? 'Clocking Out…' : 'Clock Out'}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-sm text-gray-500">You've completed your day</p>
              <button
                onClick={handleClockIn}
                disabled={clockingIn}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2 disabled:opacity-50"
              >
                {clockingIn ? 'Clocking in…' : 'Clock in again'}
              </button>
            </div>
          )}

          {/* Error banner */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${clockError ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-600 text-sm">{clockError}</span>
            </div>
          </div>

          {isClockedIn && (
            <p className="text-xs text-gray-400">
              Working for <span className="font-semibold text-gray-700">{durationFromNow(todaySummary!.clockIn!, now)}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Calendar */}
        <div className="card p-5">
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

              const record = getDaySummary(day)
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

                  {hasClockIn && record.totalMins > 0 && (
                    <span
                      className={`text-[9px] font-medium leading-tight mt-0.5 ${
                        today ? 'text-blue-100' : 'text-emerald-600'
                      }`}
                    >
                      {Math.floor(record.totalMins / 60)}h {record.totalMins % 60}m
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })
                : 'Select a day'}
            </h2>
            {/* View toggle - disabled for now
            {selectedDate && checkins.length > 0 && (
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setDetailView('timeline')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${detailView === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Timeline
                </button>
                <button
                  onClick={() => setDetailView('list')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${detailView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-3.5 h-3.5" />
                  List
                </button>
              </div>
            )}
            */}
          </div>

          {selectedDate && checkins.length > 0 ? (
            <div className="space-y-4">
              {/* Summary */}
              {(() => {
                const firstIn = checkins.find((c) => c.log_type === 'IN')
                const lastOut = [...checkins].reverse().find((c) => c.log_type === 'OUT')
                const clockIn = firstIn ? firstIn.time.slice(11, 16) : null
                const clockOut = lastOut ? lastOut.time.slice(11, 16) : null
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">First Clock In</p>
                        <p className="text-lg font-bold text-gray-900">{clockIn ?? '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Last Clock Out</p>
                        <p className="text-lg font-bold text-gray-900">{clockOut ?? '—'}</p>
                      </div>
                    </div>
                    {clockIn && clockOut && (
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-blue-500 mb-1">Total Duration</p>
                        <p className="text-xl font-bold text-blue-700">{calcDuration(clockIn, clockOut)}</p>
                      </div>
                    )}
                  </>
                )
              })()}

              {/* Timeline chart */}
              {detailView === 'timeline' && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3">Timeline ({checkins.length} events)</p>
                <div className="relative px-8">
                  {/* Horizontal step timeline */}
                  <div className="flex items-start">
                    {[...checkins].sort((a, b) => a.time.localeCompare(b.time)).map((c, i, arr) => {
                      const isIn = c.log_type === 'IN'
                      const isLast = i === arr.length - 1
                      return (
                        <div key={`${c.time}-${i}`} className="flex items-start flex-1 min-w-0">
                          {/* Node */}
                          <div className="flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full border-2 border-white shadow ${isIn ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <p className={`text-[11px] font-semibold mt-1.5 ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>
                              {c.time.slice(11, 16)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{c.log_type === 'IN' ? 'In' : 'Out'}</p>
                          </div>
                          {/* Connector line */}
                          {!isLast && (
                            <div className="flex-1 flex flex-col items-center mt-[7px]">
                              <div className={`h-0.5 w-full ${isIn ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                              {(() => {
                                const [h1, m1] = c.time.slice(11, 16).split(':').map(Number)
                                const next = arr[i + 1]
                                const [h2, m2] = next.time.slice(11, 16).split(':').map(Number)
                                const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
                                if (diff <= 0) return null
                                const dh = Math.floor(diff / 60)
                                const dm = diff % 60
                                const label = dh > 0 ? `${dh}h ${dm}m` : `${dm}m`
                                return <span className="text-[9px] text-gray-400 mt-0.5">{label}</span>
                              })()}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Clock In
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Clock Out
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Session list */}
              {detailView === 'list' && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Sessions</p>
                <div className="space-y-2">
                  {(() => {
                    const sorted = [...checkins].sort((a, b) => a.time.localeCompare(b.time))
                    const sessions: { inTime: string; outTime: string | null }[] = []
                    let currentIn: string | null = null
                    for (const c of sorted) {
                      if (c.log_type === 'IN') {
                        if (currentIn !== null) sessions.push({ inTime: currentIn, outTime: null })
                        currentIn = c.time.slice(11, 16)
                      } else if (c.log_type === 'OUT' && currentIn !== null) {
                        sessions.push({ inTime: currentIn, outTime: c.time.slice(11, 16) })
                        currentIn = null
                      }
                    }
                    if (currentIn !== null) sessions.push({ inTime: currentIn, outTime: null })

                    return sessions.map((s, i) => {
                      const duration = s.outTime ? calcDuration(s.inTime, s.outTime) : null
                      return (
                        <div key={`session-${s.inTime}-${i}`} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">Session {i + 1}</span>
                            {duration ? (
                              <span className="text-xs font-semibold text-emerald-600">{duration}</span>
                            ) : (
                              <span className="text-xs font-medium text-amber-500">In progress</span>
                            )}
                          </div>
                          {/* Mini session timeline */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <span className="text-sm font-medium text-emerald-700 tabular-nums">{s.inTime}</span>
                            </div>
                            <div className="flex-1 border-t border-dashed border-gray-300" />
                            <div className="flex items-center gap-1.5">
                              {s.outTime ? (
                                <>
                                  <span className="text-sm font-medium text-red-700 tabular-nums">{s.outTime}</span>
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-medium text-amber-600">now</span>
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
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
        </div>
      </div>
      </div>
    </div>
  )
}
