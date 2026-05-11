import type { MyLeave, LeaveApplicationStatus } from '../types/leave'
import type { Codec } from './codec'

export interface FrappeLeaveApplication {
  name: string
  employee?: string
  leave_type?: string
  from_date?: string
  to_date?: string
  total_leave_days?: number
  status?: string
  description?: string
  posting_date?: string
  half_day?: number
  half_day_date?: string
}

const STATUS_VALUES: LeaveApplicationStatus[] = ['Open', 'Approved', 'Rejected', 'Cancelled']

function decodeStatus(s?: string): LeaveApplicationStatus {
  return (STATUS_VALUES as string[]).includes(s ?? '') ? (s as LeaveApplicationStatus) : 'Open'
}

export const leaveApplicationCodec: Codec<MyLeave, FrappeLeaveApplication> = {
  decode(f) {
    return {
      id: f.name,
      leaveType: f.leave_type || '',
      fromDate: f.from_date || '',
      toDate: f.to_date || '',
      totalDays: typeof f.total_leave_days === 'number' ? f.total_leave_days : 0,
      status: decodeStatus(f.status),
      description: f.description || '',
      postingDate: f.posting_date || '',
      halfDay: f.half_day === 1,
      halfDayDate: f.half_day_date || '',
    }
  },
  encode(m) {
    return {
      name: m.id,
      leave_type: m.leaveType,
      from_date: m.fromDate,
      to_date: m.toDate,
      total_leave_days: m.totalDays,
      status: m.status,
      description: m.description || undefined,
      posting_date: m.postingDate || undefined,
      half_day: m.halfDay ? 1 : 0,
      half_day_date: m.halfDayDate || undefined,
    }
  },
}
