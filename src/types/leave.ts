export type LeaveApplicationStatus = 'Open' | 'Approved' | 'Rejected' | 'Cancelled'

export interface MyLeave {
  id: string
  leaveType: string
  fromDate: string
  toDate: string
  totalDays: number
  status: LeaveApplicationStatus
  description: string
  postingDate: string
  halfDay: boolean
  halfDayDate: string
}

export interface LeaveBalance {
  leaveType: string
  allocation: number
  used: number
  balance: number
  isLwp: boolean
}

export interface LeaveSummary {
  balances: LeaveBalance[]
  totalAvailable: number
  totalUnpaidUsed: number
}

export interface Holiday {
  date: string
  description: string
  weeklyOff: boolean
}

export type LeaveDayType = 'full' | 'half' | 'custom'

export interface LeaveDay {
  type: LeaveDayType
  fromTime: string
  endTime: string
}

export interface LeaveRequestPayload {
  leaveType: string
  days: { date: string; day: LeaveDay }[]
}
