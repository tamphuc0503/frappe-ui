import { http, FRAPPE_BASE } from './http'
import { getUserCache } from './auth'
import type { Task } from '../types/task'
import { taskCodec, type FrappeTask } from '../transformers/task'

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

export async function getMyTasks(): Promise<Task[]> {
  const user = getUserCache()
  if (!user) {
    throw new Error('Not authenticated. Please log out and back in.')
  }
  const params = new URLSearchParams({
    doctype: 'Task',
    fields: JSON.stringify([
      'name',
      'subject',
      'status',
      'priority',
      'description',
      'project',
      'exp_start_date',
      'exp_end_date',
      'progress',
      '_assign',
    ]),
    filters: JSON.stringify([['_assign', 'like', `%${user.email}%`]]),
    limit_page_length: '0',
    order_by: 'modified desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeTask>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch tasks.')
  }
  return (data.message ?? []).map(taskCodec.decode)
}
