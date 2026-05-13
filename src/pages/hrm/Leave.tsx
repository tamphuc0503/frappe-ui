import { useState } from 'react'
import { Plus, Check, X, CalendarDays, CalendarCheck, CalendarX, Clock, RefreshCw, Search, Activity, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { LeaveRequestDialog } from '../../components/ui/LeaveRequestDialog'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { useToast } from '../../hooks/useToast'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getAllLeaves, approveLeaveRequest, rejectLeaveRequest, getLeaveActivityLog } from '../../services/leaves'
import type { LeaveListItem, LeaveApplicationStatus } from '../../types/leave'
import type { LeaveActivityLog } from '../../services/leaves'

const STATUS_VARIANT: Record<LeaveApplicationStatus, 'gray' | 'green' | 'red' | 'yellow'> = {
  Open: 'yellow',
  Approved: 'green',
  Rejected: 'red',
  Cancelled: 'gray',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDays(n: number): string {
  if (!n) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

type FilterKey = 'All' | 'Open' | 'Approved' | 'Rejected'
type CardColor = 'blue' | 'amber' | 'emerald' | 'red'

const FILTER_META: Record<FilterKey, { label: string; icon: React.ReactNode; color: CardColor }> = {
  All:       { label: 'Total Requests', icon: <CalendarDays className="w-5 h-5" />, color: 'blue' },
  Open:      { label: 'Open',           icon: <Clock className="w-5 h-5" />,        color: 'amber' },
  Approved:  { label: 'Approved',       icon: <CalendarCheck className="w-5 h-5" />, color: 'emerald' },
  Rejected:  { label: 'Rejected',       icon: <CalendarX className="w-5 h-5" />,    color: 'red' },
}

const COLOR_MAP: Record<CardColor, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600' },
}

function ActivityLogList({ logs }: Readonly<{ logs: LeaveActivityLog[] }>) {
  if (logs.length === 0) return <p className="text-sm text-gray-400 py-2">No activity recorded.</p>
  return (
    <div className="space-y-0 border-l-2 border-gray-200 ml-1.5 max-h-48 overflow-y-auto">
      {logs.map((log) => (
        <div key={`${log.date}-${log.action}`} className="pl-4 pb-3 relative">
          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-300" />
          <p className="text-xs text-gray-500">
            {formatDateTime(log.date)}
            <span className="mx-1.5">·</span>
            <span className="font-medium text-gray-700">{log.user}</span>
          </p>
          <p className="text-sm text-gray-700 mt-0.5">{log.detail}</p>
        </div>
      ))}
    </div>
  )
}

export function Leave() {
  const pageLoading = usePageLoad()
  const [filter, setFilter] = useState<FilterKey>('All')
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [leaves, setLeaves] = useState<LeaveListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'custom'>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedLeave, setSelectedLeave] = useState<LeaveListItem | null>(null)
  const [activityLogs, setActivityLogs] = useState<LeaveActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const { addToast } = useToast()

  function openLeaveDetail(leave: LeaveListItem) {
    setSelectedLeave(leave)
    setActivityLogs([])
    setActivityLoading(true)
    getLeaveActivityLog(leave.id)
      .then(setActivityLogs)
      .catch(() => { /* ignore */ })
      .finally(() => setActivityLoading(false))
  }

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    setError(null)
    try {
      const data = await getAllLeaves()
      setLeaves(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(false) })

  if (pageLoading || loading) return <><SkPageHeader /><SkTable rows={8} cols={7} hasToolbar /></>

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActionLoading(id)
    try {
      if (action === 'approve') await approveLeaveRequest(id)
      else await rejectLeaveRequest(id)
      await load(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${action} leave request.`
      addToast(msg, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const dateFiltered = (() => {
    if (dateRange === 'all') return leaves
    const today = new Date()
    if (dateRange === 'week') {
      const dow = today.getDay()
      const start = new Date(today)
      start.setDate(today.getDate() - dow)
      const startStr = start.toISOString().slice(0, 10)
      const endStr = new Date(start.getTime() + 6 * 86400000).toISOString().slice(0, 10)
      return leaves.filter((r) => r.fromDate <= endStr && r.toDate >= startStr)
    }
    if (dateRange === 'month') {
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const startStr = `${y}-${m}-01`
      const endStr = `${y}-${m}-31`
      return leaves.filter((r) => r.fromDate <= endStr && r.toDate >= startStr)
    }
    if (customFrom && customTo) return leaves.filter((r) => r.fromDate <= customTo && r.toDate >= customFrom)
    if (customFrom) return leaves.filter((r) => r.toDate >= customFrom)
    if (customTo) return leaves.filter((r) => r.fromDate <= customTo)
    return leaves
  })()

  const searched = (() => {
    if (!search.trim()) return dateFiltered
    const q = search.toLowerCase()
    return dateFiltered.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.leaveType.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    )
  })()

  const displayed = filter === 'All' ? searched : searched.filter((r) => r.status === filter)

  const counts: Record<FilterKey, number> = {
    All: searched.length,
    Open: searched.filter((r) => r.status === 'Open').length,
    Approved: searched.filter((r) => r.status === 'Approved').length,
    Rejected: searched.filter((r) => r.status === 'Rejected').length,
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="Leave Management"
        subtitle={`${leaves.length} request${leaves.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
              aria-label="Refresh leave requests"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowRequestDialog(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 -m-0.5 p-0.5">
          {(['All', 'Open', 'Approved', 'Rejected'] as const).map((s) => {
            const m = FILTER_META[s]
            const c = COLOR_MAP[m.color]
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`card p-5 transition-all hover:shadow-md flex items-center justify-between gap-4 relative ${filter === s ? 'ring-2 ring-blue-500 z-10' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
                    {m.icon}
                  </div>
                  <p className="text-sm font-medium text-gray-600 truncate">{m.label}</p>
                </div>
                <p className="text-3xl font-bold text-gray-900 tabular-nums flex-shrink-0">{counts[s]}</p>
              </button>
            )
          })}
        </div>

        {/* Search & date filter toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee, leave type, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
            {(['all', 'week', 'month', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {{ all: 'All Time', week: 'This Week', month: 'This Month', custom: 'Custom' }[r]}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="form-input text-sm py-1.5"
                aria-label="From date"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="form-input text-sm py-1.5"
                aria-label="To date"
              />
            </div>
          )}
        </div>

        {/* Table */}
        {displayed.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 text-sm">
            <p>No leave requests in this category.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Employee</th>
                    <th className="table-th">Leave Type</th>
                    <th className="table-th">From</th>
                    <th className="table-th">To</th>
                    <th className="table-th text-right">Days</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Workflow</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => openLeaveDetail(req)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                    >
                      <td className="table-td">
                        <p className="font-medium text-gray-900 text-sm">{req.employeeName || req.employeeId}</p>
                        {req.department && <p className="text-xs text-gray-400">{req.department}</p>}
                      </td>
                      <td className="table-td text-sm text-gray-700">{req.leaveType || '—'}</td>
                      <td className="table-td text-sm text-gray-500">{formatDate(req.fromDate)}</td>
                      <td className="table-td text-sm text-gray-500">{formatDate(req.toDate)}</td>
                      <td className="table-td text-sm text-gray-900 text-right tabular-nums">
                        {formatDays(req.totalDays)}
                        {req.halfDay && <span className="ml-1 text-xs text-gray-400">½</span>}
                      </td>
                      <td className="table-td">
                        <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
                      </td>
                      <td className="table-td text-sm text-gray-500">{req.workflowState || '—'}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          {req.status === 'Open' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); void handleAction(req.id, 'approve') }}
                                disabled={actionLoading === req.id}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Approve"
                                aria-label="Approve"
                              >
                                <Check className={`w-4 h-4 ${actionLoading === req.id ? 'animate-pulse' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); void handleAction(req.id, 'reject') }}
                                disabled={actionLoading === req.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject"
                                aria-label="Reject"
                              >
                                <X className={`w-4 h-4 ${actionLoading === req.id ? 'animate-pulse' : ''}`} />
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
          </div>
        )}
      </div>

      {/* Leave Detail Dialog */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-[fadeIn_200ms_ease-out]" onClick={() => setSelectedLeave(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-[scaleIn_250ms_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Leave Request Details</h2>
              <button onClick={() => setSelectedLeave(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={STATUS_VARIANT[selectedLeave.status]}>{selectedLeave.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Employee</p>
                  <p className="text-sm font-medium text-gray-900">{selectedLeave.employeeName || selectedLeave.employeeId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Department</p>
                  <p className="text-sm text-gray-700">{selectedLeave.department || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Leave Type</p>
                  <p className="text-sm text-gray-700">{selectedLeave.leaveType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Total Days</p>
                  <p className="text-sm text-gray-700">{formatDays(selectedLeave.totalDays)}{selectedLeave.halfDay ? ' (Half Day)' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <p className="text-sm text-gray-700">{formatDate(selectedLeave.fromDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <p className="text-sm text-gray-700">{formatDate(selectedLeave.toDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Posting Date</p>
                  <p className="text-sm text-gray-700">{formatDate(selectedLeave.postingDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Workflow State</p>
                  <p className="text-sm text-gray-700">{selectedLeave.workflowState || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Request ID</p>
                  <p className="text-sm text-gray-500 font-mono">{selectedLeave.id}</p>
                </div>
              </div>
              {selectedLeave.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Description / Reason</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{selectedLeave.description}</p>
                </div>
              )}

              {/* Activity Log */}
              <div>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Activity Log
                </p>
                {activityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading activity…
                  </div>
                ) : (
                  <ActivityLogList logs={activityLogs} />
                )}
              </div>
            </div>
            {selectedLeave.status === 'Open' && (
              <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                <button
                  onClick={() => { void handleAction(selectedLeave.id, 'approve'); setSelectedLeave(null) }}
                  disabled={actionLoading === selectedLeave.id}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => { void handleAction(selectedLeave.id, 'reject'); setSelectedLeave(null) }}
                  disabled={actionLoading === selectedLeave.id}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRequestDialog && (
        <LeaveRequestDialog
          onClose={() => setShowRequestDialog(false)}
          onSubmit={() => void load(true)}
        />
      )}
    </div>
  )
}
