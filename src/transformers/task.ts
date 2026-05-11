import type { Task, TaskStatus, TaskPriority } from '../types/task'
import type { Codec } from './codec'

export interface FrappeTask {
  name: string
  subject?: string
  status?: string
  priority?: string
  description?: string
  project?: string
  exp_start_date?: string
  exp_end_date?: string
  progress?: number
  _assign?: string
}

const STATUS_VALUES: TaskStatus[] = ['Open', 'Working', 'Pending Review', 'Overdue', 'Completed', 'Cancelled']
const PRIORITY_VALUES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent']

function decodeStatus(s: string | undefined): TaskStatus {
  return (STATUS_VALUES as string[]).includes(s ?? '') ? (s as TaskStatus) : 'Open'
}

function decodePriority(p: string | undefined): TaskPriority {
  return (PRIORITY_VALUES as string[]).includes(p ?? '') ? (p as TaskPriority) : 'Medium'
}

function decodeAssignees(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

export const taskCodec: Codec<Task, FrappeTask> = {
  decode(frappe) {
    return {
      id: frappe.name,
      subject: frappe.subject || frappe.name,
      status: decodeStatus(frappe.status),
      priority: decodePriority(frappe.priority),
      description: frappe.description || '',
      project: frappe.project || '',
      startDate: frappe.exp_start_date || '',
      endDate: frappe.exp_end_date || '',
      progress: typeof frappe.progress === 'number' ? frappe.progress : 0,
      assignees: decodeAssignees(frappe._assign),
    }
  },
  encode(task) {
    return {
      name: task.id,
      subject: task.subject,
      status: task.status,
      priority: task.priority,
      description: task.description || undefined,
      project: task.project || undefined,
      exp_start_date: task.startDate || undefined,
      exp_end_date: task.endDate || undefined,
      progress: task.progress,
      _assign: task.assignees.length ? JSON.stringify(task.assignees) : undefined,
    }
  },
}
