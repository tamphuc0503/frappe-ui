import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, useBlocker } from 'react-router-dom'
import { ArrowLeft, ChevronDown, FileText, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import { Combobox } from '../../components/ui/Combobox'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { getEmployee, updateEmployee, getDepartments, getDesignations, getGenders, type LookupOption } from '../../services/hrm'
import type { Employee } from '../../types/hrm'
import {
  FormFields,
  fromEmployee,
  validate,
  type FormData,
  type DropdownOptions,
} from './EmployeeForm'

// ─── Tabs ──────────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'details' | 'contacts' | 'certificates' | 'salary'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'contacts', label: 'Contacts & Dependants' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'salary', label: 'Salary' },
]

// ─── Tab-specific state types ──────────────────────────────────────────────────
interface JoiningDetails {
  jobApplicant: string
  offerDate: string
  confirmationDate: string
  contractEndDate: string
  noticeDays: string
  healthInsurance: string
}

const EMPTY_JOINING: JoiningDetails = {
  jobApplicant: '',
  offerDate: '',
  confirmationDate: '',
  contractEndDate: '',
  noticeDays: '',
  healthInsurance: '',
}

interface ContactsState {
  currentAddress: string
  permanentAddress: string
  emergencyContactName: string
  emergencyPhone: string
  emergencyRelation: string
}

const EMPTY_CONTACTS: ContactsState = {
  currentAddress: '',
  permanentAddress: '',
  emergencyContactName: '',
  emergencyPhone: '',
  emergencyRelation: '',
}

interface Dependant {
  id: string
  fullName: string
  ssn: string
  frontId: File | null
  backId: File | null
  dateOfBirth: string
  relation: string
}

interface Certificate {
  id: string
  trainingCenter: string
  qualification: string
  graduatedDate: string
  expiryDate: string
  file: File | null
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11)
}

function newDependant(): Dependant {
  return { id: uid(), fullName: '', ssn: '', frontId: null, backId: null, dateOfBirth: '', relation: '' }
}

function newCertificate(): Certificate {
  return { id: uid(), trainingCenter: '', qualification: '', graduatedDate: '', expiryDate: '', file: null }
}

