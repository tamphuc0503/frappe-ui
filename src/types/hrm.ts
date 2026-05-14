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

// ─── Staffing Plan ─────────────────────────────────────────────────────────────
export interface StaffingPlanDetail {
  designation: string
  vacancies: number
  estimatedCostPerPosition: number
  totalEstimatedCost: number
  numberOfPositions: number
}

export interface StaffingPlan {
  id: string
  name: string
  company: string
  department: string
  fromDate: string
  toDate: string
  totalEstimatedBudget: number
  staffingDetails: StaffingPlanDetail[]
  docstatus: number
}

// ─── Recruitment ───────────────────────────────────────────────────────────────
export interface JobOpening {
  id: string
  jobTitle: string
  designation: string
  department: string
  status: JobOpeningStatus
  description: string
  postedOn: string
  closesOn: string
  company: string
}

export type JobOpeningStatus = 'Open' | 'Screening' | 'Ready for Interview' | 'Interviewed' | 'Onboarding' | 'Rejected' | 'Closed'

export interface JobOpeningColumn {
  key: JobOpeningStatus
  label: string
  color: string
  headerColor: string
  jobs: JobOpening[]
}

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

export interface JobApplicant {
  id: string
  applicantName: string
  emailAddress: string
  jobTitle: string
  status: string
  rating: number
  notes: string
  resumeLink: string
  source: string
  createdOn: string
}

export interface InterviewRound {
  id: string
  jobApplicant: string
  applicantName: string
  jobOpening: string
  interviewRound: string
  scheduledDate: string
  fromTime: string
  toTime: string
  status: string
  rating: number
  totalScore: number
  averageRating: number
  result: string
}

export interface KanbanColumn {
  key: string
  label: string
  color: string
  headerColor: string
  candidates: Candidate[]
}
