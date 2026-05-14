import { http, FRAPPE_BASE } from './http'
import { getCompanyCache } from './company'
import { getUserCache } from './auth'
import { createUser } from './users'
import type { Employee, AttendanceRecord, AttendanceStatus, JobOpening, JobOpeningStatus, JobApplicant, InterviewRound, StaffingPlan } from '../types/hrm'
import {
  employeeCodec,
  toFrappeEmployeeDoc,
  toFrappeEmployeeUpdate,
  type FrappeEmployee,
  type CreateEmployeeInput,
} from '../transformers/employee'
import {
  toFrappeDepartmentDoc,
  decodeDepartment,
  type FrappeDepartment,
  type Department,
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

export async function getDepartmentList(): Promise<Department[]> {
  const params = new URLSearchParams({
    doctype: 'Department',
    fields: JSON.stringify(['name', 'department_name', 'parent_department', 'is_group', 'disabled']),
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeDepartment>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch departments.')
  }
  return (data.message ?? []).map(decodeDepartment)
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

export async function createDepartment(name: string, parentDepartment?: string): Promise<void> {
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
    parentDepartment,
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

// ── Job Openings ─────────────────────────────────────────────────────────────

interface FrappeJobOpening {
  name: string
  job_title?: string
  designation?: string
  department?: string
  status?: string
  description?: string
  posted_on?: string
  closes_on?: string
  company?: string
}

const JOB_STATUS_VALUES: JobOpeningStatus[] = ['Open', 'Screening', 'Ready for Interview', 'Interviewed', 'Onboarding', 'Rejected', 'Closed']

function decodeJobStatus(s: string | undefined): JobOpeningStatus {
  return (JOB_STATUS_VALUES as string[]).includes(s ?? '') ? (s as JobOpeningStatus) : 'Open'
}

function decodeJobOpening(f: FrappeJobOpening): JobOpening {
  return {
    id: f.name,
    jobTitle: f.job_title || f.designation || f.name,
    designation: f.designation || '',
    department: f.department || '',
    status: decodeJobStatus(f.status),
    description: f.description || '',
    postedOn: f.posted_on || '',
    closesOn: f.closes_on || '',
    company: f.company || '',
  }
}

export async function getJobOpenings(): Promise<JobOpening[]> {
  const params = new URLSearchParams({
    doctype: 'Job Opening',
    fields: JSON.stringify([
      'name', 'job_title', 'designation', 'department', 'status',
      'description', 'posted_on', 'closes_on', 'company',
    ]),
    limit_page_length: '0',
    order_by: 'modified desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeJobOpening>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch job openings.')
  }
  return (data.message ?? []).map(decodeJobOpening)
}

export async function updateJobOpeningStatus(id: string, status: string): Promise<void> {
  const res = await http(`${FRAPPE_BASE}/api/resource/Job Opening/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { exc?: string }).exc ?? 'Failed to update job opening status.')
  }
}

export async function createJobOpening(input: {
  jobTitle: string
  designation?: string
  department?: string
  description?: string
}): Promise<JobOpening> {
  const company = getCompanyCache()
  if (!company) throw new Error('No company configured. Please log out and back in.')
  const doc = {
    doctype: 'Job Opening',
    job_title: input.jobTitle,
    designation: input.designation || '',
    department: input.department || '',
    description: input.description || '',
    company: company.name,
    status: 'Open',
  }
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse<FrappeJobOpening>
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to create job opening.')
  }
  return decodeJobOpening(data.message as FrappeJobOpening)
}

interface FrappeJobApplicant {
  name: string
  applicant_name?: string
  email_id?: string
  job_title?: string
  status?: string
  rating?: number
  notes?: string
  resume_link?: string
  source?: string
  creation?: string
}

interface FrappeInterview {
  name: string
  job_applicant?: string
  job_opening?: string
  interview_round?: string
  scheduled_date?: string
  from_time?: string
  to_time?: string
  status?: string
  rating?: number
  total_score?: number
  average_rating?: number
  result?: string
}

export async function getJobApplicants(jobOpeningId: string): Promise<JobApplicant[]> {
  const params = new URLSearchParams({
    doctype: 'Job Applicant',
    fields: JSON.stringify([
      'name', 'applicant_name', 'email_id', 'job_title', 'status',
      'rating', 'notes', 'resume_link', 'source', 'creation',
    ]),
    filters: JSON.stringify([['job_title', '=', jobOpeningId]]),
    limit_page_length: '0',
    order_by: 'creation desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeJobApplicant>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch job applicants.')
  }
  return (data.message ?? []).map((r) => ({
    id: r.name,
    applicantName: r.applicant_name || '',
    emailAddress: r.email_id || '',
    jobTitle: r.job_title || '',
    status: r.status || '',
    rating: r.rating ?? 0,
    notes: r.notes || '',
    resumeLink: r.resume_link || '',
    source: r.source || '',
    createdOn: r.creation || '',
  }))
}

export async function getInterviews(jobOpeningId: string): Promise<InterviewRound[]> {
  const params = new URLSearchParams({
    doctype: 'Interview',
    fields: JSON.stringify([
      'name', 'job_applicant', 'job_opening', 'interview_round',
      'scheduled_date', 'from_time', 'to_time', 'status',
      'rating', 'total_score', 'average_rating', 'result',
    ]),
    filters: JSON.stringify([['job_opening', '=', jobOpeningId]]),
    limit_page_length: '0',
    order_by: 'scheduled_date desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeInterview>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch interviews.')
  }
  return (data.message ?? []).map((r) => ({
    id: r.name,
    jobApplicant: r.job_applicant || '',
    applicantName: '',
    jobOpening: r.job_opening || '',
    interviewRound: r.interview_round || '',
    scheduledDate: r.scheduled_date || '',
    fromTime: r.from_time || '',
    toTime: r.to_time || '',
    status: r.status || '',
    rating: r.rating ?? 0,
    totalScore: r.total_score ?? 0,
    averageRating: r.average_rating ?? 0,
    result: r.result || '',
  }))
}

// ── Staffing Plans ──────────────────────────────────────────────────────────────

interface FrappeStaffingPlan {
  name: string
  staffing_plan?: string
  company?: string
  department?: string
  from_date?: string
  to_date?: string
  total_estimated_budget?: number
  docstatus?: number
}

interface FrappeStaffingDetail {
  designation?: string
  vacancies?: number
  estimated_cost_per_position?: number
  total_estimated_cost?: number
  number_of_positions?: number
}

export async function getStaffingPlans(): Promise<StaffingPlan[]> {
  const params = new URLSearchParams({
    doctype: 'Staffing Plan',
    fields: JSON.stringify([
      'name', 'company', 'department',
      'from_date', 'to_date', 'total_estimated_budget', 'docstatus',
    ]),
    limit_page_length: '0',
    order_by: 'modified desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeStaffingPlan>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch staffing plans.')
  }
  return (data.message ?? []).map((r) => ({
    id: r.name,
    name: r.name,
    company: r.company || '',
    department: r.department || '',
    fromDate: r.from_date || '',
    toDate: r.to_date || '',
    totalEstimatedBudget: r.total_estimated_budget ?? 0,
    staffingDetails: [],
    docstatus: r.docstatus ?? 0,
  }))
}

export async function getStaffingPlanDetails(planId: string): Promise<StaffingPlan> {
  const res = await http(`${FRAPPE_BASE}/api/resource/Staffing Plan/${planId}`)
  const data = (await res.json()) as { data?: FrappeStaffingPlan & { staffing_details?: FrappeStaffingDetail[] } }
  if (!res.ok) {
    throw new Error('Failed to fetch staffing plan details.')
  }
  const r = data.data as FrappeStaffingPlan & { staffing_details?: FrappeStaffingDetail[] }
  return {
    id: r.name,
    name: r.name,
    company: r.company || '',
    department: r.department || '',
    fromDate: r.from_date || '',
    toDate: r.to_date || '',
    totalEstimatedBudget: r.total_estimated_budget ?? 0,
    docstatus: r.docstatus ?? 0,
    staffingDetails: (r.staffing_details ?? []).map((d) => ({
      designation: d.designation || '',
      vacancies: d.vacancies ?? 0,
      estimatedCostPerPosition: d.estimated_cost_per_position ?? 0,
      totalEstimatedCost: d.total_estimated_cost ?? 0,
      numberOfPositions: d.number_of_positions ?? 0,
    })),
  }
}
