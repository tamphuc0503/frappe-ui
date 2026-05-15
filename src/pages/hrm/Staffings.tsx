import { Fragment, useState, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2, Calendar, DollarSign, RefreshCw, Loader2, Briefcase, X, ArrowLeft, Plus, ExternalLink } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader, SkKanbanColumn } from '../../components/ui/Skeleton'
import { getStaffingPlans, getStaffingPlanDetails, createStaffingPlan, updateStaffingPlanDocstatus, getDepartments, getDesignations, createJobOpening, getJobOpeningsByDesignations, type LookupOption } from '../../services/hrm'
import { getCompanyCache } from '../../services/company'
import type { StaffingPlan, StaffingPlanDetail } from '../../types/hrm'
import type { JobOpening } from '../../types/hrm'

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

// Only Draft→Submit and Submitted→Cancel are valid Frappe transitions.
function canDrop(fromDocstatus: number, toDocstatus: number): boolean {
  if (fromDocstatus === toDocstatus) return false
  if (fromDocstatus === 0 && toDocstatus === 1) return true
  if (fromDocstatus === 1 && toDocstatus === 2) return true
  return false
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

interface DetailTableProps {
  details: StaffingPlanDetail[]
  plan: StaffingPlan
  jobOpeningsMap: Map<string, JobOpening>
  onJobOpened: (designation: string, job: JobOpening) => void
}

function DetailTable({ details, plan, jobOpeningsMap, onJobOpened }: Readonly<DetailTableProps>) {
  const [openingIds, setOpeningIds] = useState<Set<number>>(new Set())
  const [openingErrors, setOpeningErrors] = useState<Record<number, string>>({})

  async function handleOpenJob(d: StaffingPlanDetail, i: number) {
    setOpeningIds((prev) => new Set(prev).add(i))
    setOpeningErrors((prev) => { const n = { ...prev }; delete n[i]; return n })
    try {
      const job = await createJobOpening({
        jobTitle: d.designation,
        designation: d.designation,
        department: plan.department,
      })
      onJobOpened(d.designation, job)
    } catch (err) {
      setOpeningErrors((prev) => ({ ...prev, [i]: err instanceof Error ? err.message : 'Failed to create job opening.' }))
    } finally {
      setOpeningIds((prev) => { const s = new Set(prev); s.delete(i); return s })
    }
  }

  return (
    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '34%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '18%' }} />
        <col style={{ width: '18%' }} />
        {plan.docstatus === 1 && <col style={{ width: '12%' }} />}
      </colgroup>
      <thead>
        <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
          <th className="text-left py-2 font-medium overflow-hidden resize-x">Designation</th>
          <th className="text-right py-2 font-medium overflow-hidden resize-x">Pos.</th>
          <th className="text-right py-2 font-medium overflow-hidden resize-x">Vacancies</th>
          <th className="text-right py-2 font-medium overflow-hidden resize-x">Cost / Position</th>
          <th className="text-right py-2 font-medium overflow-hidden resize-x">Total Cost</th>
          {plan.docstatus === 1 && <th className="overflow-hidden" />}
        </tr>
      </thead>
      <tbody>
        {details.map((d, i) => {
          const existingJob = jobOpeningsMap.get(d.designation)
          return (
            <tr key={`${d.designation}-${String(i)}`} className="border-b border-gray-50 last:border-0">
              <td className="py-2.5 overflow-hidden">
                <div className="text-gray-900 font-medium flex items-center gap-2 truncate">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{d.designation || '—'}</span>
                </div>
                {openingErrors[i] && (
                  <p className="mt-0.5 text-xs text-red-600 truncate">{openingErrors[i]}</p>
                )}
              </td>
              <td className="py-2.5 text-right text-gray-700">{d.numberOfPositions}</td>
              <td className="py-2.5 text-right">
                <span className={d.vacancies > 0 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>
                  {d.vacancies}
                </span>
              </td>
              <td className="py-2.5 text-right text-gray-700">{formatCurrency(d.estimatedCostPerPosition)}</td>
              <td className="py-2.5 text-right text-gray-900 font-medium">{formatCurrency(d.totalEstimatedCost)}</td>
              {plan.docstatus === 1 && (
                <td className="py-2.5 text-right">
                  {existingJob ? (
                    <Link
                      to={`/hrm/recruitment/${existingJob.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Job
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { void handleOpenJob(d, i) }}
                      disabled={openingIds.has(i)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      {openingIds.has(i)
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Plus className="w-3 h-3" />
                      }
                      Open Job
                    </button>
                  )}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function StaffingDetailPanel({ plan, onClose, onPlanUpdated }: Readonly<{ plan: StaffingPlan; onClose: () => void; onPlanUpdated: (updated: StaffingPlan) => void }>) {
  const [details, setDetails] = useState<StaffingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [jobOpeningsMap, setJobOpeningsMap] = useState<Map<string, JobOpening>>(new Map())

  function handleClose() {
    if (cancelling) return
    setClosing(true)
  }

  async function handleCancel() {
    setCancelError(null)
    setCancelling(true)
    try {
      await updateStaffingPlanDocstatus(plan.id, 2)
      onPlanUpdated({ ...plan, docstatus: 2 })
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel plan.')
    } finally {
      setCancelling(false)
    }
  }

  useFetchOnce(() => {
    getStaffingPlanDetails(plan.id)
      .then((d) => {
        setDetails(d)
        const designations = d.staffingDetails.map((s) => s.designation).filter(Boolean)
        return getJobOpeningsByDesignations(designations)
      })
      .then((jobs) => {
        const map = new Map<string, JobOpening>()
        for (const job of jobs) {
          if (job.designation && !map.has(job.designation)) {
            map.set(job.designation, job)
          }
        }
        setJobOpeningsMap(map)
      })
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
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-280 ${closing ? 'opacity-0' : 'opacity-100'}`}
        role="button"
        tabIndex={-1}
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') handleClose() }}
        aria-label="Close panel"
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white shadow-2xl flex flex-col ${closing ? 'panel-slide-right-out' : 'panel-slide-right'}`}
        onAnimationEnd={() => { if (closing) onClose() }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={handleClose}
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
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cancel error */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${cancelError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
              {cancelError}
            </div>
          </div>
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
                  <DetailTable
                    details={staffDetails}
                    plan={plan}
                    jobOpeningsMap={jobOpeningsMap}
                    onJobOpened={(designation, job) => {
                      setJobOpeningsMap((prev) => new Map(prev).set(designation, job))
                    }}
                  />
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                    <span className="text-xs font-semibold text-gray-500 uppercase mr-3">Total Budget</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(plan.totalEstimatedBudget)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer — only show Cancel action for submitted plans */}
        {plan.docstatus === 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={cancelling}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => { void handleCancel() }}
              disabled={cancelling}
              className="btn-danger flex items-center gap-2"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {cancelling ? 'Cancelling…' : 'Cancel Plan'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── Add Staffing Dialog ─────────────────────────────────────────────────────────

interface StaffingDetailRow {
  id: string
  designation: string
  vacancies: string
  estimatedCostPerPosition: string
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11)
}

function newDetailRow(): StaffingDetailRow {
  return { id: uid(), designation: '', vacancies: '', estimatedCostPerPosition: '' }
}

interface AddStaffingForm {
  planName: string
  department: string
  fromDate: string
  toDate: string
}

interface AddStaffingDialogProps {
  onClose: () => void
  onSaved: () => void
}

function AddStaffingDialog({ onClose, onSaved }: Readonly<AddStaffingDialogProps>) {
  const [form, setForm] = useState<AddStaffingForm>({
    planName: '',
    department: '',
    fromDate: '',
    toDate: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AddStaffingForm, string>>>({})
  const [shakingFields, setShakingFields] = useState<Set<keyof AddStaffingForm>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)
  const [departments, setDepartments] = useState<LookupOption[]>([])
  const [designations, setDesignations] = useState<string[]>([])
  const [detailRows, setDetailRows] = useState<StaffingDetailRow[]>([newDetailRow()])
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDepartments()
      .then((opts) => setDepartments(opts))
      .catch(() => {})
    getDesignations()
      .then((opts) => setDesignations(opts.map((o) => o.label)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    firstInputRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, submitting])

  function set<K extends keyof AddStaffingForm>(key: K, value: AddStaffingForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setSubmitError(null)
  }

  function stopShake(field: keyof AddStaffingForm) {
    setShakingFields((prev) => { const s = new Set(prev); s.delete(field); return s })
  }

  function updateDetailRow<K extends keyof StaffingDetailRow>(rowId: string, field: K, value: StaffingDetailRow[K]) {
    setDetailRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)))
  }

  function removeDetailRow(rowId: string) {
    setDetailRows((prev) => prev.filter((r) => r.id !== rowId))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setErrors({})

    const newErrors: Partial<Record<keyof AddStaffingForm, string>> = {}
    const shaking = new Set<keyof AddStaffingForm>()

    if (!form.planName.trim()) { newErrors.planName = 'Plan name is required.'; shaking.add('planName') }
    if (!form.fromDate) { newErrors.fromDate = 'From date is required.'; shaking.add('fromDate') }
    if (!form.toDate) { newErrors.toDate = 'To date is required.'; shaking.add('toDate') }
    if (form.fromDate && form.toDate && form.fromDate > form.toDate) {
      newErrors.toDate = 'To date must be after from date.'; shaking.add('toDate')
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setShakingFields(shaking)
      return
    }

    setSubmitting(true)
    try {
      // Resolve the typed label back to the Frappe doc name (value).
      // Frappe link fields require the document name, not the display label.
      const deptInput = form.department.trim()
      const deptMatch = departments.find(
        (d) => d.label.toLowerCase() === deptInput.toLowerCase() || d.value.toLowerCase() === deptInput.toLowerCase()
      )
      const deptValue = deptMatch ? deptMatch.value : deptInput
      const details = detailRows
          .filter((r) => r.designation.trim())
          .map((r) => ({
            designation: r.designation.trim(),
            vacancies: r.vacancies ? Number(r.vacancies) : 0,
            estimatedCostPerPosition: r.estimatedCostPerPosition ? Number(r.estimatedCostPerPosition) : 0,
          }))
      const totalEstimatedBudget = details.reduce(
        (sum, d) => sum + d.vacancies * d.estimatedCostPerPosition,
        0
      )
      await createStaffingPlan({
        planName: form.planName.trim(),
        company: getCompanyCache()?.name ?? '',
        department: deptValue,
        fromDate: form.fromDate,
        toDate: form.toDate,
        totalEstimatedBudget,
        staffingDetails: details,
      })
      onSaved()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create staffing plan.')
      setErrorShaking(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={submitting ? undefined : onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col panel-slide-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Staffing Plan</h2>
            <p className="text-sm text-gray-500 mt-0.5">Fill in the details to create a staffing plan.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
            {/* Error banner */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${submitError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div
                className={`p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                onAnimationEnd={() => setErrorShaking(false)}
              >
                <span className="text-red-600 text-sm">{submitError}</span>
              </div>
            </div>

            {/* Plan Name */}
            <div>
              <label htmlFor="sp-plan-name" className="block text-sm font-medium text-gray-700 mb-1">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                id="sp-plan-name"
                ref={firstInputRef}
                type="text"
                value={form.planName}
                onChange={(e) => set('planName', e.target.value)}
                className={`form-input ${shakingFields.has('planName') ? 'field-shake' : ''}`}
                onAnimationEnd={() => stopShake('planName')}
                disabled={submitting}
                placeholder="e.g. Q3 2026 Engineering Hiring"
              />
              {errors.planName && <p className="mt-1 text-xs text-red-600">{errors.planName}</p>}
            </div>

            {/* Department */}
            <div>
              <label htmlFor="sp-department" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                id="sp-department"
                type="text"
                list="sp-department-list"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                className="form-input"
                disabled={submitting}
                placeholder="Select or type a department"
              />
              <datalist id="sp-department-list">
                {departments.map((d) => <option key={d.value} value={d.label} />)}
              </datalist>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sp-from-date" className="block text-sm font-medium text-gray-700 mb-1">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="sp-from-date"
                  type="date"
                  value={form.fromDate}
                  onChange={(e) => set('fromDate', e.target.value)}
                  className={`form-input ${shakingFields.has('fromDate') ? 'field-shake' : ''}`}
                  onAnimationEnd={() => stopShake('fromDate')}
                  disabled={submitting}
                />
                {errors.fromDate && <p className="mt-1 text-xs text-red-600">{errors.fromDate}</p>}
              </div>
              <div>
                <label htmlFor="sp-to-date" className="block text-sm font-medium text-gray-700 mb-1">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="sp-to-date"
                  type="date"
                  value={form.toDate}
                  onChange={(e) => set('toDate', e.target.value)}
                  className={`form-input ${shakingFields.has('toDate') ? 'field-shake' : ''}`}
                  onAnimationEnd={() => stopShake('toDate')}
                  disabled={submitting}
                />
                {errors.toDate && <p className="mt-1 text-xs text-red-600">{errors.toDate}</p>}
              </div>
            </div>

            {/* Staffing Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="block text-sm font-medium text-gray-700">
                  Staffing Details{detailRows.length > 0 ? ` (${detailRows.length})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailRows((prev) => [...prev, newDetailRow()])}
                  disabled={submitting}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
              <datalist id="sp-designation-list">
                {designations.map((d) => <option key={d} value={d} />)}
              </datalist>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Designation</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Vacancies</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">Cost / Position</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-400">No rows. Click "Add Row" to start.</td>
                      </tr>
                    )}
                    {detailRows.map((row) => (
                      <tr key={row.id} className="bg-white">
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            list="sp-designation-list"
                            value={row.designation}
                            onChange={(e) => updateDetailRow(row.id, 'designation', e.target.value)}
                            className="form-input text-sm py-1"
                            disabled={submitting}
                            placeholder="e.g. Engineer"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            value={row.vacancies}
                            onChange={(e) => updateDetailRow(row.id, 'vacancies', e.target.value)}
                            className="form-input text-sm py-1 text-right"
                            disabled={submitting}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.estimatedCostPerPosition}
                            onChange={(e) => updateDetailRow(row.id, 'estimatedCostPerPosition', e.target.value)}
                            className="form-input text-sm py-1 text-right"
                            disabled={submitting}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeDetailRow(row.id)}
                            disabled={submitting}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            aria-label="Remove row"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </form>
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
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

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

  async function handleDrop(e: React.DragEvent, targetDocstatus: number) {
    e.preventDefault()
    setDragOverCol(null)
    const planId = e.dataTransfer.getData('text/plain')
    if (!planId) return
    const plan = plans.find((p) => p.id === planId)
    if (!plan || !canDrop(plan.docstatus, targetDocstatus)) return
    const prevDocstatus = plan.docstatus
    setUpdatingIds((prev) => new Set(prev).add(planId))
    setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, docstatus: targetDocstatus } : p))
    // Clear blur immediately after the optimistic move — the card is already in the right column.
    setUpdatingIds((prev) => { const s = new Set(prev); s.delete(planId); return s })
    try {
      await updateStaffingPlanDocstatus(planId, targetDocstatus as 1 | 2)
    } catch (err) {
      setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, docstatus: prevDocstatus } : p))
      setError(err instanceof Error ? err.message : 'Failed to update status.')
    }
  }

  const columns = useMemo(() => buildColumns(plans), [plans])

  if (pageLoading || loading) return <StaffingSkeleton />

  return (
    <div>
      <PageHeader
        title="Staffings"
        subtitle={`${plans.length} staffing plan${plans.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => setShowAddDialog(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Staff
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pipeline summary */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
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
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
        {columns.map((col) => {
          const draggingPlan = draggingId ? plans.find((p) => p.id === draggingId) : null
          const isValidTarget = draggingPlan ? canDrop(draggingPlan.docstatus, col.docstatus) : false
          const isOver = dragOverCol === col.key && isValidTarget
          return (
          <div
            key={col.key}
            className={`rounded-xl border ${col.color} overflow-hidden transition-shadow ${isOver ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = isValidTarget ? 'move' : 'none'
              setDragOverCol(col.key)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null)
            }}
            onDrop={(e) => { void handleDrop(e, col.docstatus) }}
          >
            <div className={`px-4 py-3 ${col.headerColor}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{col.label}</span>
                <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {col.plans.length}
                </span>
              </div>
            </div>

            <div className={`p-3 space-y-3 min-h-[200px] transition-colors ${isOver ? 'bg-blue-50/40' : ''}`}>
              {col.plans.map((plan) => {
                const variant = STATUS_VARIANT[plan.docstatus] ?? 'gray'
                const isUpdating = updatingIds.has(plan.id)
                const isDragging = draggingId === plan.id
                return (
                  <div
                    key={plan.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', plan.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingId(plan.id)
                    }}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null) }}
                    className={`bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${isDragging ? 'opacity-40 scale-95' : ''} ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
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
                      {isUpdating ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      ) : (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(plan.toDate)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {col.plans.length === 0 && (
                <div className={`flex items-center justify-center min-h-[120px] rounded-lg border-2 border-dashed transition-colors ${isOver ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                  <p className="text-center text-xs text-gray-400">
                    {isOver ? 'Drop here' : 'No staffing plans'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )})
      }</div>
      </div>

      {selectedPlan && (
        <StaffingDetailPanel
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onPlanUpdated={(updated) => {
            setSelectedPlan(updated)
            setPlans((prev) => prev.map((p) => p.id === updated.id ? updated : p))
          }}
        />
      )}

      {showAddDialog && (
        <AddStaffingDialog
          onClose={() => setShowAddDialog(false)}
          onSaved={() => { void load(true) }}
        />
      )}
    </div>
  )
}
