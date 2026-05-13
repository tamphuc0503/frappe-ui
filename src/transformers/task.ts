import type { Todo, TodoStatus, TodoPriority } from '../types/task'
import type { Codec } from './codec'

export interface FrappeTodo {
  name: string
  description?: string
  status?: string
  priority?: string
  date?: string
  reference_type?: string
  reference_name?: string
  assigned_by?: string
  allocated_to?: string
  color?: string
}

const STATUS_VALUES: TodoStatus[] = ['Open', 'Closed', 'Cancelled']
const PRIORITY_VALUES: TodoPriority[] = ['Low', 'Medium', 'High']

function decodeStatus(s: string | undefined): TodoStatus {
  return (STATUS_VALUES as string[]).includes(s ?? '') ? (s as TodoStatus) : 'Open'
}

function decodePriority(p: string | undefined): TodoPriority {
  return (PRIORITY_VALUES as string[]).includes(p ?? '') ? (p as TodoPriority) : 'Medium'
}

export const todoCodec: Codec<Todo, FrappeTodo> = {
  decode(frappe) {
    return {
      id: frappe.name,
      description: frappe.description || '',
      status: decodeStatus(frappe.status),
      priority: decodePriority(frappe.priority),
      date: frappe.date || '',
      referenceType: frappe.reference_type || '',
      referenceName: frappe.reference_name || '',
      assignedBy: frappe.assigned_by || '',
      allocatedTo: frappe.allocated_to || '',
      color: frappe.color || '',
    }
  },
  encode(todo) {
    return {
      name: todo.id,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
      date: todo.date,
      reference_type: todo.referenceType,
      reference_name: todo.referenceName,
      assigned_by: todo.assignedBy,
      allocated_to: todo.allocatedTo,
      color: todo.color,
    }
  },
}

// Legacy export
export const taskCodec = todoCodec
export type FrappeTask = FrappeTodo
