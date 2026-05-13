import { http, FRAPPE_BASE } from './http'
import { getMyEmployeeId } from './hrm'
import type { MyLeave, LeaveSummary, LeaveBalance, Holiday, LeaveRequestPayload, LeaveListItem } from '../types/leave'
import { leaveApplicationCodec, decodeLeaveListItem, type FrappeLeaveApplication, type FrappeLeaveListItem } from '../transformers/leaveApplication'

// ─── Workflow State & Action Constants ───────────────────────────────────────

export const LeaveRequestWorkflowState = {
  PENDING_MANAGER: 'Pending Manager',
  PENDING_HR: 'Pending HR',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  OPEN: 'Open',
} as const

export type LeaveRequestWorkflowStateValue = (typeof LeaveRequestWorkflowState)[keyof typeof LeaveRequestWorkflowState]

export const LeaveRequestWorkflowAction = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
} as const

export type LeaveRequestWorkflowActionValue = (typeof LeaveRequestWorkflowAction)[keyof typeof LeaveRequestWorkflowAction]

// ─── Interfaces ──────────────────────────────────────────────────────────────

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

export async function getLeaveTypes(employeeId?: string): Promise<LeaveTypeOption[]> {
  const empId = employeeId ?? await getMyEmployeeId()
  if (empId) {
    // Fetch leave types allocated to this employee
    const params = new URLSearchParams({
      doctype: 'Leave Allocation',
      fields: JSON.stringify(['leave_type']),
      filters: JSON.stringify([['employee', '=', empId], ['docstatus', '=', 1]]),
      limit_page_length: '0',
      order_by: 'leave_type asc',
      group_by: 'leave_type',
    })
    const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
    const data = (await res.json()) as GetListResponse<{ leave_type: string }>
    if (res.ok && !data.exc && data.message && data.message.length > 0) {
      const seen = new Set<string>()
      return data.message
        .filter((r) => {
          if (seen.has(r.leave_type)) {
            return false
          }
          seen.add(r.leave_type)
          return true
        })
        .map((r) => ({ value: r.leave_type, label: r.leave_type }))
    }
  }
  // Fallback: all leave types
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

interface InsertResponse {
  message?: unknown
  exc?: string
  _server_messages?: string
}

export async function createLeaveRequest(payload: LeaveRequestPayload, employeeId?: string): Promise<void> {
  const empId = employeeId ?? await getMyEmployeeId()
  if (!empId) throw new Error('No linked employee record found.')
  const sorted = payload.days.map((d) => d.date).sort((a, b) => a.localeCompare(b))
  const fromDate = sorted[0]
  const toDate = sorted.at(-1)!
  const isHalfDay = payload.days.length === 1 && payload.days[0].day.type === 'half'
  const description = payload.days
    .filter((d) => d.day.type === 'half' || d.day.type === 'custom')
    .map((d) => {
      if (d.day.type === 'half') return `${d.date}: Half day`
      return `${d.date}: ${d.day.fromTime}–${d.day.endTime}`
    })
    .join('\n')

  const doc: Record<string, unknown> = {
    doctype: 'Leave Application',
    employee: empId,
    leave_type: payload.leaveType,
    from_date: fromDate,
    to_date: toDate,
    status: 'Open',
    half_day: isHalfDay ? 1 : 0,
    ...(isHalfDay ? { half_day_date: fromDate } : {}),
    ...(description ? { description } : {}),
  }

  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc }),
  })
  const data = (await res.json()) as InsertResponse
  if (!res.ok || data.exc) {
    const serverMsg = data._server_messages
    let msg = 'Failed to create leave request.'
    if (serverMsg) {
      try {
        const parsed = JSON.parse(serverMsg) as string | string[]
        const first = Array.isArray(parsed) ? parsed[0] : parsed
        const inner = JSON.parse(first) as { message?: string }
        if (inner.message) msg = inner.message
      } catch { /* use default */ }
    }
    throw new Error(msg)
  }
}

