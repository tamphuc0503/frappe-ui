import { useState, useEffect } from 'react'
import { Plus, X, Loader2, RefreshCw, UserPlus, Briefcase } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Combobox } from '../../components/ui/Combobox'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { http, FRAPPE_BASE } from '../../services/http'
import { getDepartments, getDesignations, type LookupOption } from '../../services/hrm'

// ─── Types ─────────────────────────────────────────────────────────────────────

type JobOpeningStatus = 'Open' | 'Closed' | 'On Hold'

interface JobOpening {
  id: string
  jobTitle: string
  designation: string
  department: string
  status: JobOpeningStatus
  noOfPositions: number
  publishedOn: string
  description: string
}

interface FrappeJobOpening {
  name: string
  job_title?: string
  designation?: string
  department?: string
  status?: string
  no_of_positions?: number
  publish_on?: string
  description?: string
}

// ─── API ───────────────────────────────────────────────────────────────────────

interface GetListResponse<T> { message?: T[]; exc?: string }
interface InsertResponse { message?: unknown; exc?: string; _server_messages?: string }

function decodeJobOpening(f: FrappeJobOpening): JobOpening {
  const statusValues: JobOpeningStatus[] = ['Open', 'Closed', 'On Hold']
  const s = (statusValues as string[]).includes(f.status ?? '') ? (f.status as JobOpeningStatus) : 'Open'
  return {
    id: f.name,
    jobTitle: f.job_title ?? '',
    designation: f.designation ?? '',
    department: f.department ?? '',
    status: s,
    noOfPositions: f.no_of_positions ?? 1,
    publishedOn: f.publish_on ?? '',
    description: f.description ?? '',
  }
}

