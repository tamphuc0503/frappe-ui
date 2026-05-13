import { http, FRAPPE_BASE } from './http'
import { getCompanyCache } from './company'
import { getUserCache } from './auth'
import { createUser } from './users'
import type { Employee, AttendanceRecord, AttendanceStatus } from '../types/hrm'
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
}

// Frappe's get_list returns rows like `{name: <key>, <display_field>: <label>}`.
// `name` is the doctype's primary key (what we send back to Frappe in link
// fields); the display field is what we show to the user. They are not always
// the same — e.g. Department has `name='HR-001'`, `department_name='Human Resources'`.
function parseObjectRow(r: Record<string, unknown>, labelKey: string): LookupOption | null {
  let key = ''
  if (typeof r.name === 'string') key = r.name
  else if (typeof r.id === 'string') key = r.id
  if (!key) return null
  const rawLabel = r[labelKey]
  const lbl = typeof rawLabel === 'string' && rawLabel.length > 0 ? rawLabel : key
  return { value: key, label: lbl }
}

function toLookupOptions(rows: unknown, labelKey: string): LookupOption[] {
  if (!Array.isArray(rows)) return []
  return rows.reduce<LookupOption[]>((out, r) => {
    if (typeof r === 'string' && r.length > 0) {
      out.push({ value: r, label: r })
    } else if (r && typeof r === 'object') {
      const opt = parseObjectRow(r as Record<string, unknown>, labelKey)
      if (opt) out.push(opt)
    }
    return out
  }, [])
}

