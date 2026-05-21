import { Fragment, useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Briefcase, Building2, MapPin, RefreshCw, X, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader, SkKanbanColumn } from '../../components/ui/Skeleton'
import { getJobOpenings, updateJobOpeningStatus, createJobOpening, getDepartments, getDesignations, type LookupOption } from '../../services/hrm'
import type { JobOpening, JobOpeningStatus } from '../../types/hrm'

function RecruitmentSkeleton() {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[3, 2, 2, 1, 2].map((cards, i) => (
          <div key={`sk-col-${String(i)}`} className="bg-gray-50 rounded-xl p-3">
            <SkKanbanColumn cards={cards} />
          </div>
        ))}
      </div>
    </div>
  )
}

interface RecruitmentColumn {
  key: string
  label: string
  color: string
  headerColor: string
  statuses: JobOpeningStatus[]
  jobs: JobOpening[]
}

const COLUMN_DEFS: Omit<RecruitmentColumn, 'jobs'>[] = [
  {
    key: 'open',
    label: 'Open',
    color: 'bg-blue-50 border-blue-100',
    headerColor: 'bg-blue-50 border-b-2 border-blue-200',
    statuses: ['Open'],
  },
  {
    key: 'screening',
    label: 'Screening',
    color: 'bg-indigo-50 border-indigo-100',
    headerColor: 'bg-indigo-50 border-b-2 border-indigo-300',
    statuses: ['Screening'],
  },
  {
    key: 'ready-interview',
    label: 'Ready for Interview',
    color: 'bg-amber-50 border-amber-100',
    headerColor: 'bg-amber-50 border-b-2 border-amber-300',
    statuses: ['Ready for Interview'],
  },
  {
    key: 'interviewed',
    label: 'Interviewed',
    color: 'bg-purple-50 border-purple-100',
    headerColor: 'bg-purple-50 border-b-2 border-purple-300',
    statuses: ['Interviewed'],
  },
  {
    key: 'closed',
    label: 'Closed',
    color: 'bg-gray-100 border-gray-200',
    headerColor: 'bg-gray-50 border-b-2 border-gray-200',
    statuses: ['Onboarding', 'Rejected', 'Closed'],
  },
]

function buildColumns(jobs: JobOpening[]): RecruitmentColumn[] {
  return COLUMN_DEFS.map((def) => ({
    ...def,
    jobs: jobs.filter((j) => def.statuses.includes(j.status)),
  }))
}

