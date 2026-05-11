import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarOff, CalendarDays, Eye, Plus, RefreshCw, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { LeaveRequestDialog } from '../../components/ui/LeaveRequestDialog'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getMyLeaves, getMyLeaveSummary, getMyHolidays } from '../../services/leaves'
import type { MyLeave, LeaveApplicationStatus, LeaveSummary, Holiday } from '../../types/leave'

const STATUS_VARIANT: Record<LeaveApplicationStatus, 'gray' | 'green' | 'red' | 'yellow'> = {
  Open: 'yellow',
  Approved: 'green',
  Rejected: 'red',
  Cancelled: 'gray',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDays(n: number): string {
  if (!n) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function MyLeaves() {
  const pageLoading = usePageLoad()
  const currentYear = new Date().getFullYear()

  const [leaves, setLeaves] = useState<MyLeave[]>([])
  const [summary, setSummary] = useState<LeaveSummary | null>(null)
  const [holidayCount, setHolidayCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    setError(null)
    try {
      // Fetch in parallel; tolerate per-section failures (HRMS / Holiday List
      // may not be configured for every tenant).
      const [leavesResult, summaryResult, holidaysResult] = await Promise.allSettled([
        getMyLeaves(),
        getMyLeaveSummary(),
        getMyHolidays(currentYear),
      ])
      if (leavesResult.status === 'fulfilled') setLeaves(leavesResult.value)
      else throw leavesResult.reason
      setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value : null)
      setHolidayCount(holidaysResult.status === 'fulfilled' ? holidaysResult.value.length : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves.')
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
          <SkTable rows={6} cols={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="My Leaves"
        subtitle={`${leaves.length} request${leaves.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
              aria-label="Refresh leaves"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard
            label="Available Leaves"
            value={summary ? formatDays(summary.totalAvailable) : '—'}
            icon={<CalendarCheck className="w-5 h-5" />}
            color="emerald"
            onView={() => setShowBalanceModal(true)}
            viewLabel="View leave balance"
          />
          <SummaryCard
            label="Unpaid Leaves"
            value={summary ? formatDays(summary.totalUnpaidUsed) : '—'}
            icon={<CalendarOff className="w-5 h-5" />}
            color="amber"
            onView={() => setShowBalanceModal(true)}
            viewLabel="View leave balance"
          />
          <SummaryCard
            label="Holiday Leaves"
            value={holidayCount ?? '—'}
            icon={<CalendarDays className="w-5 h-5" />}
            color="blue"
            onView={() => setShowHolidayModal(true)}
            viewLabel={`View all ${currentYear} holidays`}
          />
        </div>

        {/* Leaves table */}
        {leaves.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 text-sm">
            <p>You have no leave requests yet.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Leave Type</th>
                    <th className="table-th">From</th>
                    <th className="table-th">To</th>
                    <th className="table-th text-right">Days</th>
                    <th className="table-th">Posted</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td">
                        <div className="font-medium text-gray-900">{l.leaveType || '—'}</div>
                        {l.description && (
                          <div className="text-xs text-gray-400 truncate max-w-[280px]" title={l.description}>
                            {l.description}
                          </div>
                        )}
                      </td>
                      <td className="table-td text-sm text-gray-700">{formatDate(l.fromDate)}</td>
                      <td className="table-td text-sm text-gray-700">{formatDate(l.toDate)}</td>
                      <td className="table-td text-sm text-gray-900 text-right tabular-nums">
                        {formatDays(l.totalDays)}
                        {l.halfDay && <span className="ml-1 text-xs text-gray-400">½</span>}
                      </td>
                      <td className="table-td text-sm text-gray-500">{formatDate(l.postingDate)}</td>
                      <td className="table-td">
                        <Badge variant={STATUS_VARIANT[l.status]}>{l.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showRequestDialog && (
        <LeaveRequestDialog
          onClose={() => setShowRequestDialog(false)}
          onSubmit={(payload) => {
            console.debug('[my-leaves] submit', payload)
            void load(true)
          }}
        />
      )}

      {showHolidayModal && (
        <HolidaysModal
          year={currentYear}
          onClose={() => setShowHolidayModal(false)}
        />
      )}

      {showBalanceModal && summary && (
        <LeaveBalanceModal
          summary={summary}
          onClose={() => setShowBalanceModal(false)}
        />
      )}
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────
type CardColor = 'emerald' | 'amber' | 'blue'

interface SummaryCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: CardColor
  onView: () => void
  viewLabel: string
}

const COLOR_MAP: Record<CardColor, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
}

function SummaryCard({ label, value, icon, color, onView, viewLabel }: SummaryCardProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="card p-5 flex items-center justify-between gap-4">
      {/* Left — icon + label */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
          {icon}
        </div>
        <p className="text-sm font-medium text-gray-600 truncate">{label}</p>
      </div>

      {/* Right — number + view */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
        <button
          type="button"
          onClick={onView}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title={viewLabel}
          aria-label={viewLabel}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Holidays modal ───────────────────────────────────────────────────────────
interface HolidaysModalProps {
  year: number
  onClose: () => void
}

function HolidaysModal({ year, onClose }: HolidaysModalProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useFetchOnce(() => {
    setLoading(true)
    getMyHolidays(year)
      .then((data) => { setHolidays(data); setError(null) })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load holidays.'))
      .finally(() => setLoading(false))
  }, String(year))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Holidays · {year}</h2>
              <p className="text-sm text-gray-500 mt-0.5">From your company's holiday list.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="p-6 text-sm text-gray-400 text-center">Loading…</div>
            ) : error ? (
              <div className="p-6 text-sm text-red-600 text-center">{error}</div>
            ) : holidays.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">No holidays found for {year}.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {holidays.map((h) => (
                  <li key={h.date} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-12 text-center flex-shrink-0">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        {new Date(h.date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className="text-xl font-bold text-gray-900">{new Date(h.date).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={h.description || h.date}>
                        {h.description || '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </div>
                    {h.weeklyOff && <Badge variant="gray">Weekly off</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Leave balance modal (Available + Unpaid drill-down) ──────────────────────
interface LeaveBalanceModalProps {
  summary: LeaveSummary
  onClose: () => void
}

function LeaveBalanceModal({ summary, onClose }: LeaveBalanceModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Leave Balance</h2>
              <p className="text-sm text-gray-500 mt-0.5">Per leave type, as of today.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {summary.balances.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">No leave allocations found.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Leave Type</th>
                    <th className="table-th text-right">Allocated</th>
                    <th className="table-th text-right">Used</th>
                    <th className="table-th text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summary.balances.map((b) => (
                    <tr key={b.leaveType}>
                      <td className="table-td">
                        <span className="font-medium text-gray-900">{b.leaveType}</span>
                        {b.isLwp && <Badge variant="gray" className="ml-2">Unpaid</Badge>}
                      </td>
                      <td className="table-td text-right tabular-nums text-gray-700">{formatDays(b.allocation)}</td>
                      <td className="table-td text-right tabular-nums text-gray-700">{formatDays(b.used)}</td>
                      <td className="table-td text-right tabular-nums font-semibold text-gray-900">{formatDays(b.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
