import { http, FRAPPE_BASE } from './http'
import type { Company } from '../types/company'
import { companyCodec, type FrappeCompany } from '../transformers/company'

const COMPANY_STORAGE_KEY = 'oceanfleet_company'

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

export function getCompanyCache(): Company | null {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Company
  } catch {
    // ignore parse errors
  }
  return null
}

export function setCompanyCache(c: Company | null): void {
  if (c) {
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(c))
  } else {
    localStorage.removeItem(COMPANY_STORAGE_KEY)
  }
}

export function clearCompanyCache(): void {
  localStorage.removeItem(COMPANY_STORAGE_KEY)
}

export async function getCompany(): Promise<Company | null> {
  const params = new URLSearchParams({
    doctype: 'Company',
    fields: JSON.stringify([
      'name', 'company_name', 'abbr', 'domain', 'default_currency',
      'country', 'date_of_establishment', 'email', 'phone_no',
      'fax', 'website', 'tax_id',
    ]),
    limit_page_length: '1',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeCompany>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch company.')
  }
  const first = data.message?.[0]
  return first ? companyCodec.decode(first) : null
}
