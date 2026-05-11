import { useState, useEffect, useRef, useCallback } from 'react'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Plus, X, Loader2, Building2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getDepartments, createDepartment, type LookupOption } from '../../services/hrm'

interface AddDepartmentDialogProps {
  onClose: () => void
  onSaved: () => void
}

function AddDepartmentDialog({ onClose, onSaved }: AddDepartmentDialogProps) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorShaking, setErrorShaking] = useState(false)
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Department name is required.')
      setErrorShaking(true)
      setShaking(true)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createDepartment(name.trim())
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create department.')
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
          className="bg-white rounded-b-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto dialog-enter"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Department</h2>
              <p className="text-sm text-gray-500 mt-0.5">Create a new department in your organization.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="px-6 py-5 space-y-4">
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div
                  className={`p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                  onAnimationEnd={() => setErrorShaking(false)}
                >
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              </div>
              <div className={shaking ? 'field-shake' : ''} onAnimationEnd={() => setShaking(false)}>
                <label htmlFor="dept-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="dept-name"
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engineering"
                  className="form-input"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary min-w-[160px]">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Department
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

export function Departments() {
  const pageLoading = usePageLoad()
  const [departments, setDepartments] = useState<LookupOption[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await getDepartments()
      setDepartments(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments.')
    }
  }, [])

  useFetchOnce(() => {
    refresh().finally(() => setFetchLoading(false))
  })

  const loading = pageLoading || fetchLoading
  if (loading) return <><SkPageHeader /><SkTable rows={6} cols={1} hasToolbar={false} /></>

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} ${departments.length === 1 ? 'department' : 'departments'}`}
        action={
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Department Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departments.map((d) => (
                <tr key={d.value} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-gray-900">{d.label}</span>
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
        ) : departments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No departments yet.</p>
          </div>
        ) : null}
      </div>

      {showDialog && (
        <AddDepartmentDialog
          onClose={() => setShowDialog(false)}
          onSaved={() => { refresh() }}
        />
      )}
    </div>
  )
}
