import { http, FRAPPE_BASE } from './http'
import { getUserCache } from './auth'
import type { Todo } from '../types/task'
import { todoCodec, type FrappeTodo } from '../transformers/task'

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

export async function getMyTasks(): Promise<Todo[]> {
  const user = getUserCache()
  if (!user) {
    throw new Error('Not authenticated. Please log out and back in.')
  }
  const params = new URLSearchParams({
    doctype: 'ToDo',
    fields: JSON.stringify([
      'name',
      'description',
      'status',
      'priority',
      'date',
      'reference_type',
      'reference_name',
      'assigned_by',
      'allocated_to',
      'color',
    ]),
    filters: JSON.stringify([['allocated_to', '=', user.email]]),
    limit_page_length: '0',
    order_by: 'modified desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeTodo>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch tasks.')
  }
  return (data.message ?? []).map(todoCodec.decode)
}

export async function updateTodoStatus(id: string, status: string): Promise<void> {
  const res = await http(`${FRAPPE_BASE}/api/resource/ToDo/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { exc?: string }).exc ?? 'Failed to update status.')
  }
}
