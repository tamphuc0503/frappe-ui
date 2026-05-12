export const FRAPPE_BASE = ''

// All API calls use the sid cookie for authentication.
// `credentials: 'include'` ensures the browser sends the sid cookie set during login.
export async function http(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const res = await fetch(input, { credentials: 'include', ...init, headers })
  res.clone().json().then(
    (data) => console.debug('[API]', init.method ?? 'GET', String(input), data),
    () => { /* non-JSON body, skip */ },
  )
  return res
}
