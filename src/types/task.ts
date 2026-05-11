export type TaskStatus = 'Open' | 'Working' | 'Pending Review' | 'Overdue' | 'Completed' | 'Cancelled'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent'

export interface Task {
  id: string
  subject: string
  status: TaskStatus
  priority: TaskPriority
  description: string
  project: string
  startDate: string
  endDate: string
  progress: number
  assignees: string[]
}

export interface TaskKanbanColumn {
  key: TaskStatus
  label: string
  color: string
  headerColor: string
  tasks: Task[]
}