// ─── Collapsible section ───────────────────────────────────────────────────────
interface CollapsibleProps {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Collapsible({ title, open, onToggle, children }: CollapsibleProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors"
      >
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ─── File-upload cell (used by certificates + dependants) ──────────────────────
interface FileCellProps {
  file: File | null
  onChange: (f: File | null) => void
  label?: string
}

function FileCell({ file, onChange, label = 'Upload' }: FileCellProps) {
  if (file) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-xs text-gray-700 truncate max-w-[120px]">{file.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-400 hover:text-red-500 flex-shrink-0"
          aria-label="Remove file"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }
  return (
    <label className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded cursor-pointer">
      <Upload className="w-3.5 h-3.5" />
      {label}
      <input
        type="file"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
function tabFromHash(hash: string): TabId | null {
  const id = hash.replace(/^#/, '')
  return TABS.some((t) => t.id === id) ? (id as TabId) : null
}

export function EmployeeDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const pageLoading = usePageLoad()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [tab, setTab] = useState<TabId>(() => tabFromHash(location.hash) ?? 'overview')
  const [tabDirection, setTabDirection] = useState<'right' | 'left'>('right')

  // Sync tab from URL hash on browser navigation (back/forward, deep-link, manual edit).
  useEffect(() => {
    const next = tabFromHash(location.hash) ?? 'overview'
    setTab((prev) => {
      if (prev === next) return prev
      const nextIdx = TABS.findIndex((t) => t.id === next)
      const currIdx = TABS.findIndex((t) => t.id === prev)
      setTabDirection(nextIdx >= currIdx ? 'right' : 'left')
      return next
    })
  }, [location.hash])

  const [form, setForm] = useState<FormData | null>(null)
  const [pristine, setPristine] = useState<FormData | null>(null)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)
  const [shakingFields, setShakingFields] = useState<Set<keyof FormData>>(new Set())

  // Tab-specific state — in-memory only
  const [joining, setJoining] = useState<JoiningDetails>(EMPTY_JOINING)
  const [contacts, setContacts] = useState<ContactsState>(EMPTY_CONTACTS)
  const [addressOpen, setAddressOpen] = useState(true)
  const [dependantsOpen, setDependantsOpen] = useState(true)
  const [dependants, setDependants] = useState<Dependant[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set())

  // Dropdown options — fetched on first open, not on mount.
  const [departments, setDepartments] = useState<LookupOption[]>([])
  const [designations, setDesignations] = useState<LookupOption[]>([])
  const [genders, setGenders] = useState<LookupOption[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)
  const [loadingDesignations, setLoadingDesignations] = useState(false)
  const [loadingGenders, setLoadingGenders] = useState(false)
  const startedDeptRef = useRef(false)
  const startedDesigRef = useRef(false)
  const startedGenderRef = useRef(false)
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // Fetch employee record only.
  useEffect(() => {
    if (!id) return
    let alive = true
    setFetchLoading(true)
    getEmployee(id)
      .then((emp) => {
        if (!alive) return
        setEmployee(emp)
        const snapshot = fromEmployee(emp)
        setForm(snapshot)
        setPristine(snapshot)
        setFetchError(null)
      })
      .catch((err) => {
        if (alive) setFetchError(err instanceof Error ? err.message : 'Failed to load employee.')
      })
      .finally(() => { if (alive) setFetchLoading(false) })
    return () => { alive = false }
  }, [id])

  function loadDepartments() {
    if (startedDeptRef.current) return
    startedDeptRef.current = true
    setLoadingDepartments(true)
    getDepartments()
      .then((data) => { if (mountedRef.current) setDepartments(data) })
      .catch(() => { startedDeptRef.current = false })
      .finally(() => { if (mountedRef.current) setLoadingDepartments(false) })
  }

  function loadDesignations() {
    if (startedDesigRef.current) return
    startedDesigRef.current = true
    setLoadingDesignations(true)
    getDesignations()
      .then((data) => { if (mountedRef.current) setDesignations(data) })
      .catch(() => { startedDesigRef.current = false })
      .finally(() => { if (mountedRef.current) setLoadingDesignations(false) })
  }

  function loadGenders() {
    if (startedGenderRef.current) return
    startedGenderRef.current = true
    setLoadingGenders(true)
    getGenders()
      .then((data) => { if (mountedRef.current) setGenders(data) })
      .catch(() => { startedGenderRef.current = false })
      .finally(() => { if (mountedRef.current) setLoadingGenders(false) })
  }

  function changeTab(next: TabId) {
    if (next === tab) return
    navigate({ hash: `#${next}` }, { replace: true })
  }

  function set(field: keyof FormData, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function stopShake(field: keyof FormData) {
    setShakingFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  function setJoiningField<K extends keyof JoiningDetails>(field: K, value: JoiningDetails[K]) {
    setJoining((prev) => ({ ...prev, [field]: value }))
  }

  function setContactField<K extends keyof ContactsState>(field: K, value: ContactsState[K]) {
    setContacts((prev) => ({ ...prev, [field]: value }))
  }

  function updateDependant<K extends keyof Dependant>(depId: string, field: K, value: Dependant[K]) {
    setDependants((prev) => prev.map((d) => (d.id === depId ? { ...d, [field]: value } : d)))
  }
  function removeDependant(depId: string) {
    setDependants((prev) => prev.filter((d) => d.id !== depId))
  }

  function updateCertificate<K extends keyof Certificate>(certId: string, field: K, value: Certificate[K]) {
    setCertificates((prev) => prev.map((c) => (c.id === certId ? { ...c, [field]: value } : c)))
  }
  function toggleCertSelected(certId: string, checked: boolean) {
    setSelectedCerts((prev) => {
      const n = new Set(prev)
      if (checked) n.add(certId)
      else n.delete(certId)
      return n
    })
  }
  function toggleAllCertsSelected(checked: boolean) {
    setSelectedCerts(checked ? new Set(certificates.map((c) => c.id)) : new Set())
  }
  function deleteSelectedCertificates() {
    setCertificates((prev) => prev.filter((c) => !selectedCerts.has(c.id)))
    setSelectedCerts(new Set())
  }

  async function saveForm(): Promise<'ok' | 'invalid' | 'failed'> {
    if (!form || !employee) return 'failed'
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) {
      setShakingFields(new Set(Object.keys(v) as (keyof FormData)[]))
      changeTab('overview')
      return 'invalid'
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const updated = await updateEmployee(employee.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department,
        position: form.position.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        status: form.status,
        joinDate: form.joinDate,
      })
      setEmployee(updated)
      const snapshot = fromEmployee(updated)
      setForm(snapshot)
      setPristine(snapshot)
      return 'ok'
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update employee.')
      setErrorShaking(true)
      return 'failed'
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveForm()
  }

  function goBack() {
    navigate('/hrm/employees')
  }

  // Dirty = current form differs from the loaded snapshot. JSON.stringify is enough — FormData is all primitives.
  const dirty =
    !!form && !!pristine && JSON.stringify(form) !== JSON.stringify(pristine)

  // Block in-app navigation while there are unsaved changes (only when leaving this page).
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  // Native beforeunload for browser close / refresh / external link.
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  async function handleSaveAndLeave() {
    const result = await saveForm()
    if (result === 'ok') {
      blocker.proceed?.()
    } else if (result === 'invalid') {
      // Validation switched to the overview tab — close the dialog so the user can fix the errors.
      blocker.reset?.()
    }
    // 'failed' — keep the dialog open with the error visible.
  }

  const dropdownOptions: DropdownOptions = {
    departments, designations, genders,
    loadingDepartments, loadingDesignations, loadingGenders,
    onOpenDepartments: loadDepartments,
    onOpenDesignations: loadDesignations,
    onOpenGenders: loadGenders,
  }

  const loading = pageLoading || fetchLoading

  if (loading) {
    return (
      <>
        <SkPageHeader hasAction={false} />
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <Sk className="w-9 h-9 rounded-lg" />
            <Sk className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Sk className="h-4 w-40 rounded" />
              <Sk className="h-3 w-56 rounded" />
            </div>
          </div>
          <div className="px-6 py-3 border-b border-gray-100 flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Sk key={i} className="h-5 w-20 rounded" />
            ))}
          </div>
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </>
    )
  }

