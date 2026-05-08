import { useState } from 'react'
import { Plus, Eye, TrendingUp, DollarSign } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'

type DealStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'

interface Deal {
  id: number
  name: string
  contact: string
  company: string
  value: number
  stage: DealStage
  probability: number
  closeDate: string
  owner: string
}

const deals: Deal[] = [
  { id: 1, name: 'Horizon Shipping Annual Contract', contact: 'Angela Brooks', company: 'Horizon Shipping Co.', value: 480000, stage: 'Negotiation', probability: 75, closeDate: '2026-06-15', owner: 'Rachel Wong' },
  { id: 2, name: 'Pacific Rim Pilot Program', contact: 'Michael Torres', company: 'Pacific Rim Cargo', value: 120000, stage: 'Proposal', probability: 50, closeDate: '2026-07-01', owner: 'Rachel Wong' },
  { id: 3, name: 'TransAsia Freight Partnership', contact: 'Fiona Chen', company: 'TransAsia Freight', value: 890000, stage: 'Closed Won', probability: 100, closeDate: '2026-04-30', owner: 'James Okafor' },
  { id: 4, name: 'Gulf Coast Express Route Deal', contact: 'Robert Nguyen', company: 'Gulf Coast Express', value: 250000, stage: 'Qualified', probability: 35, closeDate: '2026-08-20', owner: 'Rachel Wong' },
  { id: 5, name: 'Euro Cargo Solutions Contract', contact: 'Diana Walsh', company: 'Euro Cargo Solutions', value: 340000, stage: 'Lead', probability: 20, closeDate: '2026-09-10', owner: 'Tom Rivera' },
  { id: 6, name: 'Middle East Transport Expansion', contact: 'Hassan Ibrahim', company: 'Middle East Transport', value: 650000, stage: 'Proposal', probability: 55, closeDate: '2026-07-30', owner: 'James Okafor' },
  { id: 7, name: 'Americas Freight Hub Pilot', contact: 'Carlos Ruiz', company: 'Americas Freight Hub', value: 180000, stage: 'Lead', probability: 25, closeDate: '2026-10-01', owner: 'Tom Rivera' },
  { id: 8, name: 'SkyPort Cargo Partnership', contact: 'Yuki Tanaka', company: 'SkyPort Logistics', value: 420000, stage: 'Closed Lost', probability: 0, closeDate: '2026-03-15', owner: 'Rachel Wong' },
  { id: 9, name: 'Northern Route Contract', contact: 'Kevin Bright', company: 'NorthStar Shipping', value: 310000, stage: 'Negotiation', probability: 80, closeDate: '2026-06-01', owner: 'James Okafor' },
]

function stageBadge(s: DealStage) {
  const map: Record<DealStage, 'gray' | 'blue' | 'yellow' | 'purple' | 'green' | 'red'> = {
    Lead: 'gray',
    Qualified: 'blue',
    Proposal: 'yellow',
    Negotiation: 'purple',
    'Closed Won': 'green',
    'Closed Lost': 'red',
  }
  return <Badge variant={map[s]}>{s}</Badge>
}

function fmt(val: number): string {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function Deals() {
  const loading = usePageLoad()
  const [stageFilter, setStageFilter] = useState<'All' | DealStage>('All')
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={7} hasToolbar /></>

  const displayed = stageFilter === 'All' ? deals : deals.filter((d) => d.stage === stageFilter)
  const totalValue = displayed.reduce((acc, d) => acc + d.value, 0)
  const weightedValue = displayed.reduce((acc, d) => acc + (d.value * d.probability) / 100, 0)

  const stages: Array<'All' | DealStage> = ['All', 'Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

  return (
    <div>
      <PageHeader
        title="Deals"
        subtitle="Manage your sales pipeline"
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Deal
          </button>
        }
      />

      {/* Pipeline value summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Pipeline Value</p>
            <p className="text-xl font-bold text-gray-900">{fmt(totalValue)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Weighted Value</p>
            <p className="text-xl font-bold text-emerald-600">{fmt(weightedValue)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-purple-600 font-bold text-sm">#</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Deals</p>
            <p className="text-xl font-bold text-gray-900">{displayed.length}</p>
          </div>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1">
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              stageFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Deal Name</th>
                <th className="table-th">Contact / Company</th>
                <th className="table-th">Value</th>
                <th className="table-th">Stage</th>
                <th className="table-th">Probability</th>
                <th className="table-th">Close Date</th>
                <th className="table-th">Owner</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td font-medium text-gray-900 text-sm max-w-[200px]">
                    <p className="truncate">{d.name}</p>
                  </td>
                  <td className="table-td">
                    <p className="text-sm text-gray-700">{d.contact}</p>
                    <p className="text-xs text-gray-400">{d.company}</p>
                  </td>
                  <td className="table-td font-semibold text-gray-900">{fmt(d.value)}</td>
                  <td className="table-td">{stageBadge(d.stage)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-[60px]">
                        <div
                          className={`h-1.5 rounded-full ${
                            d.probability >= 75
                              ? 'bg-emerald-500'
                              : d.probability >= 40
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${d.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{d.probability}%</span>
                    </div>
                  </td>
                  <td className="table-td text-gray-500 text-xs">{d.closeDate}</td>
                  <td className="table-td text-sm text-gray-600">{d.owner}</td>
                  <td className="table-td">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayed.length === 0 && (
          <div className="text-center py-12 text-gray-400">No deals in this stage.</div>
        )}
      </div>
    </div>
  )
}
