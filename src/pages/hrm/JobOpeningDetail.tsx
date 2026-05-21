import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, Building2, MapPin, Users, ClipboardList, Info, Mail, Star, Calendar, Clock, ExternalLink, UserCheck, FileText, Loader2, Plus, X, Phone, Link, DollarSign, RefreshCw, Check, XCircle, CalendarDays } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import { Combobox } from '../../components/ui/Combobox'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { FileUploader } from '../../components/ui/FileUploader'
import { getJobOpenings, getJobApplicants, getInterviews, createJobApplicant, updateJobApplicantStatus, createInterview, getInterviewRounds, getEmployees, getApplicantSources } from '../../services/hrm'
import type { JobOpening, JobApplicant, InterviewRound } from '../../types/hrm'
import type { UploadedFile } from '../../services/files'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatDate(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_VARIANT: Record<string, 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple'> = {
  Open: 'blue',
  Screening: 'purple',
  'Ready for Interview': 'yellow',
  Interviewed: 'purple',
  Onboarding: 'green',
  Rejected: 'red',
  Closed: 'gray',
}

const APPLICANT_STATUS_VARIANT: Record<string, 'blue' | 'green' | 'red' | 'yellow' | 'gray'> = {
  Open: 'blue',
  Replied: 'blue',
  Accepted: 'green',
  Rejected: 'red',
  Hold: 'yellow',
}

const INTERVIEW_STATUS_VARIANT: Record<string, 'blue' | 'green' | 'red' | 'yellow' | 'gray'> = {
  Pending: 'yellow',
  'Under Review': 'blue',
  Cleared: 'green',
  Rejected: 'red',
}

// ── Tabs ────────────────────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'applicants' | 'interviews'

const DETAIL_TABS: { id: DetailTab; label: string; icon: typeof Info }[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'applicants', label: 'Applicants', icon: Users },
  { id: 'interviews', label: 'Interviews', icon: ClipboardList },
]

// ── Skeleton ────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div>
      <SkPageHeader />
      <div className="mt-4 space-y-4">
        <Sk className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Sk key={`sk-${String(i)}`} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Add Applicant Dialog ────────────────────────────────────────────────────────

const APPLICANT_SOURCES: string[] = []

interface AddApplicantForm {
  applicantName: string
  emailAddress: string
  phone: string
  source: string
  referredBy: string
  resumeLink: string
  salaryFrom: string
  salaryTo: string
  notes: string
}

interface AddApplicantDialogProps {
  jobOpeningId: string
  jobTitle: string
  onClose: () => void
  onSaved: (applicant: JobApplicant) => void
}

