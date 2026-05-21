import { http, FRAPPE_BASE } from './http'
import { getMyEmployeeId } from './hrm'

export type TimesheetStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface Timesheet {
  id: string
  employee: string
  employeeName: string
  startDate: string
  endDate: string
  totalHours: number
  status: TimesheetStatus
  company: string
}

export type AttendanceDayStatus = 'Present' | 'Absent' | 'Half Day' | 'Work From Home' | 'On Leave'

export interface AttendanceDay {
  date: string
  status: AttendanceDayStatus
  workingHours: number
  lateEntry: boolean
  earlyExit: boolean
}

interface FrappeTimesheet {
  name: string
  employee?: string
  employee_name?: string
  start_date?: string
  end_date?: string
  total_hours?: number
  status?: string
  company?: string
}

interface FrappeAttendanceRow {
  name: string
  attendance_date?: string
  status?: string
  working_hours?: number
  late_entry?: number
  early_exit?: number
}

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

const TIMESHEET_STATUSES: TimesheetStatus[] = ['Draft', 'Submitted', 'Cancelled']
const ATTENDANCE_STATUSES: AttendanceDayStatus[] = ['Present', 'Absent', 'Half Day', 'Work From Home', 'On Leave']

function decodeTimesheetStatus(s: string | undefined): TimesheetStatus {
  return (TIMESHEET_STATUSES as string[]).includes(s ?? '') ? (s as TimesheetStatus) : 'Draft'
}

function decodeAttendanceStatus(s: string | undefined): AttendanceDayStatus {
  return (ATTENDANCE_STATUSES as string[]).includes(s ?? '') ? (s as AttendanceDayStatus) : 'Present'
}

function decodeTimesheet(r: FrappeTimesheet): Timesheet {
  return {
    id: r.name,
    employee: r.employee || '',
    employeeName: r.employee_name || '',
    startDate: r.start_date || '',
    endDate: r.end_date || '',
    totalHours: r.total_hours ?? 0,
    status: decodeTimesheetStatus(r.status),
    company: r.company || '',
  }
}

export async function getMyTimesheets(): Promise<Timesheet[]> {
  const employeeId = await getMyEmployeeId()
  if (!employeeId) return []

  const params = new URLSearchParams({
    doctype: 'Timesheet',
    fields: JSON.stringify(['name', 'employee', 'employee_name', 'start_date', 'end_date', 'total_hours', 'status', 'company']),
    filters: JSON.stringify([['employee', '=', employeeId]]),
    order_by: 'start_date desc',
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeTimesheet>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch timesheets.')
  }
  return (data.message ?? []).map(decodeTimesheet)
}

export async function getMyAttendance(fromDate: string, toDate: string): Promise<AttendanceDay[]> {
  const employeeId = await getMyEmployeeId()
  if (!employeeId) return []

  const params = new URLSearchParams({
    doctype: 'Attendance',
    fields: JSON.stringify(['name', 'attendance_date', 'status', 'working_hours', 'late_entry', 'early_exit']),
    filters: JSON.stringify([
      ['employee', '=', employeeId],
      ['attendance_date', '>=', fromDate],
      ['attendance_date', '<=', toDate],
      ['docstatus', '=', '1'],
    ]),
    order_by: 'attendance_date asc',
    limit_page_length: '0',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeAttendanceRow>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch attendance.')
  }
  return (data.message ?? []).map((r) => ({
    date: r.attendance_date || '',
    status: decodeAttendanceStatus(r.status),
    workingHours: r.working_hours ?? 0,
    lateEntry: (r.late_entry ?? 0) === 1,
    earlyExit: (r.early_exit ?? 0) === 1,
  }))
}
