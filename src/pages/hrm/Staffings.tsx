import { Fragment, useState, useMemo } from 'react'
import { Users, Building2, Calendar, DollarSign, RefreshCw, Loader2, Briefcase, X, ArrowLeft } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader, SkKanbanColumn } from '../../components/ui/Skeleton'
import { getStaffingPlans, getStaffingPlanDetails } from '../../services/hrm'
import type { StaffingPlan, StaffingPlanDetail } from '../../types/hrm'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

// ── Column Definitions ──────────────────────────────────────────────────────────

interface StaffingColumn {
  key: string
  label: string
  color: string
  headerColor: string
  docstatus: number
  plans: StaffingPlan[]
}

const COLUMN_DEFS: Omit<StaffingColumn, 'plans'>[] = [
  {
    key: 'draft',
    label: 'Draft',
    color: 'bg-gray-50 border-gray-100',
    headerColor: 'bg-gray-50 border-b-2 border-gray-300',
    docstatus: 0,
  },
  {
    key: 'submitted',
    label: 'Submitted',
    color: 'bg-green-50 border-green-100',
    headerColor: 'bg-green-50 border-b-2 border-green-300',
    docstatus: 1,
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-50 border-red-100',
    headerColor: 'bg-red-50 border-b-2 border-red-200',
    docstatus: 2,
  },
]

function buildColumns(plans: StaffingPlan[]): StaffingColumn[] {
  return COLUMN_DEFS.map((def) => ({
    ...def,
    plans: plans.filter((p) => p.docstatus === def.docstatus),
  }))
}

const STATUS_VARIANT: Record<number, 'gray' | 'green' | 'red'> = {
  0: 'gray',
  1: 'green',
  2: 'red',
}

// ── Skeleton ────────────────────────────────────────────────────────────────────

function StaffingSkeleton() {
  return (
    <div>
      <SkPageHeader />
      <div className="flex items-center gap-3 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`sk-${String(i)}`} className="flex items-center gap-2">
            <Sk className="h-4 w-20 rounded-md" />
            <Sk className="h-5 w-6 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[3, 2, 1].map((cards, i) => (
          <div key={`sk-col-${String(i)}`} className="bg-gray-50 rounded-xl p-3">
            <SkKanbanColumn cards={cards} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Detail Panel ────────────────────────────────────────────────────────────────

function DetailTable({ details }: Readonly<{ details: StaffingPlanDetail[] }>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
          <th className="text-left py-2 font-medium">Designation</th>
          <th className="text-right py-2 font-medium">Positions</th>
          <th className="text-right py-2 font-medium">Vacancies</th>
          <th className="text-right py-2 font-medium">Cost / Position</th>
          <th className="text-right py-2 font-medium">Total Cost</th>
        </tr>
      </thead>
      <tbody>
        {details.map((d, i) => (
          <tr key={`${d.designation}-${String(i)}`} className="border-b border-gray-50 last:border-0">
            <td className="py-2.5 text-gray-900 font-medium flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-gray-400" />
              {d.designation || '—'}
            </td>
            <td className="py-2.5 text-right text-gray-700">{d.numberOfPositions}</td>
            <td className="py-2.5 text-right">
              <span className={d.vacancies > 0 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
                {d.vacancies}
              </span>
            </td>
            <td className="py-2.5 text-right text-gray-700">{formatCurrency(d.estimatedCostPerPosition)}</td>
            <td className="py-2.5 text-right text-gray-900 font-medium">{formatCurrency(d.totalEstimatedCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function StaffingDetailPanel({ plan, onClose }: Readonly<{ plan: StaffingPlan; onClose: () => void }>) {
  const [details, setDetails] = useState<StaffingPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useFetchOnce(() => {
    getStaffingPlanDetails(plan.id)
      .then((d) => setDetails(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  })

  const STATUS_LABELS: Record<number, string> = { 0: 'Draft', 1: 'Submitted', 2: 'Cancelled' }
  const variant = STATUS_VARIANT[plan.docstatus] ?? 'gray'
  const statusLabel = STATUS_LABELS[plan.docstatus] ?? 'Draft'
  const staffDetails = details?.staffingDetails ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose() }}
        aria-label="Close panel"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col panel-slide-enter">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{plan.name}</h2>
            {plan.department && (
              <p className="text-sm text-gray-500 truncate">{plan.department}</p>
            )}
          </div>
          <Badge variant={variant}>{statusLabel}</Badge>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {plan.company || '—'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {plan.department || '—'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(plan.fromDate)}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(plan.toDate)}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Budget</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                {formatCurrency(plan.totalEstimatedBudget)}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
              <div className="mt-1">
                <Badge variant={variant}>{statusLabel}</Badge>
              </div>
            </div>
          </div>

          {/* Staffing Details Table */}
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Staffing Details</span>
            <div className="mt-3 bg-gray-50 rounded-xl border border-gray-100 p-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}
              {!loading && staffDetails.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No staffing details found.</p>
              )}
              {!loading && staffDetails.length > 0 && (
                <>
                  <DetailTable details={staffDetails} />
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                    <span className="text-xs font-semibold text-gray-500 uppercase mr-3">Total Budget</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(plan.totalEstimatedBudget)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function Staffings() {
  const pageLoading = usePageLoad()
  const [plans, setPlans] = useState<StaffingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<StaffingPlan | null>(null)

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await getStaffingPlans()
      setPlans(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staffing plans.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(false) })

  const columns = useMemo(() => buildColumns(plans), [plans])

  if (pageLoading || loading) return <StaffingSkeleton />

  return (
    <div>
      <PageHeader
        title="Staffings"
        subtitle={`${plans.length} staffing plan${plans.length === 1 ? '' : 's'}`}
        action={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh staffing plans"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pipeline summary */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {columns.map((col, i) => (
          <Fragment key={col.key}>
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="font-medium text-gray-700">{col.label}</span>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                {col.plans.length}
              </span>
            </div>
            {i < columns.length - 1 && (
              <div className="w-12 h-0.5 bg-gray-200 flex-shrink-0" />
            )}
          </Fragment>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`rounded-xl border ${col.color} overflow-hidden`}
          >
            <div className={`px-4 py-3 ${col.headerColor}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{col.label}</span>
                <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {col.plans.length}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3 min-h-[200px]">
              {col.plans.map((plan) => {
                const variant = STATUS_VARIANT[plan.docstatus] ?? 'gray'
                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className="font-semibold text-gray-900 text-sm leading-tight text-left hover:text-blue-600 transition-colors"
                          >
                            {plan.name}
                          </button>
                          {plan.department && (
                            <p className="text-xs text-gray-500 leading-tight mt-0.5">{plan.department}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {plan.company && (
                        <Badge variant="blue">
                          <Building2 className="w-3 h-3 mr-1 inline" />
                          {plan.company}
                        </Badge>
                      )}
                      {plan.totalEstimatedBudget > 0 && (
                        <Badge variant={variant}>
                          <DollarSign className="w-3 h-3 mr-1 inline" />
                          {formatCurrency(plan.totalEstimatedBudget)}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2.5 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(plan.fromDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(plan.toDate)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {col.plans.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">No staffing plans</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <StaffingDetailPanel
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  )
}