export async function getDepartments(): Promise<LookupOption[]> {
  const params = new URLSearchParams({
    doctype: 'Department',
    fields: JSON.stringify(['*']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeDepartment>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch departments.')
  }
  console.debug('[hrm] getDepartments raw:', data.message)
  return toLookupOptions(data.message, 'department_name')
}

export async function getDesignations(): Promise<LookupOption[]> {
  const params = new URLSearchParams({
    doctype: 'Designation',
    fields: JSON.stringify(['*']),
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
    fields: JSON.stringify(['*']),
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
// Cached in-memory so parallel callers (leaves, summary, holidays) share one request.
let _empIdPromise: Promise<string | null> | null = null

export async function getMyEmployeeId(): Promise<string | null> {
  if (_empIdPromise) return _empIdPromise
  _empIdPromise = _fetchMyEmployeeId()
  _empIdPromise.catch(() => { _empIdPromise = null })
  return _empIdPromise
}

async function _fetchMyEmployeeId(): Promise<string | null> {
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

// ── Employee Checkin ─────────────────────────────────────────────────

export interface EmployeeCheckinRecord {
  name: string
  employee: string
  employee_name: string
  log_type: 'IN' | 'OUT'
  time: string
}

let _employeeIdCache: string | null = null
let _employeeIdPromise: Promise<string> | null = null

async function getCurrentEmployeeId(): Promise<string> {
  if (_employeeIdCache) return _employeeIdCache
  if (_employeeIdPromise) return _employeeIdPromise

  _employeeIdPromise = (async () => {
    const userCache = getUserCache()
    if (!userCache?.email) throw new Error('User not logged in.')
    const params = new URLSearchParams({
      doctype: 'Employee',
      filters: JSON.stringify([['user_id', '=', userCache.email]]),
      fields: JSON.stringify(['name']),
      limit_page_length: '1',
    })
    const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
    const data = (await res.json()) as GetListResponse<{ name: string }>
    const id = data.message?.[0]?.name
    if (!id) throw new Error('No employee record linked to current user.')
    _employeeIdCache = id
    return id
  })()

  try {
    return await _employeeIdPromise
  } catch (err) {
    _employeeIdPromise = null
    throw err
  }
}

export async function createEmployeeCheckin(logType: 'IN' | 'OUT'): Promise<void> {
  const employeeId = await getCurrentEmployeeId()

  const doc = {
    doctype: 'Employee Checkin',
    employee: employeeId,
    log_type: logType,
    time: new Date().toISOString().replace('T', ' ').slice(0, 19),
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? `Failed to clock ${logType.toLowerCase()}.`)
  }
}

export async function getEmployeeCheckins(date: string): Promise<EmployeeCheckinRecord[]> {
  let employeeId: string
  try {
    employeeId = await getCurrentEmployeeId()
  } catch {
    return []
  }

  const startTime = `${date} 00:00:00`
  const endTime = `${date} 23:59:59`

  const params = new URLSearchParams({
    doctype: 'Employee Checkin',
    fields: JSON.stringify(['name', 'employee', 'employee_name', 'log_type', 'time']),
    filters: JSON.stringify([
      ['employee', '=', employeeId],
      ['time', '>=', startTime],
      ['time', '<=', endTime],
    ]),
    order_by: 'time asc',
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<EmployeeCheckinRecord>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch checkins.')
  }
  return data.message ?? []
}

export async function getMonthlyCheckins(year: number, month: number): Promise<EmployeeCheckinRecord[]> {
  let employeeId: string
  try {
    employeeId = await getCurrentEmployeeId()
  } catch {
    return []
  }

  const mm = String(month + 1).padStart(2, '0')
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startTime = `${year}-${mm}-01 00:00:00`
  const endTime = `${year}-${mm}-${String(lastDay).padStart(2, '0')} 23:59:59`

  const params = new URLSearchParams({
    doctype: 'Employee Checkin',
    fields: JSON.stringify(['name', 'employee', 'employee_name', 'log_type', 'time']),
    filters: JSON.stringify([
      ['employee', '=', employeeId],
      ['time', '>=', startTime],
      ['time', '<=', endTime],
    ]),
    order_by: 'time asc',
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<EmployeeCheckinRecord>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch monthly checkins.')
  }
  return data.message ?? []
}

// ── Resignation ──────────────────────────────────────────────────────

interface CreateResignationInput {
  employee: string
  resignationLetterDate: string
  boardingBegins: string
  reason: string
}

export async function createResignation(input: CreateResignationInput): Promise<void> {
  const doc = {
    doctype: 'Employee Separation',
    employee: input.employee,
    resignation_letter_date: input.resignationLetterDate,
    boarding_begins_on: input.boardingBegins,
    reason_for_resignation: input.reason,
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to submit resignation.')
  }
}

/* ── Attendance ─────────────────────────────────────────────────────────────── */

interface FrappeAttendance {
  name: string
  employee: string
  employee_name: string
  department: string
  attendance_date: string
  status: string // Present, Absent, Half Day, Work From Home
  early_exit?: number
  late_entry?: number
  working_hours?: number
}

function mapAttendanceStatus(s: string, lateEntry?: number): AttendanceStatus {
  if (s === 'Absent') return 'Absent'
  if (s === 'Half Day') return 'Half Day'
  if (lateEntry) return 'Late'
  return 'Present'
}

export async function getAttendanceRecords(
  fromDate: string,
  toDate: string,
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams({
    doctype: 'Attendance',
    fields: JSON.stringify([
      'name', 'employee', 'employee_name', 'department',
      'attendance_date', 'status', 'late_entry', 'early_exit', 'working_hours',
    ]),
    filters: JSON.stringify([
      ['attendance_date', '>=', fromDate],
      ['attendance_date', '<=', toDate],
    ]),
    order_by: 'attendance_date desc',
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeAttendance>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch attendance records.')
  }
  const rows = data.message ?? []
  return rows.map((r, i) => ({
    id: i + 1,
    employee: r.employee_name || r.employee,
    department: r.department || '',
    date: r.attendance_date,
    checkIn: '—',
    checkOut: '—',
    hours: r.working_hours ?? 0,
    status: mapAttendanceStatus(r.status, r.late_entry),
  }))
}

export async function getWeekAttendanceSummary(
  fromDate: string,
  toDate: string,
): Promise<{ date: string; present: number; absent: number }[]> {
  const records = await getAttendanceRecords(fromDate, toDate)
  const byDate = new Map<string, { present: number; absent: number }>()
  for (const r of records) {
    const entry = byDate.get(r.date) ?? { present: 0, absent: 0 }
    if (r.status === 'Absent') entry.absent++
    else entry.present++
    byDate.set(r.date, entry)
  }
  return Array.from(byDate.entries()).map(([date, counts]) => ({ date, ...counts }))
}
