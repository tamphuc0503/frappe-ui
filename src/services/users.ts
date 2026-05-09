import { http, FRAPPE_BASE } from './http'

interface GetRolesResponse {
  message?: string[]
  exc?: string
}

export async function getUserRoles(): Promise<string[]> {
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.core.doctype.user.user.get_roles`)
  const data = (await res.json()) as GetRolesResponse
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch user roles.')
  }
  return data.message ?? []
}