function formatDate(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Add Job Opening Dialog ──────────────────────────────────────────────────

interface AddJobDialogProps {
  onClose: () => void
  onSaved: (job: JobOpening) => void
}

function AddJobOpeningDialog({ onClose, onSaved }: AddJobDialogProps) {
  const [jobTitle, setJobTitle] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)
  const [departments, setDepartments] = useState<LookupOption[]>([])
  const [designations, setDesignations] = useState<LookupOption[]>([])
  const [closing, setClosing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    getDepartments().then(setDepartments).catch(() => {})
    getDesignations().then(setDesignations).catch(() => {})
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) setClosing(true)
    }
    globalThis.addEventListener('keydown', onKey)
    return () => globalThis.removeEventListener('keydown', onKey)
  }, [submitting])

  function handleClose() {
    if (submitting) return
    setClosing(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!jobTitle.trim()) {
      setError('Job title is required.')
      setErrorShaking(true)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const newJob = await createJobOpening({
        jobTitle: jobTitle.trim(),
        designation: designation || undefined,
        department: department || undefined,
        description: description.trim() || undefined,
      })
      onSaved(newJob)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job opening.')
      setErrorShaking(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 ${closing ? 'backdrop-exit' : 'backdrop-enter'}`}
        onClick={submitting ? undefined : handleClose}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className={`bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto ${closing ? 'dialog-exit' : 'dialog-enter'}`}
          onClick={(e) => e.stopPropagation()}
          onAnimationEnd={() => { if (closing) onClose() }}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Job Opening</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create a new job opening for recruitment.</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 space-y-4">
              {/* Error */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div
                  className={`p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                  onAnimationEnd={() => setErrorShaking(false)}
                >
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              </div>

              {/* Job Title */}
              <div>
                <label htmlFor="job-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="job-title"
                  ref={inputRef}
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="form-input"
                />
              </div>

              {/* Designation */}
              <div>
                <label htmlFor="job-designation" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Designation
                </label>
                <select
                  id="job-designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="form-input"
                >
                  <option value="">— Select —</option>
                  {designations.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="job-department" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Department
                </label>
                <select
                  id="job-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="form-input"
                >
                  <option value="">— Select —</option>
                  {departments.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="job-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Job responsibilities, requirements..."
                  className="form-input resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary min-w-[180px]">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Job Opening
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
export function Recruitment() {
  const navigate = useNavigate()
  const pageLoading = usePageLoad()
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await getJobOpenings()
      setJobs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job openings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(false) })

  const columns = useMemo(() => buildColumns(jobs), [jobs])

  // Drag handlers
  function handleDragStart(e: React.DragEvent, jobId: string) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', jobId)
    setDraggingId(jobId)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDropTarget(null)
  }

  function handleDragOver(e: React.DragEvent, colKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(colKey)
  }

  function handleDragLeave(_e: React.DragEvent, colKey: string) {
    if (dropTarget === colKey) setDropTarget(null)
  }

  async function handleDrop(e: React.DragEvent, col: RecruitmentColumn) {
    e.preventDefault()
    setDropTarget(null)
    setDraggingId(null)
    const jobId = e.dataTransfer.getData('text/plain')
    if (!jobId) return
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return
    // The target status is the first status of the column (e.g. "Open", "Screening", etc.)
    const newStatus = col.statuses[0]
    if (job.status === newStatus) return
    // Optimistic update
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)))
    try {
      await updateJobOpeningStatus(jobId, newStatus)
    } catch {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: job.status } : j)))
      setError('Failed to update job opening status.')
    }
  }

  if (pageLoading || loading) return <RecruitmentSkeleton />

  return (
    <div>
      <Breadcrumb items={[{ label: 'Recruitment' }]} />
      <PageHeader
        title="Recruitment"
        subtitle={`${jobs.length} job opening${jobs.length === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
              aria-label="Refresh job openings"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" />
              Add Job Opening
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
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {columns.map((col, i) => (
          <Fragment key={col.key}>
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="font-medium text-gray-700">{col.label}</span>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                {col.jobs.length}
              </span>
            </div>
            {i < columns.length - 1 && (
              <div className="w-12 h-0.5 bg-gray-200 flex-shrink-0" />
            )}
          </Fragment>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`rounded-xl border ${col.color} overflow-hidden transition-all ${dropTarget === col.key ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={(e) => handleDragLeave(e, col.key)}
            onDrop={(e) => void handleDrop(e, col)}
          >
            <div className={`px-4 py-3 ${col.headerColor}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{col.label}</span>
                <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {col.jobs.length}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3 min-h-[200px]">
              {col.jobs.map((j) => (
                <div
                  key={j.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, j.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-grab ${draggingId === j.id ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/hrm/recruitment/${j.id}`) }}
                          className="font-semibold text-gray-900 text-sm leading-tight text-left hover:text-blue-600 transition-colors"
                        >
                          {j.jobTitle}
                        </button>
                        {j.designation && (
                          <p className="text-xs text-gray-500 leading-tight mt-0.5">{j.designation}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {col.key === 'closed' && (j.status === 'Onboarding' || j.status === 'Rejected') && (
                      <Badge variant={j.status === 'Onboarding' ? 'green' : 'red'}>
                        {j.status}
                      </Badge>
                    )}
                    {j.department && (
                      <Badge variant="blue">
                        <Building2 className="w-3 h-3 mr-1 inline" />
                        {j.department}
                      </Badge>
                    )}
                    {j.company && (
                      <Badge variant="gray">
                        <MapPin className="w-3 h-3 mr-1 inline" />
                        {j.company}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2.5 border-t border-gray-100">
                    {j.postedOn && <span>Posted {formatDate(j.postedOn)}</span>}
                    {j.closesOn && <span>Closes {formatDate(j.closesOn)}</span>}
                  </div>
                </div>
              ))}
              {col.jobs.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">No job openings</p>
              )}
            </div>

            {col.key === 'open' && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add job opening
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddDialog && (
        <AddJobOpeningDialog
          onClose={() => setShowAddDialog(false)}
          onSaved={(newJob) => {
            setJobs((prev) => [newJob, ...prev])
          }}
        />
      )}
    </div>
  )
}
