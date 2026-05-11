import type { Payslip, PayslipStatus } from '../types/payslip'
import type { Codec } from './codec'

export interface FrappeSalarySlip {
  name: string
  employee?: string
  start_date?: string
  end_date?: string
  posting_date?: string
  gross_pay?: number
  net_pay?: number
  total_deduction?: number
  status?: string
}

const STATUS_VALUES: PayslipStatus[] = ['Draft', 'Submitted', 'Cancelled']

function decodeStatus(s?: string): PayslipStatus {
  return (STATUS_VALUES as string[]).includes(s ?? '') ? (s as PayslipStatus) : 'Draft'
}

export const salarySlipCodec: Codec<Payslip, FrappeSalarySlip> = {
  decode(f) {
    return {
      id: f.name,
      employee: f.employee || '',
      startDate: f.start_date || '',
      endDate: f.end_date || '',
      postingDate: f.posting_date || '',
      grossPay: f.gross_pay || 0,
      netPay: f.net_pay || 0,
      totalDeduction: f.total_deduction || 0,
      status: decodeStatus(f.status),
    }
  },
  encode(p) {
    return {
      name: p.id,
      employee: p.employee,
      start_date: p.startDate,
      end_date: p.endDate,
      posting_date: p.postingDate,
      gross_pay: p.grossPay,
      net_pay: p.netPay,
      total_deduction: p.totalDeduction,
      status: p.status,
    }
  },
}
