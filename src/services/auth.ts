import { FRAPPE_BASE } from './http'
import { getUserRoles } from './users'
import type { User } from '../types/auth'

const SID_STORAGE_KEY = 'oceanfleet_sid'
const AUTH_STORAGE_KEY = 'oceanfleet_auth'
const API_KEY_STORAGE_KEY = 'oceanfleet_api_key'
const API_SECRET_STORAGE_KEY = 'oceanfleet_api_secret'

interface FrappeLoginResponse {
  message?: string
  full_name?: string
  home_page?: string
  exc?: string
}

interface GenerateKeysResponse {
  message?: { api_key?: string; api_secret?: string }
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

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY)
  } catch {
    return null
  }
}

export function getApiSecret(): string | null {
  try {
    return localStorage.getItem(API_SECRET_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setApiCredentials(apiKey: string, apiSecret: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey)
  localStorage.setItem(API_SECRET_STORAGE_KEY, apiSecret)
}

export function clearApiCredentials(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY)
  localStorage.removeItem(API_SECRET_STORAGE_KEY)
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
  console.info('[auth] login extractSid =', sid, '| document.cookie =', document.cookie, '| stored sid =', getSid())
  if (sid) setSid(sid)

  await generateApiKeys(usr)

  const roles = await getUserRoles().catch(() => [] as string[])

  return { fullName: data.full_name ?? '', roles }
}

export async function generateApiKeys(user: string): Promise<{ apiKey: string; apiSecret: string }> {
  const url = `${FRAPPE_BASE}/api/method/frappe.core.doctype.user.user.generate_keys`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  // Browsers strip a manual Cookie header (forbidden header name); this is honored
  // by non-browser fetch implementations (Node/undici, SSR, tests).
  const sid = getSid()
  if (sid) headers.Cookie = `sid=${sid}`
  console.info('[auth] generate_keys getSid =', sid, '| document.cookie =', document.cookie)
  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ user }),
  })

  const data = (await res.json()) as GenerateKeysResponse
  console.debug('[API] POST', url, data)

  const apiKey = data.message?.api_key
  const apiSecret = data.message?.api_secret
  if (!res.ok || !apiKey || !apiSecret) {
    throw new Error(data.exc ?? 'Failed to generate API keys.')
  }

  setApiCredentials(apiKey, apiSecret)
  return { apiKey, apiSecret }
}
