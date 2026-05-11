import { useState } from 'react'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { Combobox } from '../../components/ui/Combobox'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'
import { getMyPayslips } from '../../services/payslips'
import type { Payslip, PayslipStatus } from '../../types/payslip'

type RangeKey = 'this-year' | 'last-year' | 'custom'

const STATUS_VARIANT: Record<PayslipStatus, 'gray' | 'green' | 'red'> = {
  Draft: 'gray',
  Submitted: 'green',
  Cancelled: 'red',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPeriod(start: string, end: string): string {
  if (!start && !end) return '—'
  const s = start ? new Date(start) : null
  const e = end ? new Date(end) : null
  if (s && e && !isNaN(s.getTime()) && !isNaN(e.getTime()) && s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  return `${formatDate(start)} → ${formatDate(end)}`
}

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function yearBounds(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export function Payslips() {
  const pageLoading = usePageLoad()
  const currentYear = new Date().getFullYear()

  const [rangeKey, setRangeKey] = useState<RangeKey>('this-year')
  const [customYear, setCustomYear] = useState<number>(currentYear)
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeYear =
    rangeKey === 'this-year' ? currentYear : rangeKey === 'last-year' ? currentYear - 1 : customYear

  async function load(year: number, showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    setError(null)
    try {
      const data = await getMyPayslips(yearBounds(year))
      setPayslips(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payslips.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFetchOnce(() => { void load(activeYear, false) }, String(activeYear))

  const yearOptions: { value: string; label: string }[] = []
  for (let y = currentYear; y >= currentYear - 10; y--) {
    yearOptions.push({ value: String(y), label: String(y) })
  }

  const filterBar = (
    <div className="card p-3 mb-4 flex items-center gap-2 flex-wrap">
      <RangePill active={rangeKey === 'this-year'} onClick={() => setRangeKey('this-year')}>
        This Year
      </RangePill>
      <RangePill active={rangeKey === 'last-year'} onClick={() => setRangeKey('last-year')}>
        Last Year
      </RangePill>
      <RangePill active={rangeKey === 'custom'} onClick={() => setRangeKey('custom')}>
        Custom Year
      </RangePill>
      {rangeKey === 'custom' && (
        <div className="min-w-[140px] ml-1">
          <Combobox
            options={yearOptions}
            value={[String(customYear)]}
            onChange={(vs) => {
              const n = Number(vs[0])
              if (!isNaN(n)) setCustomYear(n)
            }}
            max={1}
            clearable={false}
            placeholder="Pick a year"
            size="sm"
          />
        </div>
      )}
      <span className="ml-auto text-xs text-gray-500">
        Showing payslips for <span className="font-semibold text-gray-700">{activeYear}</span>
      </span>
      <button
        type="button"
        onClick={() => void load(activeYear, true)}
        disabled={refreshing}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh"
        aria-label="Refresh payslips"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )

  if (pageLoading || loading) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <SkPageHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          {filterBar}
          <SkTable rows={6} cols={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="My Payslips"
        subtitle={`${payslips.length} payslip${payslips.length === 1 ? '' : 's'} in ${activeYear}`}
      />

      <div className="flex-1 overflow-y-auto min-h-0">
        {filterBar}

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {payslips.length === 0 ? (
          <div className="card p-12 text-center text-gray-400 text-sm">
            <p>No payslips found for {activeYear}.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="table-th">Period</th>
                    <th className="table-th">Posted</th>
                    <th className="table-th text-right">Gross</th>
                    <th className="table-th text-right">Deductions</th>
                    <th className="table-th text-right">Net</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payslips.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td">
                        <div className="font-medium text-gray-900">{formatPeriod(p.startDate, p.endDate)}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[260px]">{p.id}</div>
                      </td>
                      <td className="table-td text-sm text-gray-700">{formatDate(p.postingDate)}</td>
                      <td className="table-td text-sm text-gray-900 text-right tabular-nums">{formatCurrency(p.grossPay)}</td>
                      <td className="table-td text-sm text-red-600 text-right tabular-nums">−{formatCurrency(p.totalDeduction)}</td>
                      <td className="table-td text-sm font-semibold text-gray-900 text-right tabular-nums">{formatCurrency(p.netPay)}</td>
                      <td className="table-td">
                        <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface RangePillProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function RangePill({ active, onClick, children }: RangePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
