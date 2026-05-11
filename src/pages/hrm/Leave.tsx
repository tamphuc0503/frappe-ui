import { useState } from 'react'
import { Plus, Eye, Check, X, CalendarDays, CalendarCheck, CalendarX, Clock } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { LeaveRequestDialog } from '../../components/ui/LeaveRequestDialog'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import type { LeaveStatus, LeaveType, LeaveRequest } from '../../types/hrm'


const leaveRequests: LeaveRequest[] = [
  { id: 1, employee: 'Sarah Johnson', department: 'HR', type: 'Annual Leave', from: '2026-05-12', to: '2026-05-14', days: 3, status: 'Approved', reason: 'Family vacation' },
  { id: 2, employee: 'Tom Rivera', department: 'Finance', type: 'Sick Leave', from: '2026-05-08', to: '2026-05-09', days: 2, status: 'Rejected', reason: 'Medical appointment' },
  { id: 3, employee: 'Marcus Chen', department: 'Technology', type: 'Annual Leave', from: '2026-05-20', to: '2026-05-25', days: 6, status: 'Pending', reason: 'Personal travel' },
  { id: 4, employee: 'Grace Nwosu', department: 'Sales', type: 'Emergency Leave', from: '2026-05-06', to: '2026-05-07', days: 2, status: 'Approved', reason: 'Family emergency' },
  { id: 5, employee: 'Carlos Mendez', department: 'Operations', type: 'Annual Leave', from: '2026-06-01', to: '2026-06-05', days: 5, status: 'Pending', reason: 'Summer holiday' },
  { id: 6, employee: 'Linda Park', department: 'Operations', type: 'Sick Leave', from: '2026-05-09', to: '2026-05-10', days: 2, status: 'Pending', reason: 'Flu symptoms' },
  { id: 7, employee: 'Rachel Wong', department: 'Sales', type: 'Maternity Leave', from: '2026-06-15', to: '2026-09-15', days: 92, status: 'Approved', reason: 'Maternity' },
  { id: 8, employee: 'David Kim', department: 'Technology', type: 'Unpaid Leave', from: '2026-05-18', to: '2026-05-22', days: 5, status: 'Pending', reason: 'Personal reasons' },
]

function statusBadge(status: LeaveStatus) {
  if (status === 'Approved') return <Badge variant="green">Approved</Badge>
  if (status === 'Pending') return <Badge variant="yellow">Pending</Badge>
  return <Badge variant="red">Rejected</Badge>
}

function leaveTypeBadge(type: LeaveType) {
  const map: Record<LeaveType, 'blue' | 'yellow' | 'purple' | 'red' | 'gray'> = {
    'Annual Leave': 'blue',
    'Sick Leave': 'yellow',
    'Maternity Leave': 'purple',
    'Emergency Leave': 'red',
    'Unpaid Leave': 'gray',
  }
  return <Badge variant={map[type]}>{type}</Badge>
}

type FilterKey = 'All' | LeaveStatus
type CardColor = 'blue' | 'amber' | 'emerald' | 'red'

const FILTER_META: Record<FilterKey, { label: string; icon: React.ReactNode; color: CardColor }> = {
  All:      { label: 'Total Requests', icon: <CalendarDays className="w-5 h-5" />, color: 'blue' },
  Pending:  { label: 'Pending',        icon: <Clock className="w-5 h-5" />,        color: 'amber' },
  Approved: { label: 'Approved',       icon: <CalendarCheck className="w-5 h-5" />, color: 'emerald' },
  Rejected: { label: 'Rejected',       icon: <CalendarX className="w-5 h-5" />,    color: 'red' },
}

const COLOR_MAP: Record<CardColor, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600' },
}

export function Leave() {
  const loading = usePageLoad()
  const [filter, setFilter] = useState<'All' | LeaveStatus>('All')
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={7} hasToolbar /></>

  const displayed = filter === 'All' ? leaveRequests : leaveRequests.filter((r) => r.status === filter)

  const counts = {
    All: leaveRequests.length,
    Pending: leaveRequests.filter((r) => r.status === 'Pending').length,
    Approved: leaveRequests.filter((r) => r.status === 'Approved').length,
    Rejected: leaveRequests.filter((r) => r.status === 'Rejected').length,
  }

  return (
    <div>
      <PageHeader
        title="Leave Management"
        subtitle="Track and manage employee leave requests"
        action={
          <button
            type="button"
            onClick={() => setShowRequestDialog(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((s) => {
          const m = FILTER_META[s]
          const c = COLOR_MAP[m.color]
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`card p-5 transition-all hover:shadow-md flex items-center justify-between gap-4 ${filter === s ? 'ring-2 ring-blue-500' : ''}`}
            >
              {/* Left — icon + label */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
                  {m.icon}
                </div>
                <p className="text-sm font-medium text-gray-600 truncate">{m.label}</p>
              </div>

              {/* Right — number */}
              <p className="text-3xl font-bold text-gray-900 tabular-nums flex-shrink-0">{counts[s]}</p>
            </button>
          )
        })}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Employee</th>
                <th className="table-th">Type</th>
                <th className="table-th">From</th>
                <th className="table-th">To</th>
                <th className="table-th">Days</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <p className="font-medium text-gray-900 text-sm">{req.employee}</p>
                    <p className="text-xs text-gray-400">{req.department}</p>
                  </td>
                  <td className="table-td">{leaveTypeBadge(req.type)}</td>
                  <td className="table-td text-gray-500">{req.from}</td>
                  <td className="table-td text-gray-500">{req.to}</td>
                  <td className="table-td font-medium text-gray-900">{req.days}</td>
                  <td className="table-td">{statusBadge(req.status)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {req.status === 'Pending' && (
                        <>
                          <button className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No requests in this category.</p>
          </div>
        )}
      </div>

      {showRequestDialog && (
        <LeaveRequestDialog
          onClose={() => setShowRequestDialog(false)}
          onSubmit={(payload) => console.debug('[leave-request] submit', payload)}
        />
      )}
    </div>
  )
}
