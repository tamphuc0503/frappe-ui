import { Fragment, useState } from 'react'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Plus, MoreHorizontal, Calendar, Link2, RefreshCw, X } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader, SkKanbanColumn } from '../../components/ui/Skeleton'
import { getMyTasks, updateTodoStatus } from '../../services/tasks'
import type { Todo, TodoStatus, TodoPriority, TodoKanbanColumn } from '../../types/task'

function MyTasksSkeleton() {
  return (
    <div className="h-full flex flex-col min-h-0">
      <SkPageHeader />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Sk className="h-4 w-20 rounded-md" />
              <Sk className="h-5 w-6 rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[3, 2, 3, 2].map((cards, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <SkKanbanColumn cards={cards} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const COLUMN_DEFS: { key: TodoStatus; label: string; color: string; headerColor: string }[] = [
  {
    key: 'Open',
    label: 'Open',
    color: 'bg-blue-50 border-blue-100',
    headerColor: 'bg-blue-50 border-b-2 border-blue-200',
  },
  {
    key: 'In Progress',
    label: 'In Progress',
    color: 'bg-amber-50 border-amber-100',
    headerColor: 'bg-amber-50 border-b-2 border-amber-300',
  },
  {
    key: 'Closed',
    label: 'Closed',
    color: 'bg-emerald-50 border-emerald-100',
    headerColor: 'bg-emerald-50 border-b-2 border-emerald-300',
  },
  {
    key: 'Cancelled',
    label: 'Cancelled',
    color: 'bg-gray-100 border-gray-200',
    headerColor: 'bg-gray-50 border-b-2 border-gray-200',
  },
]

const PRIORITY_VARIANT: Record<TodoPriority, 'gray' | 'blue' | 'yellow' | 'red'> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'red',
}

const STATUS_BADGE_VARIANT: Record<TodoStatus, 'green' | 'gray' | 'yellow' | 'blue'> = {
  Open: 'blue',
  'In Progress': 'yellow',
  Closed: 'green',
  Cancelled: 'gray',
}

function buildColumns(todos: Todo[]): TodoKanbanColumn[] {
  return COLUMN_DEFS.map((def) => ({
    ...def,
    todos: todos.filter((t) => t.status === def.key),
  }))
}

function formatDate(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export function MyTasks() {
  const pageLoading = usePageLoad()
  const [tasks, setTasks] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TodoStatus | null>(null)
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null)

  async function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await getMyTasks()
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(false) })

  function handleDragStart(e: React.DragEvent, todoId: string) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', todoId)
    setDraggingId(todoId)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDropTarget(null)
  }

  function handleDragOver(e: React.DragEvent, colKey: TodoStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(colKey)
  }

  function handleDragLeave(_e: React.DragEvent, colKey: TodoStatus) {
    // Only clear if leaving the column itself, not a child
    if (dropTarget === colKey) setDropTarget(null)
  }

  async function handleDrop(e: React.DragEvent, newStatus: TodoStatus) {
    e.preventDefault()
    setDropTarget(null)
    setDraggingId(null)
    const todoId = e.dataTransfer.getData('text/plain')
    if (!todoId) return
    const todo = tasks.find((t) => t.id === todoId)
    if (!todo || todo.status === newStatus) return
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === todoId ? { ...t, status: newStatus } : t)))
    try {
      await updateTodoStatus(todoId, newStatus)
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === todoId ? { ...t, status: todo.status } : t)))
      setError('Failed to update task status.')
    }
  }

  if (pageLoading || loading) return <MyTasksSkeleton />

  const columns = buildColumns(tasks)

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="My Tasks"
        subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'} assigned to you`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
              aria-label="Refresh tasks"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto min-h-0">
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
                  {col.todos.length}
                </span>
              </div>
              {i < columns.length - 1 && (
                <div className="w-12 h-0.5 bg-gray-200 flex-shrink-0" />
              )}
            </Fragment>
          ))}

        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => (
            <div
              key={col.key}
              className={`rounded-xl border ${col.color} overflow-hidden transition-all ${dropTarget === col.key ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => void handleDrop(e, col.key)}
            >
              <div className={`px-4 py-3 ${col.headerColor}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">{col.label}</span>
                  <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {col.todos.length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 min-h-[200px]">
                {col.todos.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-grab ${draggingId === t.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="font-semibold text-gray-900 text-sm leading-snug pr-2 text-left hover:text-blue-600 transition-colors"
                      >
                        {stripHtml(t.description) || t.id}
                      </button>
                      <button className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {t.referenceType && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <Link2 className="w-3.5 h-3.5" />
                        <span className="truncate">{t.referenceType}{t.referenceName ? `: ${t.referenceName}` : ''}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                      {t.assignedBy && (
                        <Badge variant="gray">by {t.assignedBy}</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2.5 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{t.date ? formatDate(t.date) : 'No date'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {col.todos.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No tasks</p>
                )}
              </div>

              <div className="px-3 pb-3">
                {col.key === 'Open' && (
                <button className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 w-full h-full m-0 max-w-none max-h-none border-none bg-transparent p-0"
          onClick={() => setSelectedTask(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedTask(null) }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                <div className="mt-1">
                  <Badge variant={STATUS_BADGE_VARIANT[selectedTask.status]}>
                    {selectedTask.status}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</span>
                <div className="mt-1">
                  <Badge variant={PRIORITY_VARIANT[selectedTask.priority]}>{selectedTask.priority}</Badge>
                </div>
              </div>

              {selectedTask.date && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</span>
                  <p className="mt-1 text-sm text-gray-700">{formatDate(selectedTask.date)}</p>
                </div>
              )}

              {selectedTask.assignedBy && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned By</span>
                  <p className="mt-1 text-sm text-gray-700">{selectedTask.assignedBy}</p>
                </div>
              )}

              {selectedTask.referenceType && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reference</span>
                  <p className="mt-1 text-sm text-gray-700">
                    {selectedTask.referenceType}{selectedTask.referenceName ? `: ${selectedTask.referenceName}` : ''}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
                <div
                  className="mt-1 text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedTask.description || '<span class="text-gray-400">No description</span>' }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  )
}
