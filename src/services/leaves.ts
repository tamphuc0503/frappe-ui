import { http, FRAPPE_BASE } from './http'
import { getMyEmployeeId } from './hrm'
import type { MyLeave, LeaveSummary, LeaveBalance, Holiday } from '../types/leave'
import { leaveApplicationCodec, type FrappeLeaveApplication } from '../transformers/leaveApplication'

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

interface GetDocResponse<T> {
  message?: T
  exc?: string
}

export interface LeaveTypeOption {
  value: string
  label: string
}

export async function getLeaveTypes(): Promise<LeaveTypeOption[]> {
  const params = new URLSearchParams({
    doctype: 'Leave Type',
    fields: JSON.stringify(['name']),
    limit_page_length: '0',
    order_by: 'name asc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<{ name: string }>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch leave types.')
  }
  return (data.message ?? []).map((r) => ({ value: r.name, label: r.name }))
}

export async function getMyLeaves(): Promise<MyLeave[]> {
  const empId = await getMyEmployeeId()
  if (!empId) return []
  const params = new URLSearchParams({
    doctype: 'Leave Application',
    fields: JSON.stringify([
      'name',
      'employee',
      'leave_type',
      'from_date',
      'to_date',
      'total_leave_days',
      'status',
      'description',
      'posting_date',
      'half_day',
      'half_day_date',
    ]),
    filters: JSON.stringify([['employee', '=', empId]]),
    limit_page_length: '0',
    order_by: 'from_date desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeLeaveApplication>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch leaves.')
  }
  return (data.message ?? []).map(leaveApplicationCodec.decode)
}

// Frappe's `get_leave_details` (HRMS) returns leave allocation/balance per
// leave type, plus a list of leave types that count as "leave without pay".
// Shape isn't strictly typed because HRMS versions vary; we narrow to what
// we read.
interface LeaveDetailsResponse {
  message?: {
    leave_allocation?: Record<
      string,
      { total_leaves?: number; leaves_taken?: number; remaining_leaves?: number }
    >
    lwps?: string[]
  }
  exc?: string
}

export async function getMyLeaveSummary(): Promise<LeaveSummary> {
  const empId = await getMyEmployeeId()
  if (!empId) return { balances: [], totalAvailable: 0, totalUnpaidUsed: 0 }
  const today = new Date().toISOString().slice(0, 10)
  const params = new URLSearchParams({ employee: empId, date: today })
  const res = await http(
    `${FRAPPE_BASE}/api/method/hrms.hr.doctype.leave_application.leave_application.get_leave_details?${params}`,
  )
  const data = (await res.json()) as LeaveDetailsResponse
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch leave summary.')
  }
  const allocations = data.message?.leave_allocation ?? {}
  const lwps = new Set(data.message?.lwps ?? [])
  const balances: LeaveBalance[] = Object.entries(allocations).map(([leaveType, info]) => ({
    leaveType,
    allocation: Number(info?.total_leaves ?? 0),
    used: Number(info?.leaves_taken ?? 0),
    balance: Number(info?.remaining_leaves ?? 0),
    isLwp: lwps.has(leaveType),
  }))
  const totalAvailable = balances
    .filter((b) => !b.isLwp)
    .reduce((s, b) => s + b.balance, 0)
  const totalUnpaidUsed = balances
    .filter((b) => b.isLwp)
    .reduce((s, b) => s + b.used, 0)
  return { balances, totalAvailable, totalUnpaidUsed }
}

interface FrappeEmployeeHoliday {
  holiday_list?: string
}

interface FrappeHolidayRow {
  holiday_date?: string
  description?: string
  weekly_off?: number
}

interface FrappeHolidayList {
  name: string
  holidays?: FrappeHolidayRow[]
}

export async function getMyHolidays(year: number): Promise<Holiday[]> {
  const empId = await getMyEmployeeId()
  if (!empId) return []
  const empParams = new URLSearchParams({ doctype: 'Employee', name: empId })
  const empRes = await http(`${FRAPPE_BASE}/api/method/frappe.client.get?${empParams}`)
  const empData = (await empRes.json()) as GetDocResponse<FrappeEmployeeHoliday>
  if (!empRes.ok || empData.exc || !empData.message?.holiday_list) return []
  const listName = empData.message.holiday_list
  const hlParams = new URLSearchParams({ doctype: 'Holiday List', name: listName })
  const hlRes = await http(`${FRAPPE_BASE}/api/method/frappe.client.get?${hlParams}`)
  const hlData = (await hlRes.json()) as GetDocResponse<FrappeHolidayList>
  if (!hlRes.ok || hlData.exc || !hlData.message) return []
  const yearPrefix = `${year}-`
  return (hlData.message.holidays ?? [])
    .filter((h) => h.holiday_date?.startsWith(yearPrefix))
    .map((h) => ({
      date: h.holiday_date ?? '',
      description: h.description ?? '',
      weeklyOff: h.weekly_off === 1,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}
