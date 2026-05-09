import { useState } from 'react'
import { Plus, Download, Eye } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Combobox } from '../../components/ui/Combobox'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import type { PayStatus, PayrollRecord } from '../../types/hrm'

const payrollData: PayrollRecord[] = [
  { id: 1, employee: 'Sarah Johnson', department: 'HR', month: 'April 2026', basicSalary: 7200, allowances: 800, deductions: 540, netPay: 7460, status: 'Paid' },
  { id: 2, employee: 'Marcus Chen', department: 'Technology', month: 'April 2026', basicSalary: 9500, allowances: 1200, deductions: 820, netPay: 9880, status: 'Paid' },
  { id: 3, employee: 'Linda Park', department: 'Operations', month: 'April 2026', basicSalary: 6800, allowances: 600, deductions: 490, netPay: 6910, status: 'Paid' },
  { id: 4, employee: 'Tom Rivera', department: 'Finance', month: 'April 2026', basicSalary: 7800, allowances: 700, deductions: 600, netPay: 7900, status: 'Processing' },
  { id: 5, employee: 'Grace Nwosu', department: 'Sales', month: 'April 2026', basicSalary: 7000, allowances: 1500, deductions: 560, netPay: 7940, status: 'Paid' },
  { id: 6, employee: 'Carlos Mendez', department: 'Operations', month: 'April 2026', basicSalary: 6500, allowances: 500, deductions: 470, netPay: 6530, status: 'Paid' },
  { id: 7, employee: 'Rachel Wong', department: 'Sales', month: 'April 2026', basicSalary: 11000, allowances: 2000, deductions: 980, netPay: 12020, status: 'Processing' },
  { id: 8, employee: 'David Kim', department: 'Technology', month: 'April 2026', basicSalary: 6200, allowances: 400, deductions: 440, netPay: 6160, status: 'Pending' },
]

function fmt(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function statusBadge(status: PayStatus) {
  if (status === 'Paid') return <Badge variant="green">Paid</Badge>
  if (status === 'Processing') return <Badge variant="blue">Processing</Badge>
  return <Badge variant="yellow">Pending</Badge>
}

export function Payrolls() {
  const loading = usePageLoad()
  const [selectedMonth, setSelectedMonth] = useState('April 2026')
  if (loading) return (
    <div>
      <SkPageHeader />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <Sk className="h-3.5 w-24 rounded-md" />
            <Sk className="h-7 w-28 rounded-md" />
          </div>
        ))}
      </div>
      <SkTable rows={8} cols={8} hasToolbar />
    </div>
  )

  const totalNet = payrollData.reduce((acc, r) => acc + r.netPay, 0)
  const totalBasic = payrollData.reduce((acc, r) => acc + r.basicSalary, 0)
  const totalAllowances = payrollData.reduce((acc, r) => acc + r.allowances, 0)
  const totalDeductions = payrollData.reduce((acc, r) => acc + r.deductions, 0)

  return (
    <div>
      <PageHeader
        title="Payrolls"
        subtitle="Manage monthly payroll processing"
        action={
          <div className="flex items-center gap-2">
            <div className="w-44">
              <Combobox
                options={['April 2026', 'March 2026', 'February 2026']}
                value={[selectedMonth]}
                onChange={(vs) => setSelectedMonth(vs[0] ?? 'April 2026')}
                max={1}
                clearable={false}
              />
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Run Payroll
            </button>
          </div>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Basic</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalBasic)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Allowances</p>
          <p className="text-xl font-bold text-emerald-600">{fmt(totalAllowances)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Deductions</p>
          <p className="text-xl font-bold text-red-500">{fmt(totalDeductions)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Net Pay</p>
          <p className="text-xl font-bold text-blue-600">{fmt(totalNet)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Employee</th>
                <th className="table-th">Month</th>
                <th className="table-th">Basic Salary</th>
                <th className="table-th">Allowances</th>
                <th className="table-th">Deductions</th>
                <th className="table-th">Net Pay</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payrollData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <p className="font-medium text-gray-900 text-sm">{row.employee}</p>
                    <p className="text-xs text-gray-400">{row.department}</p>
                  </td>
                  <td className="table-td text-gray-500">{row.month}</td>
                  <td className="table-td font-medium text-gray-900">{fmt(row.basicSalary)}</td>
                  <td className="table-td text-emerald-600">+{fmt(row.allowances)}</td>
                  <td className="table-td text-red-500">-{fmt(row.deductions)}</td>
                  <td className="table-td font-bold text-gray-900">{fmt(row.netPay)}</td>
                  <td className="table-td">{statusBadge(row.status)}</td>
                  <td className="table-td">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View payslip">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