  if (fetchError || !employee || !form) {
    return (
      <div className="card p-12 text-center text-red-500">
        <p>{fetchError ?? 'Employee not found.'}</p>
        <button onClick={goBack} className="btn-secondary mt-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </button>
      </div>
    )
  }

  const showFooter = tab === 'overview' || tab === 'details' || tab === 'contacts'

  return (
    <>
    <div className="card flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header — pinned */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={goBack}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Back to employee list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={`w-10 h-10 rounded-full ${employee.avatarBg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {employee.avatarInitials}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate flex items-center">
              <span className="truncate">{employee.name}</span>
              {dirty && (
                <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
                  Not saved
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 truncate">{employee.email}</p>
          </div>
        </div>
      </div>

      {/* Tab strip — pinned */}
      <div className="border-b border-gray-100 px-6 flex gap-1 overflow-x-auto scrollbar-hide flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => changeTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Body — scrolls */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${submitError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div
              className={`p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
              onAnimationEnd={() => setErrorShaking(false)}
            >
              <span className="text-red-600 text-sm">{submitError}</span>
            </div>
          </div>

          <div
            key={tab}
            className={tabDirection === 'right' ? 'tab-enter-right' : 'tab-enter-left'}
          >
            {/* Overview */}
            {tab === 'overview' && (
              <FormFields
                form={form}
                errors={errors}
                shakingFields={shakingFields}
                onChange={set}
                onShakeEnd={stopShake}
                options={dropdownOptions}
                emailReadOnly
              />
            )}

            {/* Details */}
            {tab === 'details' && (
              <div className="space-y-5">
                <section>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Joining Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Applicant</label>
                      <Combobox
                        options={[]}
                        value={joining.jobApplicant ? [joining.jobApplicant] : []}
                        onChange={(vs) => setJoiningField('jobApplicant', vs[0] ?? '')}
                        max={1}
                        placeholder="Link a job applicant"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Offer Date</label>
                      <input
                        type="date"
                        value={joining.offerDate}
                        onChange={(e) => setJoiningField('offerDate', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmation Date</label>
                      <input
                        type="date"
                        value={joining.confirmationDate}
                        onChange={(e) => setJoiningField('confirmationDate', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contract End Date</label>
                      <input
                        type="date"
                        value={joining.contractEndDate}
                        onChange={(e) => setJoiningField('contractEndDate', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Notice (days) on Resignation</label>
                      <input
                        type="number"
                        min={0}
                        value={joining.noticeDays}
                        onChange={(e) => setJoiningField('noticeDays', e.target.value)}
                        className="form-input"
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 text-sm mb-3">Health Insurance</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Health Insurance Provider</label>
                    <Combobox
                      options={[]}
                      value={joining.healthInsurance ? [joining.healthInsurance] : []}
                      onChange={(vs) => setJoiningField('healthInsurance', vs[0] ?? '')}
                      max={1}
                      placeholder="Select a provider"
                    />
                  </div>
                </section>
              </div>
            )}

            {/* Contacts & Dependants */}
            {tab === 'contacts' && (
              <div className="space-y-4">
                <Collapsible title="Address" open={addressOpen} onToggle={() => setAddressOpen((o) => !o)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Address</label>
                      <textarea
                        rows={3}
                        value={contacts.currentAddress}
                        onChange={(e) => setContactField('currentAddress', e.target.value)}
                        className="form-input"
                        placeholder="Street, city, postal code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Permanent Address</label>
                      <textarea
                        rows={3}
                        value={contacts.permanentAddress}
                        onChange={(e) => setContactField('permanentAddress', e.target.value)}
                        className="form-input"
                        placeholder="Street, city, postal code"
                      />
                    </div>
                  </div>
                </Collapsible>

                <section className="border border-gray-200 rounded-lg bg-white">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">Emergency Contact</h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name</label>
                      <input
                        type="text"
                        value={contacts.emergencyContactName}
                        onChange={(e) => setContactField('emergencyContactName', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Emergency Phone 1</label>
                      <input
                        type="tel"
                        value={contacts.emergencyPhone}
                        onChange={(e) => setContactField('emergencyPhone', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Relation</label>
                      <input
                        type="text"
                        value={contacts.emergencyRelation}
                        onChange={(e) => setContactField('emergencyRelation', e.target.value)}
                        className="form-input"
                        placeholder="e.g. Spouse, Parent"
                      />
                    </div>
                  </div>
                </section>

                <Collapsible
                  title={`Dependants${dependants.length > 0 ? ` (${dependants.length})` : ''}`}
                  open={dependantsOpen}
                  onToggle={() => setDependantsOpen((o) => !o)}
                >
                  <div className="space-y-3">
                    {dependants.length === 0 && (
                      <p className="text-sm text-gray-400">No dependants added.</p>
                    )}
                    {dependants.map((d, idx) => (
                      <div key={d.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Dependant #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDependant(d.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Remove dependant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                            <input
                              type="text"
                              value={d.fullName}
                              onChange={(e) => updateDependant(d.id, 'fullName', e.target.value)}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">SSN / ID</label>
                            <input
                              type="text"
                              value={d.ssn}
                              onChange={(e) => updateDependant(d.id, 'ssn', e.target.value)}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                            <input
                              type="date"
                              value={d.dateOfBirth}
                              onChange={(e) => updateDependant(d.id, 'dateOfBirth', e.target.value)}
                              className="form-input"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Relation</label>
                            <input
                              type="text"
                              value={d.relation}
                              onChange={(e) => updateDependant(d.id, 'relation', e.target.value)}
                              className="form-input"
                              placeholder="e.g. Child, Spouse"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Front of ID</label>
                            <FileCell
                              file={d.frontId}
                              onChange={(f) => updateDependant(d.id, 'frontId', f)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Back of ID</label>
                            <FileCell
                              file={d.backId}
                              onChange={(f) => updateDependant(d.id, 'backId', f)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDependants((prev) => [...prev, newDependant()])}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Dependant
                    </button>
                  </div>
                </Collapsible>
              </div>
            )}

            {/* Certificates */}
            {tab === 'certificates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {certificates.length > 0 ? (
                    <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCerts.size === certificates.length}
                        onChange={(e) => toggleAllCertsSelected(e.target.checked)}
                      />
                      Select all
                    </label>
                  ) : <span />}
                  <div className="flex items-center gap-2">
                    {selectedCerts.size > 0 && (
                      <button
                        type="button"
                        onClick={deleteSelectedCertificates}
                        className="btn-danger flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedCerts.size})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCertificates((prev) => [...prev, newCertificate()])}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Certificate
                    </button>
                  </div>
                </div>

                {certificates.length === 0 && (
                  <p className="text-sm text-gray-400">No certificates added.</p>
                )}
                {certificates.map((c, idx) => (
                  <div key={c.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCerts.has(c.id)}
                          onChange={(e) => toggleCertSelected(c.id, e.target.checked)}
                          aria-label="Select certificate"
                        />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Certificate #{idx + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCertificates((prev) => prev.filter((x) => x.id !== c.id))
                          setSelectedCerts((prev) => {
                            const n = new Set(prev); n.delete(c.id); return n
                          })
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove certificate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Training Center</label>
                        <input
                          type="text"
                          value={c.trainingCenter}
                          onChange={(e) => updateCertificate(c.id, 'trainingCenter', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Qualification</label>
                        <input
                          type="text"
                          value={c.qualification}
                          onChange={(e) => updateCertificate(c.id, 'qualification', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Graduated Date</label>
                        <input
                          type="date"
                          value={c.graduatedDate}
                          onChange={(e) => updateCertificate(c.id, 'graduatedDate', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={c.expiryDate}
                          onChange={(e) => updateCertificate(c.id, 'expiryDate', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Upload</label>
                        <FileCell
                          file={c.file}
                          onChange={(f) => updateCertificate(c.id, 'file', f)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Salary */}
            {tab === 'salary' && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <p>Salary information is not configured for this employee.</p>
              </div>
            )}
          </div>
        </div>

        {showFooter && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary min-w-[140px]">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>

    {blocker.state === 'blocked' && (
      <UnsavedChangesDialog
        submitting={submitting}
        error={submitError}
        onStay={() => blocker.reset?.()}
        onDiscard={() => blocker.proceed?.()}
        onSaveAndLeave={handleSaveAndLeave}
      />
    )}
    </>
  )
}

interface UnsavedChangesDialogProps {
  submitting: boolean
  error: string | null
  onStay: () => void
  onDiscard: () => void
  onSaveAndLeave: () => void
}

function UnsavedChangesDialog({
  submitting,
  error,
  onStay,
  onDiscard,
  onSaveAndLeave,
}: UnsavedChangesDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onStay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submitting, onStay])

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={submitting ? undefined : onStay}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Unsaved changes</h2>
            <p className="text-sm text-gray-500 mt-1">
              You have unsaved changes on this employee. What would you like to do?
            </p>
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              error ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4 bg-gray-50/50 rounded-b-2xl">
            <button
              type="button"
              onClick={onDiscard}
              disabled={submitting}
              className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={onStay}
              disabled={submitting}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stay on page
            </button>
            <button
              type="button"
              onClick={onSaveAndLeave}
              disabled={submitting}
              className="btn-primary min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & leave
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
