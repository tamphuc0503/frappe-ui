import { Fragment, useEffect, useState } from 'react'
import { Plus, MoreHorizontal, Calendar, FolderKanban, AlertTriangle, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader, SkKanbanColumn } from '../../components/ui/Skeleton'
import { getMyTasks } from '../../services/tasks'
import type { Task, TaskKanbanColumn, TaskPriority, TaskStatus } from '../../types/task'

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

const COLUMN_DEFS: { key: TaskStatus; label: string; color: string; headerColor: string }[] = [
  {
    key: 'Open',
    label: 'Open',
    color: 'bg-gray-100 border-gray-200',
    headerColor: 'bg-gray-50 border-b-2 border-gray-200',
  },
  {
    key: 'Working',
    label: 'Working',
    color: 'bg-blue-50 border-blue-100',
    headerColor: 'bg-blue-50 border-b-2 border-blue-200',
  },
  {
    key: 'Pending Review',
    label: 'Pending Review',
    color: 'bg-amber-50 border-amber-100',
    headerColor: 'bg-amber-50 border-b-2 border-amber-300',
  },
  {
    key: 'Completed',
    label: 'Completed',
    color: 'bg-emerald-50 border-emerald-100',
    headerColor: 'bg-emerald-50 border-b-2 border-emerald-300',
  },
]

const PRIORITY_VARIANT: Record<TaskPriority, 'gray' | 'blue' | 'yellow' | 'red'> = {
  Low: 'gray',
  Medium: 'blue',
  High: 'yellow',
  Urgent: 'red',
}

function buildColumns(tasks: Task[]): TaskKanbanColumn[] {
  return COLUMN_DEFS.map((def) => ({
    ...def,
    tasks: tasks.filter((t) => t.status === def.key),
  }))
}

function formatDate(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MyTasks() {
  const pageLoading = usePageLoad()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    void load(false)
  }, [])

  if (pageLoading || loading) return <MyTasksSkeleton />

  const columns = buildColumns(tasks)
  const overdueCount = tasks.filter((t) => t.status === 'Overdue').length

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
                  {col.tasks.length}
                </span>
              </div>
              {i < columns.length - 1 && (
                <div className="w-12 h-0.5 bg-gray-200 flex-shrink-0" />
              )}
            </Fragment>
          ))}
          {overdueCount > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-600">{overdueCount} overdue</span>
            </div>
          )}
        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => (
            <div key={col.key} className={`rounded-xl border ${col.color} overflow-hidden`}>
              <div className={`px-4 py-3 ${col.headerColor}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">{col.label}</span>
                  <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                    {col.tasks.length}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-3 min-h-[200px]">
                {col.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-grab"
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <p className="font-semibold text-gray-900 text-sm leading-snug pr-2">
                        {t.subject}
                      </p>
                      <button className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {t.project && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span className="truncate">{t.project}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <Badge variant={PRIORITY_VARIANT[t.priority]}>{t.priority}</Badge>
                      {t.progress > 0 && t.progress < 100 && (
                        <Badge variant="blue">{t.progress}%</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2.5 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{t.endDate ? formatDate(t.endDate) : 'No due date'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {col.tasks.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No tasks</p>
                )}
              </div>

              <div className="px-3 pb-3">
                <button className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
