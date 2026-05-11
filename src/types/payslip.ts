export type PayslipStatus = 'Draft' | 'Submitted' | 'Cancelled'

export interface Payslip {
  id: string
  employee: string
  startDate: string
  endDate: string
  postingDate: string
  grossPay: number
  netPay: number
  totalDeduction: number
  status: PayslipStatus
}
