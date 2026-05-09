import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Eye, Pencil, Filter, X, Loader2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getEmployees, createEmployee, getDepartments } from '../../services/hrm'
import type { Employee, EmployeeStatus } from '../../types/hrm'

function statusBadge(status: Employee['status']) {
  if (status === 'Active') return <Badge variant="green">Active</Badge>
  if (status === 'On Leave') return <Badge variant="yellow">On Leave</Badge>
  if (status === 'Onboarding') return <Badge variant="blue">Onboarding</Badge>
  return <Badge variant="red">Inactive</Badge>
}

// ─── Form state ────────────────────────────────────────────────────────────────
interface FormData {
  name: string
  email: string
  phone: string
  department: string
  position: string
  status: EmployeeStatus
  joinDate: string
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  status: 'Onboarding',
  joinDate: new Date().toISOString().slice(0, 10),
}

// ─── Add Employee Dialog ───────────────────────────────────────────────────────
interface AddEmployeeDialogProps {
  onClose: () => void
  onSave: (emp: Employee) => void
}

function AddEmployeeDialog({ onClose, onSave }: AddEmployeeDialogProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)
  const [shakingFields, setShakingFields] = useState<Set<keyof FormData>>(new Set())
  const [departments, setDepartments] = useState<string[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Focus first field on open
  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  // Load departments from Frappe
  useEffect(() => {
    let alive = true
    getDepartments()
      .then((data) => { if (alive) setDepartments(data) })
      .catch(() => { /* dropdown stays empty; submit will fail with a clear error */ })
      .finally(() => { if (alive) setLoadingDepartments(false) })
    return () => { alive = false }
  }, [])

  // Close on Escape (but not while submitting)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function stopShake(field: keyof FormData) {
    setShakingFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  function shakeClass(field: keyof FormData) {
    return shakingFields.has(field) ? 'field-shake' : ''
  }

  function validate(): boolean {
    const e: Partial<FormData> = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.department) e.department = 'Please select a department.'
    if (!form.position.trim()) e.position = 'Position is required.'
    if (!form.joinDate) e.joinDate = 'Join date is required.'
    setErrors(e)
    if (Object.keys(e).length > 0) {
      setShakingFields(new Set(Object.keys(e) as (keyof FormData)[]))
    }
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const newEmployee = await createEmployee({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department,
        position: form.position.trim(),
        status: form.status,
        joinDate: form.joinDate,
      })
      onSave(newEmployee)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add employee.')
      setErrorShaking(true)
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

      {/* Dialog */}
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Employee</h2>
              <p className="text-sm text-gray-500 mt-0.5">Fill in the details to create an employee record.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 space-y-5">
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${submitError ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div
                  className={`p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                  onAnimationEnd={() => setErrorShaking(false)}
                >
                  <span className="text-red-600 text-sm">{submitError}</span>
                </div>
              </div>

              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={shakeClass('name')} onAnimationEnd={() => stopShake('name')}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className={`form-input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className={shakeClass('email')} onAnimationEnd={() => stopShake('email')}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="jane@oceanfleet.com"
                    className={`form-input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="form-input"
                />
              </div>

              {/* Department + Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={shakeClass('department')} onAnimationEnd={() => stopShake('department')}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) => set('department', e.target.value)}
                    disabled={loadingDepartments}
                    className={`form-input bg-white ${errors.department ? 'border-red-400 focus:ring-red-400' : ''}`}
                  >
                    <option value="">{loadingDepartments ? 'Loading…' : 'Select department'}</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
                </div>
                <div className={shakeClass('position')} onAnimationEnd={() => stopShake('position')}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => set('position', e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className={`form-input ${errors.position ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                  {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
                </div>
              </div>

              {/* Status + Join Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as EmployeeStatus)}
                    className="form-input bg-white"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                <div className={shakeClass('joinDate')} onAnimationEnd={() => stopShake('joinDate')}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Join Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.joinDate}
                    onChange={(e) => set('joinDate', e.target.value)}
                    className={`form-input ${errors.joinDate ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                  {errors.joinDate && <p className="text-xs text-red-500 mt-1">{errors.joinDate}</p>}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary min-w-[140px]">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Employee
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

// ─── Main page ─────────────────────────────────────────────────────────────────
export function Employee() {
  const pageLoading = usePageLoad()
  const [employeeList, setEmployeeList] = useState<Employee[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    let alive = true
    getEmployees()
      .then((data) => { if (alive) { setEmployeeList(data); setError(null) } })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Failed to load employees.') })
      .finally(() => { if (alive) setFetchLoading(false) })
    return () => { alive = false }
  }, [])

  const loading = pageLoading || fetchLoading
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={6} hasToolbar hasAvatar /></>

  const filtered = employeeList.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase())
  )

  function handleSave(emp: Employee) {
    setEmployeeList((prev) => [...prev, emp])
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employeeList.length} total employees`}
        action={
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        }
      />

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Employee</th>
                <th className="table-th">Department</th>
                <th className="table-th">Position</th>
                <th className="table-th">Status</th>
                <th className="table-th">Join Date</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${emp.avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {emp.avatarInitials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">{emp.department}</td>
                  <td className="table-td">{emp.position}</td>
                  <td className="table-td">{statusBadge(emp.status)}</td>
                  <td className="table-td text-gray-500">{emp.joinDate}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error ? (
          <div className="text-center py-12 text-red-500">
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No employees match your search.</p>
          </div>
        ) : null}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {filtered.length} of {employeeList.length} employees</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">Previous</button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">Next</button>
          </div>
        </div>
      </div>

      {showDialog && (
        <AddEmployeeDialog
          onClose={() => setShowDialog(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
