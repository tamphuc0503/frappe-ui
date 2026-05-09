import { FRAPPE_BASE } from './http'
import { getUserRoles } from './users'
import type { User } from '../types/auth'

const SID_STORAGE_KEY = 'oceanfleet_sid'
const AUTH_STORAGE_KEY = 'oceanfleet_auth'

interface FrappeLoginResponse {
  message?: string
  full_name?: string
  home_page?: string
  exc?: string
}

// Browsers strip Set-Cookie from fetch responses, so this returns null in-browser.
function extractSid(headers: Headers): string | null {
  const raw = headers.get('set-cookie')
  if (!raw) return null
  const match = /(?:^|[,;]\s*)sid=([^;,\s]+)/.exec(raw)
  return match ? decodeURIComponent(match[1]) : null
}

export function getSid(): string | null {
  try {
    return localStorage.getItem(SID_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setSid(sid: string): void {
  localStorage.setItem(SID_STORAGE_KEY, sid)
}

export function clearSid(): void {
  localStorage.removeItem(SID_STORAGE_KEY)
}

export function getUserCache(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as User
  } catch {
    // ignore parse errors
  }
  return null
}

export async function frappeLogin(usr: string, pwd: string): Promise<{ fullName: string; roles: string[] }> {
  const res = await fetch(`${FRAPPE_BASE}/api/method/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ usr, pwd }),
  })

  const data = await res.json() as FrappeLoginResponse
  console.debug('[API] POST', `${FRAPPE_BASE}/api/method/login`, data)

  if (!res.ok) {
    throw new Error(data.message ?? 'Invalid email or password.')
  }

  const sid = extractSid(res.headers)
  if (sid) setSid(sid)

  const roles = await getUserRoles().catch(() => [] as string[])

  return { fullName: data.full_name ?? '', roles }
}
