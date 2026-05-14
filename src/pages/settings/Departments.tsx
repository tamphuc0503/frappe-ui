import { useState, useEffect, useRef, useCallback } from 'react'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Plus, X, Loader2, Building2, ChevronRight, ChevronDown, List, GitBranch, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getDepartmentList, createDepartment } from '../../services/hrm'
import { buildDepartmentTree, type Department, type DepartmentTreeNode } from '../../transformers/department'

interface AddDepartmentDialogProps {
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}

function AddDepartmentDialog({ departments, onClose, onSaved }: AddDepartmentDialogProps) {
  const [name, setName] = useState('')
  const [parentDept, setParentDept] = useState('')
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
      await createDepartment(name.trim(), parentDept || undefined)
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

              <div>
                <label htmlFor="parent-dept" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Parent Department
                </label>
                <select
                  id="parent-dept"
                  value={parentDept}
                  onChange={(e) => setParentDept(e.target.value)}
                  className="form-input"
                >
                  <option value="">— None (root) —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
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
  const [departments, setDepartments] = useState<Department[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await getDepartmentList()
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

  const tree = buildDepartmentTree(departments)

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} ${departments.length === 1 ? 'department' : 'departments'}`}
        action={
          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              type="button"
              onClick={() => { setRefreshing(true); refresh().finally(() => setRefreshing(false)) }}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
              aria-label="Refresh departments"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowDialog(true)}
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {viewMode === 'tree' ? (
        <div className="card p-5">
          {tree.length === 0 ? (
            <p className="text-center py-12 text-gray-400">No departments yet.</p>
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <TreeNode key={node.id} node={node} level={0} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Department Name</th>
                  <th className="table-th">Parent Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{d.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-gray-500 text-sm">
                      {d.parentDepartment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {departments.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No departments yet.</p>
            </div>
          )}
        </div>
      )}

      {showDialog && (
        <AddDepartmentDialog
          departments={departments}
          onClose={() => setShowDialog(false)}
          onSaved={() => { void refresh() }}
        />
      )}
    </div>
  )
}

function TreeNode({ node, level }: { node: DepartmentTreeNode; level: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            )
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          )}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          level === 0 ? 'bg-blue-100 text-blue-600' : level === 1 ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-100 text-gray-500'
        }`}>
          <Building2 className="w-4 h-4" />
        </div>
        <span className={`text-sm ${level === 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
          {node.name}
        </span>
        {hasChildren && (
          <span className="text-xs text-gray-400 ml-1">({node.children.length})</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 border-l border-gray-200"
            style={{ left: `${level * 24 + 22}px` }}
          />
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
