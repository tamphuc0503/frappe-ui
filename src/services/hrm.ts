import { http, FRAPPE_BASE } from './http'
import { getCompanyCache } from './company'
import { getUserCache } from './auth'
import { createUser } from './users'
import type { Employee } from '../types/hrm'
import {
  employeeCodec,
  toFrappeEmployeeDoc,
  toFrappeEmployeeUpdate,
  type FrappeEmployee,
  type CreateEmployeeInput,
} from '../transformers/employee'
import {
  toFrappeDepartmentDoc,
  type FrappeDepartment,
} from '../transformers/department'

export type { CreateEmployeeInput }

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

interface InsertResponse<T = unknown> {
  message?: T
  exc?: string
  _server_messages?: string
}

export interface LookupOption {
  value: string
  label: string
  id?: string
}

// Frappe's get_list returns rows like `{name: <key>, <display_field>: <label>}`.
// `name` is the doctype's primary key (what we send back to Frappe in link
// fields); the display field is what we show to the user. They are not always
// the same — e.g. Department has `name='HR-001'`, `department_name='Human Resources'`.
function toLookupOptions(rows: unknown, labelKey: string): LookupOption[] {
  if (!Array.isArray(rows)) return []
  const out: LookupOption[] = []
  for (const r of rows) {
    if (typeof r === 'string' && r.length > 0) {
      out.push({ value: r, label: r })
      continue
    }
    if (r && typeof r === 'object') {
      const obj = r as Record<string, unknown>
      const key = typeof obj.name === 'string' ? obj.name : ''
      const lbl = typeof obj[labelKey] === 'string' && (obj[labelKey] as string).length > 0
        ? (obj[labelKey] as string)
        : key
      const id = typeof obj.id === 'string' && obj.id.length > 0 ? obj.id : undefined
      if (key) out.push({ value: key, label: lbl, id })
    }
  }
  return out
}

export async function getDepartments(): Promise<LookupOption[]> {
  const params = new URLSearchParams({
    doctype: 'Department',
    fields: JSON.stringify(['id', 'name', 'department_name']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeDepartment>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch departments.')
  }
  return toLookupOptions(data.message, 'department_name')
}

export async function getDesignations(): Promise<LookupOption[]> {
  const params = new URLSearchParams({
    doctype: 'Designation',
    fields: JSON.stringify(['name', 'designation_name']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<{ name: string }>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch designations.')
  }
  return toLookupOptions(data.message, 'designation_name')
}

export async function getGenders(): Promise<LookupOption[]> {
  const params = new URLSearchParams({
    doctype: 'Gender',
    fields: JSON.stringify(['name', 'gender']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<{ name: string }>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch genders.')
  }
  return toLookupOptions(data.message, 'gender')
}

// Resolve the current logged-in user's Employee primary key by matching
// Employee.user_id to the cached user email. Returns null if the user is not
// linked to any Employee — callers should treat that as "no records".
export async function getMyEmployeeId(): Promise<string | null> {
  const cached = getUserCache()
  if (!cached) {
    throw new Error('Not authenticated. Please log out and back in.')
  }
  const params = new URLSearchParams({
    doctype: 'Employee',
    fields: JSON.stringify(['name']),
    filters: JSON.stringify([['user_id', '=', cached.email]]),
    limit_page_length: '1',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<{ name: string }>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to find your employee record.')
  }
  return data.message?.[0]?.name ?? null
}

export async function getEmployees(): Promise<Employee[]> {
  const params = new URLSearchParams({
    doctype: 'Employee',
    fields: JSON.stringify([
      'name',
      'employee_name',
      'personal_email',
      'company_email',
      'cell_number',
      'department',
      'designation',
      'gender',
      'date_of_birth',
      'status',
      'date_of_joining',
    ]),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeEmployee>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch employees.')
  }
  return (data.message ?? []).map(employeeCodec.decode)
}

export async function getEmployee(id: string): Promise<Employee> {
  const res = await http(`${FRAPPE_BASE}/api/resource/Employee/${encodeURIComponent(id)}`)
  const data = (await res.json()) as { data?: FrappeEmployee; exc?: string }
  if (!res.ok || !data.data) {
    throw new Error(data.exc ?? 'Failed to fetch employee.')
  }
  return employeeCodec.decode(data.data)
}

export async function updateEmployee(id: string, input: CreateEmployeeInput): Promise<Employee> {
  const body = toFrappeEmployeeUpdate(input)
  const res = await http(`${FRAPPE_BASE}/api/resource/Employee/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { data?: FrappeEmployee; exc?: string; _server_messages?: string }
  if (!res.ok || !data.data) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to update employee.')
  }
  return employeeCodec.decode(data.data)
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const userId = await createUser(input.email, input.name)
  const doc = toFrappeEmployeeDoc(input, userId)
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse<FrappeEmployee>
  if (!res.ok || !data.message) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to create employee.')
  }
  return employeeCodec.decode(data.message)
}

export async function createDepartment(name: string): Promise<void> {
  const company = getCompanyCache()
  const user = getUserCache()
  if (!company) {
    throw new Error('No company configured. Please log out and back in.')
  }
  if (!user) {
    throw new Error('Not authenticated. Please log out and back in.')
  }
  const doc = toFrappeDepartmentDoc({
    name,
    company: company.name,
    owner: user.email,
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse<FrappeDepartment>
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to create department.')
  }
}