function AddApplicantDialog({ jobOpeningId, jobTitle, onClose, onSaved }: Readonly<AddApplicantDialogProps>) {
  const [form, setForm] = useState<AddApplicantForm>({
    applicantName: '',
    emailAddress: '',
    phone: '',
    source: '',
    referredBy: '',
    resumeLink: '',
    salaryFrom: '',
    salaryTo: '',
    notes: '',
  })
  const [resumeFile, setResumeFile] = useState<UploadedFile | null>(null)
  const [sources, setSources] = useState<{ value: string; label: string }[]>([])
  const [loadingSources, setLoadingSources] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const employeesLoadedRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [shakingFields, setShakingFields] = useState<Set<keyof AddApplicantForm>>(new Set())

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submitting, onClose])

  useEffect(() => {
    setLoadingSources(true)
    getApplicantSources()
      .then((s) => setSources(s))
      .catch((err: unknown) => {
        setSubmitError(err instanceof Error ? err.message : 'Failed to load sources.')
      })
      .finally(() => setLoadingSources(false))
  }, [])

  function shake(fields: (keyof AddApplicantForm)[]) {
    setShakingFields(new Set(fields))
  }

  function handleSourceChange(selected: string[]) {
    const val = selected[0] ?? ''
    setForm((prev) => ({ ...prev, source: val, referredBy: '' }))
    setSubmitError(null)
    if (val.toLowerCase().includes('referral') && !employeesLoadedRef.current) {
      employeesLoadedRef.current = true
      setLoadingEmployees(true)
      getEmployees()
        .then((emps) => setEmployeeOptions(emps.map((emp) => ({ value: emp.id, label: emp.name }))))
        .catch(() => {})
        .finally(() => setLoadingEmployees(false))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const missing: (keyof AddApplicantForm)[] = []
    if (!form.applicantName.trim()) missing.push('applicantName')
    if (!form.emailAddress.trim()) missing.push('emailAddress')
    if (missing.length > 0) { shake(missing); return }
    setSubmitting(true)
    try {
      const applicant = await createJobApplicant({
        applicantName: form.applicantName,
        emailAddress: form.emailAddress,
        jobOpeningId,
        phone: form.phone,
        source: form.source,
        referredBy: form.referredBy || undefined,
        resumeLink: resumeFile?.url || form.resumeLink,
        salaryFrom: form.salaryFrom ? Number(form.salaryFrom) : undefined,
        salaryTo: form.salaryTo ? Number(form.salaryTo) : undefined,
        notes: form.notes,
      })
      onSaved(applicant)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create applicant.')
    } finally {
      setSubmitting(false)
    }
  }

  function field(key: keyof AddApplicantForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }))
        setSubmitError(null)
        if (shakingFields.has(key)) setShakingFields((prev) => { const s = new Set(prev); s.delete(key); return s })
      },
      className: `form-input ${
        shakingFields.has(key) ? 'border-red-400 field-shake' : ''
      }`,
      onAnimationEnd: () => setShakingFields((prev) => { const s = new Set(prev); s.delete(key); return s }),
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={submitting ? undefined : onClose}
      />

      {/* Centered modal */}
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Applicant</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{jobTitle}</p>
            </div>
            <button
              type="button"
              onClick={() => { if (!submitting) onClose() }}
              disabled={submitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={(e) => { void handleSubmit(e) }} noValidate className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Body — scrolls */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">
              {/* Submit error */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${submitError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {submitError}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700 mb-1">
                    Applicant Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="applicantName"
                    type="text"
                    placeholder="Jane Doe"
                    {...field('applicantName')}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="emailAddress"
                      type="email"
                      placeholder="jane@example.com"
                      {...field('emailAddress')}
                      className={`form-input pl-9 ${shakingFields.has('emailAddress') ? 'border-red-400 field-shake' : ''}`}
                      onAnimationEnd={() => setShakingFields((prev) => { const s = new Set(prev); s.delete('emailAddress'); return s })}
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+1 555 000 0000"
                      {...field('phone')}
                      className="form-input pl-9"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <Combobox
                    options={sources}
                    value={form.source ? [form.source] : []}
                    onChange={handleSourceChange}
                    max={1}
                    placeholder="Select source…"
                    loading={loadingSources}
                    disabled={submitting}
                  />
                </div>

                {form.source.toLowerCase().includes('referral') && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                    <Combobox
                      options={employeeOptions}
                      value={form.referredBy ? [form.referredBy] : []}
                      onChange={(vals) => setForm((prev) => ({ ...prev, referredBy: vals[0] ?? '' }))}
                      max={1}
                      placeholder="Search employees…"
                      loading={loadingEmployees}
                      disabled={submitting}
                    />
                  </div>
                )}

                {/* Salary expectation range */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Expectation</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="salaryFrom"
                        type="number"
                        min="0"
                        placeholder="From"
                        {...field('salaryFrom')}
                        className="form-input pl-9"
                      />
                    </div>
                    <span className="text-gray-400 text-sm flex-shrink-0">to</span>
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="salaryTo"
                        type="number"
                        min="0"
                        placeholder="To"
                        {...field('salaryTo')}
                        className="form-input pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Resume / CV upload */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resume / CV</label>
                  <FileUploader
                    value={resumeFile}
                    onChange={setResumeFile}
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                    label="Upload resume or CV (PDF, Word, or image)"
                    disabled={submitting}
                  />
                  {!resumeFile && (
                    <div className="mt-2">
                      <label htmlFor="resumeLink" className="block text-xs text-gray-500 mb-1">Or paste a link</label>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          id="resumeLink"
                          type="url"
                          placeholder="https://"
                          {...field('resumeLink')}
                          className="form-input pl-9"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    id="notes"
                    rows={3}
                    placeholder="Any additional notes…"
                    {...field('notes')}
                    className="form-input resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => { if (!submitting) onClose() }} disabled={submitting} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? 'Saving…' : 'Add Applicant'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

// ── Schedule Interview Panel ────────────────────────────────────────────────────

interface ScheduleInterviewPanelProps {
  applicant: JobApplicant
  jobOpeningId: string
  onClose: () => void
  onScheduled: () => void
}

function ScheduleInterviewPanel({ applicant, jobOpeningId, onClose, onScheduled }: Readonly<ScheduleInterviewPanelProps>) {
  const [rounds, setRounds] = useState<{ value: string; label: string }[]>([])
  const [loadingRounds, setLoadingRounds] = useState(true)
  const [round, setRound] = useState('')
  const [date, setDate] = useState('')
  const [fromTime, setFromTime] = useState('09:00')
  const [toTime, setToTime] = useState('10:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInterviewRounds()
      .then((r) => { setRounds(r); if (r.length > 0) setRound(r[0].value) })
      .catch(() => {})
      .finally(() => setLoadingRounds(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!round || !date) { setError('Please fill in all required fields.'); return }
    setSubmitting(true)
    try {
      await createInterview({
        jobApplicant: applicant.id,
        jobOpening: jobOpeningId,
        interviewRound: round,
        scheduledDate: date,
        fromTime,
        toTime,
      })
      onScheduled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule interview.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={submitting ? undefined : onClose}
      />

      {/* Centered modal from top */}
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Schedule Interview</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{applicant.applicantName} — {applicant.emailAddress}</p>
            </div>
            <button
              type="button"
              onClick={() => { if (!submitting) onClose() }}
              disabled={submitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} noValidate className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interview Round <span className="text-red-500">*</span>
            </label>
            {loadingRounds ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading rounds…
              </div>
            ) : (
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="form-input"
                disabled={submitting}
              >
                {rounds.length === 0 && <option value="">No rounds found</option>}
                {rounds.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="sched-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input pl-9"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sched-from" className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="sched-from"
                  type="time"
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                  className="form-input pl-9"
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <label htmlFor="sched-to" className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="sched-to"
                  type="time"
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                  className="form-input pl-9"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={() => { if (!submitting) onClose() }} disabled={submitting} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !round || !date} className="btn-primary flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
            {submitting ? 'Scheduling…' : 'Schedule Interview'}
          </button>
        </div>
      </form>
        </div>
      </div>
    </>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function JobOpeningDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pageLoading = usePageLoad()

  const [job, setJob] = useState<JobOpening | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [applicants, setApplicants] = useState<JobApplicant[] | null>(null)
  const [interviews, setInterviews] = useState<InterviewRound[] | null>(null)
  const [showAddApplicant, setShowAddApplicant] = useState(false)
  const [scheduleFor, setScheduleFor] = useState<JobApplicant | null>(null)

  const loadingApplicants = activeTab === 'applicants' && applicants === null
  const loadingInterviews = activeTab === 'interviews' && interviews === null

  useFetchOnce(() => {
    getJobOpenings()
      .then((jobs) => {
        const found = jobs.find((j) => j.id === id)
        setJob(found ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  })

  // Load applicants when tab selected
  useEffect(() => {
    if (activeTab === 'applicants' && applicants === null && id) {
      let cancelled = false
      getJobApplicants(id)
        .then((data) => { if (!cancelled) setApplicants(data) })
        .catch(() => { if (!cancelled) setApplicants([]) })
      return () => { cancelled = true }
    }
  }, [activeTab, applicants, id])

  // Load interviews when tab selected
  useEffect(() => {
    if (activeTab === 'interviews' && interviews === null && id) {
      let cancelled = false
      getInterviews(id)
        .then((data) => { if (!cancelled) setInterviews(data) })
        .catch(() => { if (!cancelled) setInterviews([]) })
      return () => { cancelled = true }
    }
  }, [activeTab, interviews, id])

  const [refreshingApplicants, setRefreshingApplicants] = useState(false)
  const [updatingApplicant, setUpdatingApplicant] = useState<string | null>(null)

  function refreshApplicants() {
    if (!id || refreshingApplicants) return
    setRefreshingApplicants(true)
    getJobApplicants(id)
      .then((data) => setApplicants(data))
      .catch(() => {})
      .finally(() => setRefreshingApplicants(false))
  }

  async function handleApplicantStatus(applicantId: string, status: string) {
    setUpdatingApplicant(applicantId)
    try {
      await updateJobApplicantStatus(applicantId, status)
      setApplicants((prev) =>
        prev ? prev.map((a) => (a.id === applicantId ? { ...a, status } : a)) : prev,
      )
    } catch {
      // silently fail
    } finally {
      setUpdatingApplicant(null)
    }
  }

  function goBack() {
    navigate('/hrm/recruitment')
  }

  if (pageLoading || loading) return <DetailSkeleton />

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Job opening not found.</p>
        <button type="button" onClick={goBack} className="mt-3 text-blue-600 hover:underline text-sm">
          ← Back to Recruitment
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full page-slide-enter">
      <Breadcrumb items={[
        { label: 'Recruitment', to: '/hrm/recruitment' },
        { label: job.id },
      ]} />

      {/* Title row */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-0 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">{job.jobTitle}</h1>
          {job.designation && (
            <p className="text-sm text-gray-500 truncate">{job.designation}</p>
          )}
        </div>
        <Badge variant={STATUS_VARIANT[job.status] ?? 'gray'}>{job.status}</Badge>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pt-6 relative">
        <div className="max-w-4xl">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</span>
                  <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    {job.department || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Designation</span>
                  <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                    {job.designation || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Company</span>
                  <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {job.company || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                  <div className="mt-1">
                    <Badge variant={STATUS_VARIANT[job.status] ?? 'gray'}>{job.status}</Badge>
                  </div>
                </div>
                {job.postedOn && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Posted On</span>
                    <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(job.postedOn)}
                    </p>
                  </div>
                )}
                {job.closesOn && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Closes On</span>
                    <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(job.closesOn)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
                {job.description ? (
                  <div
                    className="mt-2 text-sm text-gray-700 prose prose-sm max-w-none bg-white rounded-xl p-4 border border-gray-100"
                    dangerouslySetInnerHTML={{ __html: job.description }}
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-400 italic">No description provided.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'applicants' && (
            <div>
              {/* Add Applicant button */}
              <div className="flex justify-end mb-4 gap-2">
                <button
                  type="button"
                  onClick={refreshApplicants}
                  disabled={refreshingApplicants}
                  className="btn-secondary flex items-center gap-2"
                  title="Refresh applicants"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingApplicants ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddApplicant(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Applicant
                </button>
              </div>
              {loadingApplicants && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}
              {!loadingApplicants && applicants !== null && applicants.length === 0 && (
                <div className="text-center py-12">
                  <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No applicants yet</p>
                  <p className="text-xs text-gray-400 mt-1">Applicants will appear here once they apply for this position.</p>
                </div>
              )}
              {!loadingApplicants && applicants !== null && applicants.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
                    {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {applicants.map((a) => {
                      const isUpdating = updatingApplicant === a.id
                      return (
                        <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow flex flex-col">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                {a.applicantName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-gray-900 truncate">{a.applicantName}</p>
                                {a.emailAddress && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                    {a.emailAddress}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant={APPLICANT_STATUS_VARIANT[a.status] ?? 'gray'}>
                              {a.status || 'Open'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                            {a.source && (
                              <span className="flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                {a.source}
                              </span>
                            )}
                            {a.createdOn && (
                              <span>Applied {formatDate(a.createdOn)}</span>
                            )}
                            {a.resumeLink && (
                              <a
                                href={a.resumeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Resume
                              </a>
                            )}
                          </div>
                          {a.notes && (
                            <p className="mt-2 text-xs text-gray-500 line-clamp-2">{a.notes}</p>
                          )}
                          {/* Accept / Reject / Schedule buttons */}
                          <div className="mt-3 pt-3 border-t border-gray-50 overflow-hidden">
                            {a.status === 'Accepted' ? (
                              <div className="btn-enter-right">
                                <button
                                  type="button"
                                  onClick={() => setScheduleFor(a)}
                                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-purple-50 text-purple-600 hover:bg-purple-100"
                                >
                                  <CalendarDays className="w-3.5 h-3.5" />
                                  Schedule Interview
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => { void handleApplicantStatus(a.id, 'Accepted') }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-50 text-green-600 hover:bg-green-100"
                                >
                                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating || a.status === 'Rejected'}
                                  onClick={() => { void handleApplicantStatus(a.id, 'Rejected') }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-red-50 text-red-600 hover:bg-red-100"
                                >
                                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'interviews' && (
            <div>
              {loadingInterviews && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}
              {!loadingInterviews && interviews !== null && interviews.length === 0 && (
                <div className="text-center py-12">
                  <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No interviews scheduled</p>
                  <p className="text-xs text-gray-400 mt-1">Interviews will appear here once they are scheduled in ERPNext.</p>
                </div>
              )}
              {!loadingInterviews && interviews !== null && interviews.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
                    {interviews.length} interview{interviews.length === 1 ? '' : 's'}
                  </p>
                  {interviews.map((iv) => (
                    <div key={iv.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">
                            {iv.interviewRound || 'Interview'}
                          </p>
                          {iv.jobApplicant && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Applicant: {iv.jobApplicant}
                            </p>
                          )}
                        </div>
                        <Badge variant={INTERVIEW_STATUS_VARIANT[iv.status] ?? 'gray'}>
                          {iv.status || 'Pending'}
                        </Badge>
                      </div>
                      <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                        {iv.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(iv.scheduledDate)}
                          </span>
                        )}
                        {iv.fromTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {iv.fromTime}{iv.toTime ? ` – ${iv.toTime}` : ''}
                          </span>
                        )}
                        {iv.averageRating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {iv.averageRating.toFixed(1)}/5
                          </span>
                        )}
                        {iv.result && (
                          <Badge variant={INTERVIEW_STATUS_VARIANT[iv.result] ?? 'gray'}>
                            {iv.result}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Interview Panel — full overlay like staff detail */}
      {scheduleFor && job && (
        <ScheduleInterviewPanel
          applicant={scheduleFor}
          jobOpeningId={job.id}
          onClose={() => setScheduleFor(null)}
          onScheduled={() => {
            setScheduleFor(null)
            setInterviews(null)
            setActiveTab('interviews')
          }}
        />
      )}

      {showAddApplicant && job && (
        <AddApplicantDialog
          jobOpeningId={job.id}
          jobTitle={job.jobTitle}
          onClose={() => setShowAddApplicant(false)}
          onSaved={(applicant) => {
            setApplicants((prev) => prev ? [applicant, ...prev] : [applicant])
            setShowAddApplicant(false)
            refreshApplicants()
          }}
        />
      )}
    </div>
  )
}