async function getJobOpenings(): Promise<JobOpening[]> {
  const params = new URLSearchParams({
    doctype: 'Job Opening',
    fields: JSON.stringify([
      'name', 'job_title', 'designation', 'department',
      'status', 'no_of_positions', 'publish_on', 'description',
    ]),
    limit_page_length: '0',
    order_by: 'creation desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeJobOpening>
  if (!res.ok || data.exc) throw new Error(data.exc ?? 'Failed to fetch job openings.')
  return (data.message ?? []).map(decodeJobOpening)
}

interface CreateJobOpeningInput {
  jobTitle: string
  designation: string
  department: string
  noOfPositions: number
  description: string
}

async function createJobOpening(input: CreateJobOpeningInput): Promise<void> {
  const doc = {
    doctype: 'Job Opening',
    job_title: input.jobTitle,
    designation: input.designation,
    department: input.department,
    no_of_positions: input.noOfPositions,
    description: input.description,
    status: 'Open',
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse
  if (!res.ok || data.exc) {
    let msg = 'Failed to create job opening.'
    const serverMsg = data._server_messages
    if (serverMsg) {
      try {
        const parsed = JSON.parse(serverMsg) as string | string[]
        const first = Array.isArray(parsed) ? parsed[0] : parsed
        const inner = JSON.parse(first) as { message?: string }
        if (inner.message) msg = inner.message
      } catch { /* use default */ }
    }
    throw new Error(msg)
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<JobOpeningStatus, 'green' | 'gray' | 'yellow'> = {
  Open: 'green',
  Closed: 'gray',
  'On Hold': 'yellow',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function RequestNewMember() {
  const pageLoading = usePageLoad()
  const [openings, setOpenings] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    setError(null)
    try {
      setOpenings(await getJobOpenings())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job openings.')
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
        <div className="flex-1 overflow-y-auto min-h-0"><SkTable rows={6} cols={5} /></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="Request New Member"
        subtitle={`${openings.length} job opening${openings.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
              aria-label="Refresh job openings"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setShowDialog(true)}
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
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600"><Briefcase className="w-5 h-5" /></div>
              <p className="text-sm font-medium text-gray-600">Total Openings</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{openings.length}</p>
          </div>
          <div className="card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600"><UserPlus className="w-5 h-5" /></div>
              <p className="text-sm font-medium text-gray-600">Open Positions</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{openings.filter((o) => o.status === 'Open').reduce((s, o) => s + o.noOfPositions, 0)}</p>
          </div>
          <div className="card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500"><Briefcase className="w-5 h-5" /></div>
              <p className="text-sm font-medium text-gray-600">Closed</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{openings.filter((o) => o.status === 'Closed').length}</p>
          </div>
        </div>

        {/* Table */}
        {openings.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 text-sm">
            <p>No job openings yet. Click &ldquo;New Request&rdquo; to start recruiting.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Job Title</th>
                    <th className="table-th">Department</th>
                    <th className="table-th">Designation</th>
                    <th className="table-th text-right">Positions</th>
                    <th className="table-th">Published</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {openings.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td">
                        <p className="font-medium text-gray-900 text-sm">{o.jobTitle || '—'}</p>
                        {o.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[280px]" title={o.description}>{o.description}</p>
                        )}
                      </td>
                      <td className="table-td text-sm text-gray-700">{o.department || '—'}</td>
                      <td className="table-td text-sm text-gray-700">{o.designation || '—'}</td>
                      <td className="table-td text-sm text-gray-900 text-right tabular-nums">{o.noOfPositions}</td>
                      <td className="table-td text-sm text-gray-500">{formatDate(o.publishedOn)}</td>
                      <td className="table-td"><Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showDialog && (
        <NewMemberRequestDialog
          onClose={() => setShowDialog(false)}
          onSubmitted={() => { setShowDialog(false); void load(true) }}
        />
      )}
    </div>
  )
}

// ─── New Member Request Dialog ─────────────────────────────────────────────────

interface NewMemberRequestDialogProps {
  onClose: () => void
  onSubmitted: () => void
}

function NewMemberRequestDialog({ onClose, onSubmitted }: NewMemberRequestDialogProps) {
  const [jobTitle, setJobTitle] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [positions, setPositions] = useState('1')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)

  const [departments, setDepartments] = useState<LookupOption[]>([])
  const [designations, setDesignations] = useState<LookupOption[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [loadingDesigs, setLoadingDesigs] = useState(false)
  const [deptsLoaded, setDeptsLoaded] = useState(false)
  const [desigsLoaded, setDesigsLoaded] = useState(false)

  function loadDepts() {
    if (deptsLoaded) return
    setDeptsLoaded(true)
    setLoadingDepts(true)
    getDepartments()
      .then((d) => setDepartments(d))
      .catch(() => { setDeptsLoaded(false) })
      .finally(() => setLoadingDepts(false))
  }

  function loadDesigs() {
    if (desigsLoaded) return
    setDesigsLoaded(true)
    setLoadingDesigs(true)
    getDesignations()
      .then((d) => setDesignations(d))
      .catch(() => { setDesigsLoaded(false) })
      .finally(() => setLoadingDesigs(false))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  function clearError() { setSubmitError(null) }

  async function handleSubmit() {
    if (!jobTitle.trim()) {
      setSubmitError('Job title is required.')
      setErrorShaking(true)
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    try {
      await createJobOpening({
        jobTitle: jobTitle.trim(),
        designation,
        department,
        noOfPositions: Math.max(1, parseInt(positions, 10) || 1),
        description: description.trim(),
      })
      onSubmitted()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit request.')
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
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Request New Member</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create a new job opening to start recruitment.</p>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">
            <div>
              <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                id="job-title"
                type="text"
                value={jobTitle}
                onChange={(e) => { setJobTitle(e.target.value); clearError() }}
                placeholder="e.g. Senior Fleet Analyst"
                className="form-input w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                <Combobox
                  options={departments}
                  value={department ? [department] : []}
                  onChange={(vs) => { setDepartment(vs[0] ?? ''); clearError() }}
                  max={1}
                  placeholder="Select department"
                  loading={loadingDepts}
                  onOpen={loadDepts}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
                <Combobox
                  options={designations}
                  value={designation ? [designation] : []}
                  onChange={(vs) => { setDesignation(vs[0] ?? ''); clearError() }}
                  max={1}
                  placeholder="Select designation"
                  loading={loadingDesigs}
                  onOpen={loadDesigs}
                />
              </div>
            </div>

            <div>
              <label htmlFor="no-positions" className="block text-sm font-medium text-gray-700 mb-1.5">
                No. of Positions
              </label>
              <input
                id="no-positions"
                type="number"
                min={1}
                value={positions}
                onChange={(e) => { setPositions(e.target.value); clearError() }}
                className="form-input w-full"
              />
            </div>

            <div>
              <label htmlFor="job-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                id="job-desc"
                rows={3}
                value={description}
                onChange={(e) => { setDescription(e.target.value); clearError() }}
                placeholder="Responsibilities, requirements, etc."
                className="form-input w-full resize-none"
              />
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${submitError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div
                className={`p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                onAnimationEnd={() => setErrorShaking(false)}
              >
                <span className="text-red-600 text-sm">{submitError}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary min-w-[140px]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
