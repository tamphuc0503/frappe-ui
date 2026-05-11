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
