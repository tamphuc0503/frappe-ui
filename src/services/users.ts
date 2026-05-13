import { http, FRAPPE_BASE } from './http'
import { getUserCache } from './auth'
import type { UserProfile } from '../types/user'
import { userCodec, type FrappeUser } from '../transformers/user'

interface GetRolesResponse {
  message?: string[]
  exc?: string
}

interface InsertUserResponse {
  message?: { name?: string }
  exc?: string
  _server_messages?: string
}

interface GetDocResponse<T> {
  message?: T
  exc?: string
  _server_messages?: string
}

interface SetValueResponse {
  message?: FrappeUser
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
    send_welcome_email: 1,
    roles: [
      { role: 'HR User' },
    ],
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

export async function getCurrentUserProfile(): Promise<UserProfile> {
  const cached = getUserCache()
  if (!cached) {
    throw new Error('Not authenticated. Please log out and back in.')
  }
  const params = new URLSearchParams({ doctype: 'User', name: cached.email })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get?${params}`)
  const data = (await res.json()) as GetDocResponse<FrappeUser>
  if (!res.ok || !data.message) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to load profile.')
  }
  return userCodec.decode(data.message)
}

export interface UpdateUserProfileInput {
  fullName: string
  avatarUrl: string
  phone: string
  mobileNo: string
  bio: string
  location: string
}

export async function updateCurrentUserProfile(input: UpdateUserProfileInput): Promise<UserProfile> {
  const cached = getUserCache()
  if (!cached) {
    throw new Error('Not authenticated. Please log out and back in.')
  }
  const fieldname: Record<string, string> = {
    full_name: input.fullName,
    user_image: input.avatarUrl,
    phone: input.phone,
    mobile_no: input.mobileNo,
    bio: input.bio,
    location: input.location,
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.set_value`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ doctype: 'User', name: cached.email, fieldname }),
  })
  const data = (await res.json()) as SetValueResponse
  if (!res.ok || !data.message) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to save profile.')
  }
  return userCodec.decode(data.message)
}

export async function updatePassword(
  key: string,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  const formData = new FormData()
  formData.append('key', key)
  formData.append('old_password', oldPassword)
  formData.append('new_password', newPassword)
  formData.append('confirm_password', confirmPassword)
  formData.append('logout_all_sessions', '1')
  formData.append('cmd', 'frappe.core.doctype.user.user.update_password')

  const res = await http(`${FRAPPE_BASE}/api/method/frappe.core.doctype.user.user.update_password`, {
    method: 'POST',
    body: formData,
  })
  const data = (await res.json()) as { message?: string; exc?: string; _server_messages?: string }
  if (!res.ok || data.exc) {
    let msg = 'Failed to update password.'
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
