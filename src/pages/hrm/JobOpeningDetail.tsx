import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, Building2, MapPin, Users, ClipboardList, Info, Mail, Star, Calendar, Clock, ExternalLink, UserCheck, FileText, Loader2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { getJobOpenings, getJobApplicants, getInterviews } from '../../services/hrm'
import type { JobOpening, JobApplicant, InterviewRound } from '../../types/hrm'

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
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-0 flex-shrink-0">
        <button
          type="button"
          onClick={goBack}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
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
      <div className="flex-1 overflow-y-auto pt-6">
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
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
                    {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
                  </p>
                  {applicants.map((a) => (
                    <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {a.applicantName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{a.applicantName}</p>
                            {a.emailAddress && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
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
                        {a.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {a.rating}/5
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
                    </div>
                  ))}
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
    </div>
  )
}
