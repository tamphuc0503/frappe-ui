import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, Star, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { getMyInterviews } from '../../services/hrm'
import type { InterviewRound } from '../../types/hrm'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(t: string): string {
  if (!t) return ''
  const parts = t.split(':')
  const h = Number.parseInt(parts[0], 10)
  const m = parts[1] ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

const STATUS_VARIANT: Record<string, 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple'> = {
  Pending: 'yellow',
  'Under Review': 'blue',
  Cleared: 'green',
  Rejected: 'red',
}

const STATUS_DOT: Record<string, string> = {
  Pending: 'bg-yellow-400',
  'Under Review': 'bg-blue-400',
  Cleared: 'bg-green-400',
  Rejected: 'bg-red-400',
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const days = getDaysInMonth(year, month)
  const firstDow = days[0].getDay()
  const grid: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) grid.push(null)
  for (const d of days) grid.push(d)
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

function MyInterviewsSkeleton() {
  return (
    <div className="h-full flex flex-col min-h-0">
      <SkPageHeader />
      <div className="mt-4">
        <Sk className="h-10 w-64 rounded-lg mb-4" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Sk key={`sk-${String(i)}`} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MyInterviews() {
  const pageLoading = usePageLoad()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState<InterviewRound[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedInterview, setSelectedInterview] = useState<InterviewRound | null>(null)

  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  useFetchOnce(() => {
    getMyInterviews()
      .then((data) => setInterviews(data))
      .catch(() => setInterviews([]))
      .finally(() => setLoading(false))
  })

  const byDate = useMemo(() => {
    const map = new Map<string, InterviewRound[]>()
    if (!interviews) return map
    for (const iv of interviews) {
      if (!iv.scheduledDate) continue
      const key = iv.scheduledDate.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(iv)
      map.set(key, list)
    }
    return map
  }, [interviews])

  const grid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  if (pageLoading || loading) return <MyInterviewsSkeleton />

  const todayKey = toDateKey(today)

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader title="My Interviews" subtitle="Your upcoming and past interviews" />

      <div className="flex items-center gap-3 mt-4 mb-4 flex-shrink-0">
        <button type="button" onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-gray-900 min-w-[160px] text-center">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button type="button" onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <button type="button" onClick={goToday} className="ml-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          Today
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-7 gap-px mb-px">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
          {grid.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${String(idx)}`} className="bg-gray-50 min-h-[80px]" />
            }
            const key = toDateKey(date)
            const dayInterviews = byDate.get(key) ?? []
            const isToday = key === todayKey

            return (
              <div
                key={key}
                className={`min-h-[80px] p-1.5 bg-white flex flex-col ${
                  isToday ? 'ring-2 ring-inset ring-blue-400' : ''
                }`}
              >
                <span className={`text-xs font-medium mb-1 ${
                  isToday ? 'text-blue-600 font-bold' : 'text-gray-600'
                }`}>
                  {date.getDate()}
                </span>
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayInterviews.slice(0, 3).map((iv) => (
                    <button
                      key={iv.id}
                      type="button"
                      onClick={() => setSelectedInterview(iv)}
                      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 hover:bg-gray-50 transition-colors"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[iv.status] ?? 'bg-gray-400'}`} />
                      <span className="truncate">{iv.interviewRound || 'Interview'}</span>
                    </button>
                  ))}
                  {dayInterviews.length > 3 && (
                    <p className="text-[10px] text-gray-400 px-1.5">+{dayInterviews.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedInterview && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
            onClick={() => setSelectedInterview(null)}
          />
          <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
            <div
              className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedInterview.interviewRound || 'Interview'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Interview Details</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInterview(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_VARIANT[selectedInterview.status] ?? 'gray'}>
                    {selectedInterview.status || 'Pending'}
                  </Badge>
                  {selectedInterview.result && (
                    <Badge variant={STATUS_VARIANT[selectedInterview.result] ?? 'gray'}>
                      Result: {selectedInterview.result}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</span>
                    <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(selectedInterview.scheduledDate)}
                    </p>
                  </div>
                  {selectedInterview.fromTime && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time</span>
                      <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTime(selectedInterview.fromTime)}
                        {selectedInterview.toTime ? ` – ${formatTime(selectedInterview.toTime)}` : ''}
                      </p>
                    </div>
                  )}
                </div>

                {selectedInterview.averageRating > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average Rating</span>
                    <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {selectedInterview.averageRating.toFixed(1)} / 5
                    </p>
                  </div>
                )}

                {selectedInterview.jobOpening && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Job Opening</span>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{selectedInterview.jobOpening}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInterview(null)
                          navigate(`/hrm/recruitment/${encodeURIComponent(selectedInterview.jobOpening)}`)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </button>
                    </div>
                  </div>
                )}

                {selectedInterview.jobApplicant && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Applicant</span>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {(selectedInterview.applicantName || selectedInterview.jobApplicant).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedInterview.applicantName || selectedInterview.jobApplicant}
                        </p>
                        <p className="text-xs text-gray-500">{selectedInterview.jobApplicant}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedInterview(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
