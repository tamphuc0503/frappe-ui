import { useState } from 'react'
import { Calendar, Clock, Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader, SkStatCards, SkTable, SkWeekBar } from '../../components/ui/Skeleton'

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day'

interface AttendanceRecord {
  id: number
  employee: string
  department: string
  date: string
  checkIn: string
  checkOut: string
  hours: number
  status: AttendanceStatus
}

const attendanceData: AttendanceRecord[] = [
  { id: 1, employee: 'Sarah Johnson', department: 'HR', date: '2026-05-08', checkIn: '08:02', checkOut: '17:05', hours: 9.05, status: 'Present' },
  { id: 2, employee: 'Marcus Chen', department: 'Technology', date: '2026-05-08', checkIn: '09:14', checkOut: '18:30', hours: 9.27, status: 'Late' },
  { id: 3, employee: 'Linda Park', department: 'Operations', date: '2026-05-08', checkIn: '08:00', checkOut: '17:00', hours: 9.0, status: 'Present' },
  { id: 4, employee: 'Tom Rivera', department: 'Finance', date: '2026-05-08', checkIn: '—', checkOut: '—', hours: 0, status: 'Absent' },
  { id: 5, employee: 'Grace Nwosu', department: 'Sales', date: '2026-05-08', checkIn: '08:05', checkOut: '12:30', hours: 4.42, status: 'Half Day' },
  { id: 6, employee: 'Carlos Mendez', department: 'Operations', date: '2026-05-08', checkIn: '07:58', checkOut: '16:55', hours: 8.95, status: 'Present' },
  { id: 7, employee: 'Rachel Wong', department: 'Sales', date: '2026-05-08', checkIn: '08:45', checkOut: '18:00', hours: 9.25, status: 'Late' },
  { id: 8, employee: 'David Kim', department: 'Technology', date: '2026-05-08', checkIn: '08:01', checkOut: '17:02', hours: 9.02, status: 'Present' },
]

const weekSummary = [
  { day: 'Mon', date: '05', present: 7, absent: 1 },
  { day: 'Tue', date: '06', present: 8, absent: 0 },
  { day: 'Wed', date: '07', present: 6, absent: 2 },
  { day: 'Thu', date: '08', present: 6, absent: 1 },
  { day: 'Fri', date: '09', present: 0, absent: 0 },
  { day: 'Sat', date: '10', present: 0, absent: 0 },
  { day: 'Sun', date: '11', present: 0, absent: 0 },
]

function statusBadge(s: AttendanceStatus) {
  if (s === 'Present') return <Badge variant="green">Present</Badge>
  if (s === 'Absent') return <Badge variant="red">Absent</Badge>
  if (s === 'Late') return <Badge variant="yellow">Late</Badge>
  return <Badge variant="blue">Half Day</Badge>
}

function statusIcon(s: AttendanceStatus) {
  if (s === 'Present') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (s === 'Absent') return <XCircle className="w-4 h-4 text-red-500" />
  return <AlertCircle className="w-4 h-4 text-amber-500" />
}

export function ShiftAttendance() {
  const loading = usePageLoad()
  const [view, setView] = useState<'Today' | 'This Week'>('Today')
  if (loading) return (
    <div>
      <SkPageHeader hasAction />
      <SkWeekBar />
      <SkStatCards count={4} />
      <div className="flex gap-1 mb-4">
        {[1,2].map(i => <Sk key={i} className="h-9 w-24 rounded-lg" />)}
      </div>
      <SkTable rows={8} cols={6} />
    </div>
  )

  const presentCount = attendanceData.filter((r) => r.status === 'Present').length
  const absentCount = attendanceData.filter((r) => r.status === 'Absent').length
  const lateCount = attendanceData.filter((r) => r.status === 'Late').length
  const halfDayCount = attendanceData.filter((r) => r.status === 'Half Day').length

  return (
    <div>
      <PageHeader
        title="Shift & Attendance"
        subtitle="Monitor daily check-ins and work hours"
        action={
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        }
      />

      {/* This week summary bar */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Week of May 5–11, 2026</h2>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Current week</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekSummary.map((d) => {
            const isToday = d.date === '08'
            const hasData = d.present > 0 || d.absent > 0
            return (
              <div
                key={d.day}
                className={`rounded-xl p-3 text-center transition-colors ${
                  isToday
                    ? 'bg-blue-600 text-white shadow-sm'
                    : hasData
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-gray-50/50'
                }`}
              >
                <p className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-100' : 'text-gray-400'}`}>
                  {d.day}
                </p>
                <p className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900'}`}>{d.date}</p>
                {hasData && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className={`text-xs ${isToday ? 'text-blue-100' : 'text-emerald-600'}`}>
                      ✓ {d.present}
                    </p>
                    {d.absent > 0 && (
                      <p className={`text-xs ${isToday ? 'text-blue-200' : 'text-red-500'}`}>
                        ✗ {d.absent}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{presentCount}</p>
            <p className="text-xs text-gray-400">Present</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{absentCount}</p>
            <p className="text-xs text-gray-400">Absent</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{lateCount}</p>
            <p className="text-xs text-gray-400">Late</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{halfDayCount}</p>
            <p className="text-xs text-gray-400">Half Day</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['Today', 'This Week'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Employee</th>
                <th className="table-th">Date</th>
                <th className="table-th">Check In</th>
                <th className="table-th">Check Out</th>
                <th className="table-th">Hours</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendanceData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      {statusIcon(row.status)}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{row.employee}</p>
                        <p className="text-xs text-gray-400">{row.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-gray-500">{row.date}</td>
                  <td className="table-td font-medium text-gray-900">{row.checkIn}</td>
                  <td className="table-td font-medium text-gray-900">{row.checkOut}</td>
                  <td className="table-td">
                    {row.hours > 0 ? (
                      <span className={`font-medium ${row.hours < 8 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {row.hours.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-td">{statusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
