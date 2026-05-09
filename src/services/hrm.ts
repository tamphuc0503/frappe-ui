import { http, FRAPPE_BASE } from './http'
import { getCompanyCache } from './company'
import { getUserCache } from './auth'
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

export async function getDepartments(): Promise<string[]> {
  const params = new URLSearchParams({
    doctype: 'Department',
    fields: JSON.stringify(['name']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeDepartment>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch departments.')
  }
  return (data.message ?? []).map((d) => d.name)
}

export async function getDesignations(): Promise<string[]> {
  const params = new URLSearchParams({
    doctype: 'Designation',
    fields: JSON.stringify(['name']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<{ name: string }>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch designations.')
  }
  return (data.message ?? []).map((d) => d.name)
}

export async function getGenders(): Promise<string[]> {
  const params = new URLSearchParams({
    doctype: 'Gender',
    fields: JSON.stringify(['name']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<{ name: string }>
  if (!res.ok) {
    throw new Error(data.exc ?? 'Failed to fetch genders.')
  }
  return (data.message ?? []).map((g) => g.name)
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
  const doc = toFrappeEmployeeDoc(input)
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
