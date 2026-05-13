import { http, FRAPPE_BASE } from './http'

interface InsertResponse {
  message?: unknown
  exc?: string
  _server_messages?: string
}

export async function createUserPermission(user: string, allowDoctype: string, forValue: string): Promise<void> {
  const doc = {
    doctype: 'User Permission',
    user,
    allow: allowDoctype,
    for_value: forValue,
    apply_to_all_doctypes: 1,
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse
  if (!res.ok || data.exc) {
    let msg = 'Failed to create user permission.'
    if (data._server_messages) {
      try {
        const parsed = JSON.parse(data._server_messages) as string | string[]
        const first = Array.isArray(parsed) ? parsed[0] : parsed
        const inner = JSON.parse(first) as { message?: string }
        if (inner.message) msg = inner.message
      } catch { /* use default */ }
    }
    throw new Error(data.exc ?? msg)
  }
}
