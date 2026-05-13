export type TodoStatus = 'Open' | 'In Progress' | 'Closed' | 'Cancelled'
export type TodoPriority = 'Low' | 'Medium' | 'High'

export interface Todo {
  id: string
  description: string
  status: TodoStatus
  priority: TodoPriority
  date: string
  referenceType: string
  referenceName: string
  assignedBy: string
  allocatedTo: string
  color: string
}

export interface TodoKanbanColumn {
  key: TodoStatus
  label: string
  color: string
  headerColor: string
  todos: Todo[]
}

// Legacy aliases
export type TaskStatus = 'Open' | 'Working' | 'Pending Review' | 'Overdue' | 'Completed' | 'Cancelled'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type Task = Todo
export type TaskKanbanColumn = TodoKanbanColumn
