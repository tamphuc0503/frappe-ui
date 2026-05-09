import type { Company } from '../types/company'
import type { Codec } from './codec'

export interface FrappeCompany {
  name: string
  company_name?: string
  abbr?: string
  domain?: string
  default_currency?: string
  country?: string
  date_of_establishment?: string
  email?: string
  phone_no?: string
  fax?: string
  website?: string
  tax_id?: string
}

export const companyCodec: Codec<Company, FrappeCompany> = {
  decode(frappe) {
    return {
      id: frappe.name,
      name: frappe.company_name ?? frappe.name,
      abbreviation: frappe.abbr ?? '',
      domain: frappe.domain ?? '',
      currency: frappe.default_currency ?? '',
      country: frappe.country ?? '',
      establishedDate: frappe.date_of_establishment ?? '',
      email: frappe.email ?? '',
      phone: frappe.phone_no ?? '',
      fax: frappe.fax ?? '',
      website: frappe.website ?? '',
      taxId: frappe.tax_id ?? '',
    }
  },
  encode(c) {
    return {
      name: c.id,
      company_name: c.name,
      abbr: c.abbreviation || undefined,
      domain: c.domain || undefined,
      default_currency: c.currency || undefined,
      country: c.country || undefined,
      date_of_establishment: c.establishedDate || undefined,
      email: c.email || undefined,
      phone_no: c.phone || undefined,
      fax: c.fax || undefined,
      website: c.website || undefined,
      tax_id: c.taxId || undefined,
    }
  },
}
