import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, Building2, Briefcase, User, ChevronRight, FileText } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { getPayslipDetail } from '../../services/payslips'
import type { PayslipDetail } from '../../services/payslips'

const _currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
function fmt(val: number): string {
  return _currencyFmt.format(val)
}

function formatDate(date: string): string {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadge(status: string) {
  if (status === 'Submitted') return <Badge variant="green">Submitted</Badge>
  if (status === 'Cancelled') return <Badge variant="red">Cancelled</Badge>
  return <Badge variant="gray">Draft</Badge>
}

interface PayrollTableProps {
  title: string
  rows: Array<{ component: string; amount: number }>
  amountClass: string
  prefix?: string
}

function PayrollTable({ title, rows, amountClass, prefix = '' }: PayrollTableProps) {
  if (rows.length === 0) return null
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-th">Component</th>
              <th className="table-th text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="table-td text-sm text-gray-700">{row.component}</td>
                <td className={`table-td text-sm font-medium text-right ${amountClass}`}>{prefix}{fmt(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div>
      <SkPageHeader />
      <div className="mt-4 space-y-4">
        <Sk className="h-6 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Sk key={`sk-${String(i)}`} className="h-16 rounded-lg" />
          ))}
        </div>
        <Sk className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function MyPayslipDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pageLoading = usePageLoad()
  const [detail, setDetail] = useState<PayslipDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useFetchOnce(() => {
    if (!id) { setLoading(false); return }
    getPayslipDetail(id)
      .then((data) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  })

  if (pageLoading || loading) return <DetailSkeleton />

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Payslip not found.</p>
        <button type="button" onClick={() => navigate('/my-space/payslips')} className="mt-3 text-blue-600 hover:underline text-sm">
          ← Back to Payslips
        </button>
      </div>
    )
  }

  const displayName = detail.employeeName || detail.employee

  return (
    <div className="flex flex-col h-full page-slide-enter">
      <nav className="flex items-center gap-1.5 text-sm mb-4 flex-shrink-0">
        <Link to="/my-space/payslips" className="text-blue-600 hover:text-blue-700 font-medium">
          Payslips
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-600 font-medium truncate max-w-[200px]">{detail.id}</span>
      </nav>

      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{displayName}</h1>
          <p className="text-sm text-gray-500">{detail.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/method/frappe.utils.print_format.download_pdf?doctype=Salary Slip&name=${encodeURIComponent(detail.id)}&format=Standard`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Preview PDF
          </a>
          {statusBadge(detail.status)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employee</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                {displayName}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {detail.department || '—'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Designation</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                {detail.designation || '—'}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Period</span>
              <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(detail.startDate)} – {formatDate(detail.endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Gross Pay</p>
              <p className="text-lg font-bold text-gray-900">{fmt(detail.grossPay)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Total Earnings</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(detail.totalEarning)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Total Deductions</p>
              <p className="text-lg font-bold text-red-500">{fmt(detail.totalDeduction)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Net Pay</p>
              <p className="text-lg font-bold text-blue-600">{fmt(detail.netPay)}</p>
            </div>
          </div>

          <PayrollTable title="Earnings" rows={detail.earnings} amountClass="text-emerald-600" />
          <PayrollTable title="Deductions" rows={detail.deductions} amountClass="text-red-500" prefix="-" />
        </div>
      </div>
    </div>
  )
}
