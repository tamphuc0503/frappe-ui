import { http, FRAPPE_BASE } from './http'

interface GetRolesResponse {
  message?: string[]
  exc?: string
}

interface InsertUserResponse {
  message?: { name?: string }
  exc?: string
  _server_messages?: string
}

export async function getUserRoles(): Promise<string[]> {
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.core.doctype.user.user.get_roles`)
  const data = (await res.json()) as GetRolesResponse
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch user roles.')
  }
  return data.message ?? []
}

// Create a Frappe User. Returns the user's name (which Frappe sets to the email).
// If a user with that email already exists, this is treated as success and the
// existing email is returned — so callers can safely link by user_id.
export async function createUser(email: string, fullName: string): Promise<string> {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] || email.split('@')[0]
  const lastName = parts.slice(1).join(' ')
  const doc = {
    doctype: 'User',
    email,
    first_name: firstName,
    last_name: lastName,
    enabled: 1,
    send_welcome_email: 0,
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertUserResponse
  if (res.ok && data.message?.name) return data.message.name
  const errText = `${data.exc ?? ''} ${data._server_messages ?? ''}`
  if (/DuplicateEntryError|already exists/i.test(errText)) return email
  throw new Error(data.exc ?? data._server_messages ?? 'Failed to create user.')
}
