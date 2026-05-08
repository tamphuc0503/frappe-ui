const FRAPPE_BASE = 'https://oceanfleet.aprilsea.com'

interface FrappeLoginResponse {
  message?: string
  full_name?: string
  home_page?: string
  exc?: string
}

export async function frappeLogin(usr: string, pwd: string): Promise<{ fullName: string }> {
  const res = await fetch(`${FRAPPE_BASE}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ usr, pwd }),
  })

  const data = await res.json() as FrappeLoginResponse

  if (!res.ok) {
    throw new Error(data.message ?? 'Invalid email or password.')
  }

  return { fullName: data.full_name ?? '' }
}
