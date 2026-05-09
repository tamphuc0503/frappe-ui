// ─── Employee ──────────────────────────────────────────────────────────────────
export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave' | 'Onboarding'

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  gender: string
  dateOfBirth: string
  status: EmployeeStatus
  joinDate: string
  avatarInitials: string
  avatarBg: string
}

// ─── Leave ─────────────────────────────────────────────────────────────────────
export type LeaveStatus = 'Approved' | 'Pending' | 'Rejected'
export type LeaveType = 'Annual Leave' | 'Sick Leave' | 'Maternity Leave' | 'Emergency Leave' | 'Unpaid Leave'

export interface LeaveRequest {
  id: number
  employee: string
  department: string
  type: LeaveType
  from: string
  to: string
  days: number
  status: LeaveStatus
  reason: string
}

// ─── Payroll ───────────────────────────────────────────────────────────────────
export type PayStatus = 'Paid' | 'Processing' | 'Pending'

export interface PayrollRecord {
  id: number
  employee: string
  department: string
  month: string
  basicSalary: number
  allowances: number
  deductions: number
  netPay: number
  status: PayStatus
}

// ─── Attendance ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day'

export interface AttendanceRecord {
  id: number
  employee: string
  department: string
  date: string
  checkIn: string
  checkOut: string
  hours: number
  status: AttendanceStatus
}

// ─── Recruitment ───────────────────────────────────────────────────────────────
export interface Candidate {
  id: number
  name: string
  role: string
  email: string
  experience: string
  appliedDate: string
  avatarInitials: string
  avatarBg: string
  score?: number
}

export interface KanbanColumn {
  key: string
  label: string
  color: string
  headerColor: string
  candidates: Candidate[]
}

// ─── Clock In/Out ──────────────────────────────────────────────────────────────
export interface ClockRecord {
  date: string         // YYYY-MM-DD
  clockIn: string | null   // HH:MM
  clockOut: string | null  // HH:MM
}