export async function getAllLeaves(): Promise<LeaveListItem[]> {
  const params = new URLSearchParams({
    doctype: 'Leave Application',
    fields: JSON.stringify([
      'name',
      'employee',
      'employee_name',
      'department',
      'leave_type',
      'from_date',
      'to_date',
      'total_leave_days',
      'status',
      'description',
      'posting_date',
      'half_day',
      'workflow_state',
    ]),
    limit_page_length: '0',
    order_by: 'posting_date desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeLeaveListItem>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch leave requests.')
  }
  return (data.message ?? []).map(decodeLeaveListItem)
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

export async function cancelLeaveRequest(leaveId: string): Promise<void> {
  // Frappe workflow: to cancel a submitted doc we first call amend_cancel
  // But for Leave Application with status Open, we can just update status to Cancelled
  const res = await http(`${FRAPPE_BASE}/api/resource/Leave Application/${leaveId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status: 'Cancelled', docstatus: 2 }),
  })
  const data = (await res.json()) as { exc?: string; _server_messages?: string }
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to cancel leave request.')
  }
}

export async function approveLeaveRequest(leaveId: string): Promise<void> {
  const action = LeaveRequestWorkflowAction.APPROVE

  const res = await http(`${FRAPPE_BASE}/api/method/frappe.model.workflow.apply_workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      doc: JSON.stringify({ doctype: 'Leave Application', name: leaveId }),
      action,
    }),
  })
  const data = (await res.json()) as { exc?: string; _server_messages?: string }
  if (!res.ok) {
    let msg = 'Failed to approve leave request.'
    if (data._server_messages) {
      try {
        const parsed = JSON.parse(data._server_messages) as string | string[]
        const first = Array.isArray(parsed) ? parsed[0] : parsed
        const inner = JSON.parse(first) as { message?: string }
        if (inner.message) msg = inner.message
      } catch { /* use default */ }
    }
    throw new Error(data.exc ?? msg)
  }
}

export async function rejectLeaveRequest(leaveId: string): Promise<void> {
  const res = await http(`${FRAPPE_BASE}/api/resource/Leave Application/${leaveId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ status: 'Rejected' }),
  })
  const data = (await res.json()) as { exc?: string; _server_messages?: string }
  if (!res.ok) {
    throw new Error(data.exc ?? data._server_messages ?? 'Failed to reject leave request.')
  }
}

export interface LeaveActivityLog {
  date: string
  user: string
  action: string
  detail: string
}

export async function getLeaveActivityLog(leaveId: string): Promise<LeaveActivityLog[]> {
  const logs: LeaveActivityLog[] = []

  // Fetch Version (track_changes) entries
  const vParams = new URLSearchParams({
    doctype: 'Version',
    fields: JSON.stringify(['creation', 'owner', 'data']),
    filters: JSON.stringify([['ref_doctype', '=', 'Leave Application'], ['docname', '=', leaveId]]),
    limit_page_length: '0',
    order_by: 'creation asc',
  })
  const vRes = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${vParams}`)
  const vData = (await vRes.json()) as { message?: { creation: string; owner: string; data: string }[] }
  for (const v of vData.message ?? []) {
    try {
      const parsed = JSON.parse(v.data) as { changed?: [string, unknown, unknown][] }
      for (const [field, oldVal, newVal] of parsed.changed ?? []) {
        if (field === 'status') {
          logs.push({
            date: v.creation,
            user: v.owner,
            action: String(newVal),
            detail: `Status changed from ${String(oldVal)} to ${String(newVal)}`,
          })
        }
      }
    } catch { /* skip unparseable */ }
  }

  // Fetch Comment entries
  const cParams = new URLSearchParams({
    doctype: 'Comment',
    fields: JSON.stringify(['creation', 'owner', 'comment_type', 'content']),
    filters: JSON.stringify([['reference_doctype', '=', 'Leave Application'], ['reference_name', '=', leaveId], ['comment_type', 'in', ['Comment', 'Workflow', 'Like']]]),
    limit_page_length: '0',
    order_by: 'creation asc',
  })
  const cRes = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${cParams}`)
  const cData = (await cRes.json()) as { message?: { creation: string; owner: string; comment_type: string; content: string }[] }
  for (const c of cData.message ?? []) {
    logs.push({
      date: c.creation,
      user: c.owner,
      action: c.comment_type,
      detail: c.content?.replace(/<[^>]*>/g, '') || c.comment_type,
    })
  }

  logs.sort((a, b) => a.date.localeCompare(b.date))
  return logs
}
