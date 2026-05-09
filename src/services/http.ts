import { getSid } from './auth'

export const FRAPPE_BASE = 'http://localhost:8080'

// Browsers silently drop attempts to set the Cookie header (forbidden header per Fetch spec).
// This wrapper still injects it for non-browser callers and as an explicit signal of intent.
export async function http(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const sid = getSid()
  const headers = new Headers(init.headers)
  if (sid) {
    headers.set('Cookie', `sid=${sid}`)
  }
  const res = await fetch(input, { credentials: 'include', ...init, headers })
  res.clone().json().then(
    (data) => console.debug('[API]', init.method ?? 'GET', String(input), data),
    () => { /* non-JSON body, skip */ },
  )
  return res
}
