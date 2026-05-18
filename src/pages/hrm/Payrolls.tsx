import { useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getAllPayslips } from '../../services/payslips'
import type { Payslip } from '../../types/payslip'

function fmt(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function statusBadge(status: string) {
  if (status === 'Submitted') return <Badge variant="green">Submitted</Badge>
  if (status === 'Cancelled') return <Badge variant="red">Cancelled</Badge>
  return <Badge variant="gray">Draft</Badge>
}

function formatPeriod(start: string, end: string): string {
  if (!start && !end) return '—'
  const s = start ? new Date(start) : null
  const e = end ? new Date(end) : null
  if (s && e && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  return `${start} → ${end}`
}

function currentMonthBounds(): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

interface PayslipRow extends Payslip {
  employeeName?: string
  department?: string
}

export function Payrolls() {
  const pageLoading = usePageLoad()
  const navigate = useNavigate()
  const [payslips, setPayslips] = useState<PayslipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(showRefresh: boolean) {
    if (showRefresh) setRefreshing(true)
    try {
      const data = await getAllPayslips(currentMonthBounds())
      setPayslips(data as PayslipRow[])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(false) })

  if (pageLoading || loading) return (
    <div>
      <SkPageHeader />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-${String(i)}`} className="card p-4 space-y-2">
            <Sk className="h-3.5 w-24 rounded-md" />
            <Sk className="h-7 w-28 rounded-md" />
          </div>
        ))}
      </div>
      <SkTable rows={8} cols={6} hasToolbar />
    </div>
  )

  const totalGross = payslips.reduce((acc, r) => acc + r.grossPay, 0)
  const totalDeductions = payslips.reduce((acc, r) => acc + r.totalDeduction, 0)
  const totalNet = payslips.reduce((acc, r) => acc + r.netPay, 0)

  const now = new Date()
  const yearLabel = String(now.getFullYear())

  return (
    <div>
      <PageHeader
        title="Payrolls"
        subtitle={`Salary slips for ${yearLabel}`}
        action={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Gross Pay</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalGross)}</p>
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

      {payslips.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-500 font-medium">No salary slips found for {yearLabel}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Employee</th>
                  <th className="table-th">Period</th>
                  <th className="table-th">Gross Pay</th>
                  <th className="table-th">Deductions</th>
                  <th className="table-th">Net Pay</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payslips.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-gray-900 text-sm">{row.employeeName || row.employee}</p>
                      {row.department && <p className="text-xs text-gray-400">{row.department}</p>}
                    </td>
                    <td className="table-td text-gray-500 text-sm">{formatPeriod(row.startDate, row.endDate)}</td>
                    <td className="table-td font-medium text-gray-900">{fmt(row.grossPay)}</td>
                    <td className="table-td text-red-500">-{fmt(row.totalDeduction)}</td>
                    <td className="table-td font-bold text-gray-900">{fmt(row.netPay)}</td>
                    <td className="table-td">{statusBadge(row.status)}</td>
                    <td className="table-td">
                      <button
                        type="button"
                        onClick={() => navigate(`/hrm/payrolls/${encodeURIComponent(row.id)}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View payslip"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}