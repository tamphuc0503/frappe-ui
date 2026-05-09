import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Users, Truck, DollarSign, BarChart3 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Combobox } from '../../components/ui/Combobox'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkStatCards, SkBarChart, SkTable } from '../../components/ui/Skeleton'

const monthlyRevenue = [
  { month: 'Jan', revenue: 320000, deals: 4 },
  { month: 'Feb', revenue: 285000, deals: 3 },
  { month: 'Mar', revenue: 410000, deals: 5 },
  { month: 'Apr', revenue: 375000, deals: 4 },
  { month: 'May', revenue: 490000, deals: 6 },
  { month: 'Jun', revenue: 0, deals: 0 },
  { month: 'Jul', revenue: 0, deals: 0 },
  { month: 'Aug', revenue: 0, deals: 0 },
  { month: 'Sep', revenue: 0, deals: 0 },
  { month: 'Oct', revenue: 0, deals: 0 },
  { month: 'Nov', revenue: 0, deals: 0 },
  { month: 'Dec', revenue: 0, deals: 0 },
]

const topDeals = [
  { name: 'TransAsia Freight Partnership', value: 890000, stage: 'Closed Won', contact: 'Fiona Chen' },
  { name: 'Horizon Shipping Annual Contract', value: 480000, stage: 'Negotiation', contact: 'Angela Brooks' },
  { name: 'Northern Route Contract', value: 310000, stage: 'Negotiation', contact: 'Kevin Bright' },
  { name: 'Gulf Coast Express Route Deal', value: 250000, stage: 'Qualified', contact: 'Robert Nguyen' },
  { name: 'Pacific Rim Pilot Program', value: 120000, stage: 'Proposal', contact: 'Michael Torres' },
]

const kpis = [
  { label: 'Total Revenue YTD', value: '$1.88M', change: '+23%', direction: 'up' as const, icon: <DollarSign className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
  { label: 'Deals Closed', value: '22', change: '+4', direction: 'up' as const, icon: <BarChart3 className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' },
  { label: 'Active Contacts', value: '8', change: '+2', direction: 'up' as const, icon: <Users className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
  { label: 'Avg. Deal Size', value: '$85.4K', change: '-3%', direction: 'down' as const, icon: <Truck className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' },
]

function fmt(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
  return `$${val}`
}

export function Reports() {
  const loading = usePageLoad()
  const [period, setPeriod] = useState('2026')
  if (loading) return (
    <div>
      <SkPageHeader />
      <SkStatCards count={4} />
      <SkBarChart />
      <SkTable rows={6} cols={5} />
    </div>
  )
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue))

  return (
    <div>
      <PageHeader
        title="CRM Reports"
        subtitle="Sales performance and pipeline analytics"
        action={
          <div className="flex items-center gap-2">
            <div className="w-32">
              <Combobox
                options={['2026', '2025']}
                value={[period]}
                onChange={(vs) => setPeriod(vs[0] ?? '2026')}
                max={1}
                clearable={false}
              />
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${kpi.bg} rounded-xl p-2.5 flex-shrink-0`}>{kpi.icon}</div>
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {kpi.direction === 'up' ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={`text-xs font-medium ${kpi.direction === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {kpi.change}
              </span>
              <span className="text-xs text-gray-400">vs last year</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        {/* Revenue chart */}
        <div className="lg:col-span-3 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Monthly Revenue</h2>
              <p className="text-xs text-gray-400 mt-0.5">Jan–Dec {period}</p>
            </div>
          </div>
          <div className="h-48 flex items-end justify-around gap-1.5 px-2">
            {monthlyRevenue.map((m) => {
              const hasData = m.revenue > 0
              const barHeight = hasData ? Math.max((m.revenue / maxRevenue) * 100, 5) : 0
              return (
                <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: '160px' }}>
                    {hasData ? (
                      <div
                        className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-sm transition-colors cursor-pointer"
                        style={{ height: `${barHeight}%` }}
                        title={`${m.month}: ${fmt(m.revenue)}`}
                      />
                    ) : (
                      <div className="w-full bg-gray-100 rounded-t-sm" style={{ height: '4px' }} />
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{m.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top deals */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Deals</h2>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</button>
          </div>
          <div className="space-y-3">
            {topDeals.map((deal, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{deal.name}</p>
                  <p className="text-xs text-gray-400">{deal.contact}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(deal.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage distribution */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Deal Stage Distribution</h2>
        <div className="space-y-3">
          {[
            { stage: 'Lead', count: 2, value: 520000, color: 'bg-gray-400' },
            { stage: 'Qualified', count: 1, value: 250000, color: 'bg-blue-400' },
            { stage: 'Proposal', count: 2, value: 460000, color: 'bg-amber-400' },
            { stage: 'Negotiation', count: 2, value: 790000, color: 'bg-purple-500' },
            { stage: 'Closed Won', count: 1, value: 890000, color: 'bg-emerald-500' },
            { stage: 'Closed Lost', count: 1, value: 420000, color: 'bg-red-400' },
          ].map((row) => {
            const pct = (row.value / 3330000) * 100
            return (
              <div key={row.stage} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-24 flex-shrink-0">{row.stage}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${row.color} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className="text-xs text-gray-400 w-6">{row.count}</span>
                  <span className="text-sm font-medium text-gray-700 w-16">{fmt(row.value)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
