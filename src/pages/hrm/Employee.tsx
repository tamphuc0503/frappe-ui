import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, Pencil, Filter, X, Loader2, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getEmployees, createEmployee, getDepartments, getDesignations, getGenders, type LookupOption } from '../../services/hrm'
import type { Employee } from '../../types/hrm'
import {
  FormFields,
  EMPTY_FORM,
  validate,
  type FormData,
  type DropdownOptions,
} from './EmployeeForm'

function statusBadge(status: Employee['status']) {
  if (status === 'Active') return <Badge variant="green">Active</Badge>
  if (status === 'On Leave') return <Badge variant="yellow">On Leave</Badge>
  if (status === 'Onboarding') return <Badge variant="blue">Onboarding</Badge>
  return <Badge variant="red">Inactive</Badge>
}

// ─── Add Employee Dialog ───────────────────────────────────────────────────────
interface AddEmployeeDialogProps {
  options: DropdownOptions
  onClose: () => void
  onSave: (emp: Employee) => void
}

function AddEmployeeDialog({ options, onClose, onSave }: AddEmployeeDialogProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)
  const [shakingFields, setShakingFields] = useState<Set<keyof FormData>>(new Set())
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  function stopShake(field: keyof FormData) {
    setShakingFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) {
      setShakingFields(new Set(Object.keys(v) as (keyof FormData)[]))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const newEmployee = await createEmployee({
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
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 backdrop-enter"
        onClick={submitting ? undefined : onClose}
      />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-lg max-h-[90svh] flex flex-col overflow-hidden pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — pinned */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
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

              <FormFields
                form={form}
                errors={errors}
                shakingFields={shakingFields}
                onChange={set}
                onShakeEnd={stopShake}
                options={options}
                firstInputRef={firstInputRef}
              />
            </div>

            {/* Footer — pinned */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex-shrink-0">
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
  const navigate = useNavigate()
  const pageLoading = usePageLoad()
  const [employeeList, setEmployeeList] = useState<Employee[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)

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

  useEffect(() => {
    let alive = true
    getEmployees()
      .then((data) => { if (alive) { setEmployeeList(data); setError(null) } })
      .catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Failed to load employees.') })
      .finally(() => { if (alive) setFetchLoading(false) })
    return () => { alive = false }
  }, [])

  function refreshEmployees() {
    if (refreshing) return
    setRefreshing(true)
    getEmployees()
      .then((data) => { if (mountedRef.current) { setEmployeeList(data); setError(null) } })
      .catch((err) => { if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load employees.') })
      .finally(() => { if (mountedRef.current) setRefreshing(false) })
  }

  function loadDepartments() {
    if (startedDeptRef.current) return
    startedDeptRef.current = true
    setLoadingDepartments(true)
    getDepartments()
      .then((data) => {
        console.info('[Employee] getDepartments resolved:', data, 'type:', Array.isArray(data) ? `string[${data.length}]` : typeof data)
        if (mountedRef.current) setDepartments(data)
      })
      .catch((err) => { console.error('[Employee] getDepartments error:', err); startedDeptRef.current = false })
      .finally(() => { if (mountedRef.current) setLoadingDepartments(false) })
  }

  function loadDesignations() {
    if (startedDesigRef.current) return
    startedDesigRef.current = true
    setLoadingDesignations(true)
    getDesignations()
      .then((data) => {
        console.info('[Employee] getDesignations resolved:', data)
        if (mountedRef.current) setDesignations(data)
      })
      .catch((err) => { console.error('[Employee] getDesignations error:', err); startedDesigRef.current = false })
      .finally(() => { if (mountedRef.current) setLoadingDesignations(false) })
  }

  function loadGenders() {
    if (startedGenderRef.current) return
    startedGenderRef.current = true
    setLoadingGenders(true)
    getGenders()
      .then((data) => {
        console.info('[Employee] getGenders resolved:', data)
        if (mountedRef.current) setGenders(data)
      })
      .catch((err) => { console.error('[Employee] getGenders error:', err); startedGenderRef.current = false })
      .finally(() => { if (mountedRef.current) setLoadingGenders(false) })
  }

  const dropdownOptions: DropdownOptions = {
    departments, designations, genders,
    loadingDepartments, loadingDesignations, loadingGenders,
    onOpenDepartments: loadDepartments,
    onOpenDesignations: loadDesignations,
    onOpenGenders: loadGenders,
  }

  const loading = pageLoading || fetchLoading
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={6} hasToolbar hasAvatar /></>

  const filtered = employeeList.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()) ||
      e.position.toLowerCase().includes(search.toLowerCase())
  )

  function handleAdd(emp: Employee) {
    setEmployeeList((prev) => [...prev, emp])
  }

  function openDetail(id: string) {
    navigate(`/hrm/employees/${encodeURIComponent(id)}`)
  }

  return (
    <div className="h-full flex flex-col min-h-0">
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

      <div className="card flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3 flex-shrink-0">
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
          <button
            type="button"
            onClick={refreshEmployees}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh"
            aria-label="Refresh employees"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Scrollable table area */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
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
                <tr
                  key={emp.id}
                  onClick={() => openDetail(emp.id)}
                  className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
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
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetail(emp.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDetail(emp.id)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {error ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No employees match your search.</p>
            </div>
          ) : null}
        </div>

        {/* Pagination — pinned */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
          <span>Showing {filtered.length} of {employeeList.length} employees</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">Previous</button>
            <button className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600">Next</button>
          </div>
        </div>
      </div>

      {showDialog && (
        <AddEmployeeDialog
          options={dropdownOptions}
          onClose={() => setShowDialog(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  )
}
