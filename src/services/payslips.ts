import { http, FRAPPE_BASE } from './http'
import { getMyEmployeeId } from './hrm'
import type { Payslip } from '../types/payslip'
import { salarySlipCodec, type FrappeSalarySlip } from '../transformers/salarySlip'

interface GetListResponse<T> {
  message?: T[]
  exc?: string
}

export interface PayslipRange {
  from?: string
  to?: string
}

export async function getMyPayslips(range: PayslipRange = {}): Promise<Payslip[]> {
  const empId = await getMyEmployeeId()
  if (!empId) return []
  const filters: unknown[] = [['employee', '=', empId]]
  if (range.from) filters.push(['start_date', '>=', range.from])
  if (range.to) filters.push(['end_date', '<=', range.to])
  const params = new URLSearchParams({
    doctype: 'Salary Slip',
    fields: JSON.stringify([
      'name',
      'employee',
      'start_date',
      'end_date',
      'posting_date',
      'gross_pay',
      'net_pay',
      'total_deduction',
      'status',
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: '0',
    order_by: 'start_date desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeSalarySlip>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch payslips.')
  }
  return (data.message ?? []).map(salarySlipCodec.decode)
}

export async function getAllPayslips(range: PayslipRange = {}): Promise<Payslip[]> {
  const filters: unknown[] = []
  if (range.from) filters.push(['start_date', '>=', range.from])
  if (range.to) filters.push(['end_date', '<=', range.to])
  const params = new URLSearchParams({
    doctype: 'Salary Slip',
    fields: JSON.stringify([
      'name',
      'employee',
      'employee_name',
      'department',
      'start_date',
      'end_date',
      'posting_date',
      'gross_pay',
      'net_pay',
      'total_deduction',
      'status',
    ]),
    filters: JSON.stringify(filters),
    limit_page_length: '0',
    order_by: 'start_date desc',
  })
  const res = await http(`${FRAPPE_BASE}/api/method/frappe.client.get_list?${params}`)
  const data = (await res.json()) as GetListResponse<FrappeSalarySlip & { employee_name?: string; department?: string }>
  if (!res.ok || data.exc) {
    throw new Error(data.exc ?? 'Failed to fetch payslips.')
  }
  return (data.message ?? []).map((f) => ({
    ...salarySlipCodec.decode(f),
    employeeName: f.employee_name || '',
    department: f.department || '',
  }))
}

export interface PayslipDetail extends Payslip {
  employeeName: string
  department: string
  designation: string
  earnings: { component: string; amount: number }[]
  deductions: { component: string; amount: number }[]
  totalEarning: number
}

export async function getPayslipDetail(id: string): Promise<PayslipDetail | null> {
  const res = await http(`${FRAPPE_BASE}/api/resource/Salary Slip/${encodeURIComponent(id)}`)
  if (!res.ok) return null
  const data = (await res.json()) as { data?: Record<string, unknown> }
  const d = data.data as Record<string, unknown> | undefined
  if (!d) return null
  return {
    id: (d.name as string) || '',
    employee: (d.employee as string) || '',
    employeeName: (d.employee_name as string) || '',
    department: (d.department as string) || '',
    designation: (d.designation as string) || '',
    startDate: (d.start_date as string) || '',
    endDate: (d.end_date as string) || '',
    postingDate: (d.posting_date as string) || '',
    grossPay: (d.gross_pay as number) || 0,
    netPay: (d.net_pay as number) || 0,
    totalDeduction: (d.total_deduction as number) || 0,
    totalEarning: (d.total_earning as number) || 0,
    status: (['Draft', 'Submitted', 'Cancelled'].includes(d.status as string) ? d.status : 'Draft') as Payslip['status'],
    earnings: ((d.earnings as { salary_component?: string; amount?: number }[]) || []).map((e) => ({
      component: e.salary_component || '',
      amount: e.amount || 0,
    })),
    deductions: ((d.deductions as { salary_component?: string; amount?: number }[]) || []).map((e) => ({
      component: e.salary_component || '',
      amount: e.amount || 0,
    })),
  }
}
