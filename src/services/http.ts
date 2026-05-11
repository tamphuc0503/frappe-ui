import { getApiKey, getApiSecret } from './auth'

export const FRAPPE_BASE = ''

// All calls go through here authenticated by `Authorization: token <api_key>:<api_secret>`.
// `credentials: 'omit'` ensures the browser does NOT send the sid cookie, so token auth
// is the sole credential. Sid is reserved for the login + generate_keys bootstrap calls,
// which use raw fetch with `credentials: 'include'`.
export async function http(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const apiKey = getApiKey()
  const apiSecret = getApiSecret()
  const headers = new Headers(init.headers)
  if (apiKey && apiSecret && !headers.has('Authorization')) {
    headers.set('Authorization', `token ${apiKey}:${apiSecret}`)
  }
  const res = await fetch(input, { credentials: 'omit', ...init, headers })
  res.clone().json().then(
    (data) => console.debug('[API]', init.method ?? 'GET', String(input), data),
    () => { /* non-JSON body, skip */ },
  )
  return res
}
