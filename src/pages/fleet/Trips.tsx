import { useState } from 'react'
import { Plus, Eye, Search, MapPin } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'

type TripStatus = 'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled'

interface Trip {
  id: number
  tripNo: string
  vehicle: string
  driver: string
  origin: string
  destination: string
  distance: string
  startDate: string
  endDate: string
  cargo: string
  status: TripStatus
}

const trips: Trip[] = [
  { id: 1, tripNo: 'T-2048', vehicle: 'FL-031', driver: 'Ahmed Hassan', origin: 'Los Angeles, CA', destination: 'Seattle, WA', distance: '1,135 km', startDate: '2026-05-08', endDate: '2026-05-09', cargo: 'Electronics', status: 'In Progress' },
  { id: 2, tripNo: 'T-2047', vehicle: 'FL-039', driver: 'Sam Adeleke', origin: 'San Francisco, CA', destination: 'Portland, OR', distance: '645 km', startDate: '2026-05-07', endDate: '2026-05-08', cargo: 'Industrial Parts', status: 'Completed' },
  { id: 3, tripNo: 'T-2046', vehicle: 'FL-033', driver: 'Peter Novak', origin: 'Phoenix, AZ', destination: 'Denver, CO', distance: '1,200 km', startDate: '2026-05-06', endDate: '2026-05-07', cargo: 'Auto Components', status: 'Completed' },
  { id: 4, tripNo: 'T-2049', vehicle: 'FL-035', driver: 'Luis Reyes', origin: 'Dallas, TX', destination: 'Houston, TX', distance: '385 km', startDate: '2026-05-09', endDate: '2026-05-09', cargo: 'Food & Beverage', status: 'Scheduled' },
  { id: 5, tripNo: 'T-2050', vehicle: 'FL-037', driver: 'Kevin Bright', origin: 'Chicago, IL', destination: 'Detroit, MI', distance: '451 km', startDate: '2026-05-10', endDate: '2026-05-10', cargo: 'Machinery', status: 'Scheduled' },
  { id: 6, tripNo: 'T-2045', vehicle: 'FL-032', driver: 'Jamal Osei', origin: 'Miami, FL', destination: 'Atlanta, GA', distance: '1,090 km', startDate: '2026-05-05', endDate: '2026-05-06', cargo: 'Textiles', status: 'Completed' },
  { id: 7, tripNo: 'T-2044', vehicle: 'FL-042', driver: 'Dmitri Volkov', origin: 'New York, NY', destination: 'Boston, MA', distance: '346 km', startDate: '2026-05-04', endDate: '2026-05-04', cargo: 'Pharmaceuticals', status: 'Cancelled' },
  { id: 8, tripNo: 'T-2051', vehicle: 'FL-031', driver: 'Ahmed Hassan', origin: 'Seattle, WA', destination: 'Las Vegas, NV', distance: '2,100 km', startDate: '2026-05-11', endDate: '2026-05-13', cargo: 'Consumer Goods', status: 'Scheduled' },
]

function statusBadge(s: TripStatus) {
  if (s === 'Completed') return <Badge variant="green">Completed</Badge>
  if (s === 'In Progress') return <Badge variant="blue">In Progress</Badge>
  if (s === 'Scheduled') return <Badge variant="yellow">Scheduled</Badge>
  return <Badge variant="red">Cancelled</Badge>
}

export function Trips() {
  const loading = usePageLoad()
  const [search, setSearch] = useState('')
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={8} hasToolbar /></>

  const filtered = trips.filter(
    (t) =>
      t.tripNo.toLowerCase().includes(search.toLowerCase()) ||
      t.driver.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      t.origin.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Trips"
        subtitle={`${trips.length} recorded trips`}
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Plan Trip
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Trip No.</th>
                <th className="table-th">Vehicle / Driver</th>
                <th className="table-th">Route</th>
                <th className="table-th">Distance</th>
                <th className="table-th">Cargo</th>
                <th className="table-th">Start Date</th>
                <th className="table-th">End Date</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td font-mono font-semibold text-blue-700 text-sm">{t.tripNo}</td>
                  <td className="table-td">
                    <p className="font-medium text-gray-900 text-sm">{t.driver}</p>
                    <p className="text-xs text-gray-400 font-mono">{t.vehicle}</p>
                  </td>
                  <td className="table-td">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span>{t.origin}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>{t.destination}</span>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-gray-600 text-xs font-medium">{t.distance}</td>
                  <td className="table-td text-gray-600 text-xs">{t.cargo}</td>
                  <td className="table-td text-gray-500 text-xs">{t.startDate}</td>
                  <td className="table-td text-gray-500 text-xs">{t.endDate}</td>
                  <td className="table-td">{statusBadge(t.status)}</td>
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
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No trips match your search.</div>
        )}
      </div>
    </div>
  )
}
