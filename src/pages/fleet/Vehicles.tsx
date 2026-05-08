import { useState } from 'react'
import { Plus, Eye, Pencil, Search } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'

type VehicleStatus = 'Active' | 'Maintenance' | 'Idle' | 'Retired'

interface Vehicle {
  id: number
  plateNo: string
  make: string
  model: string
  year: number
  type: string
  driver: string
  status: VehicleStatus
  lastService: string
  mileage: string
}

const vehicles: Vehicle[] = [
  { id: 1, plateNo: 'FL-031', make: 'Volvo', model: 'FH16', year: 2022, type: 'Heavy Truck', driver: 'Ahmed Hassan', status: 'Active', lastService: '2026-04-01', mileage: '142,500 km' },
  { id: 2, plateNo: 'FL-032', make: 'Mercedes', model: 'Actros 1845', year: 2021, type: 'Heavy Truck', driver: 'Jamal Osei', status: 'Active', lastService: '2026-03-15', mileage: '198,200 km' },
  { id: 3, plateNo: 'FL-033', make: 'MAN', model: 'TGX 26.500', year: 2023, type: 'Heavy Truck', driver: 'Peter Novak', status: 'Active', lastService: '2026-04-20', mileage: '87,000 km' },
  { id: 4, plateNo: 'FL-034', make: 'Scania', model: 'R 650', year: 2020, type: 'Heavy Truck', driver: 'Unassigned', status: 'Maintenance', lastService: '2026-05-02', mileage: '265,000 km' },
  { id: 5, plateNo: 'FL-035', make: 'DAF', model: 'XF 480', year: 2022, type: 'Semi Truck', driver: 'Luis Reyes', status: 'Active', lastService: '2026-03-28', mileage: '113,400 km' },
  { id: 6, plateNo: 'FL-036', make: 'Iveco', model: 'Stralis 460', year: 2019, type: 'Semi Truck', driver: 'Unassigned', status: 'Idle', lastService: '2026-02-10', mileage: '312,700 km' },
  { id: 7, plateNo: 'FL-037', make: 'Renault', model: 'T 520', year: 2023, type: 'Semi Truck', driver: 'Kevin Bright', status: 'Active', lastService: '2026-04-12', mileage: '54,200 km' },
  { id: 8, plateNo: 'FL-038', make: 'Ford', model: 'Transit 350', year: 2018, type: 'Van', driver: 'Unassigned', status: 'Retired', lastService: '2025-11-01', mileage: '480,000 km' },
  { id: 9, plateNo: 'FL-039', make: 'Volvo', model: 'FH 500', year: 2021, type: 'Heavy Truck', driver: 'Sam Adeleke', status: 'Active', lastService: '2026-04-05', mileage: '176,800 km' },
  { id: 10, plateNo: 'FL-042', make: 'MAN', model: 'TGX 18.440', year: 2020, type: 'Heavy Truck', driver: 'Dmitri Volkov', status: 'Maintenance', lastService: '2026-05-05', mileage: '234,100 km' },
]

function statusBadge(s: VehicleStatus) {
  if (s === 'Active') return <Badge variant="green">Active</Badge>
  if (s === 'Maintenance') return <Badge variant="yellow">Maintenance</Badge>
  if (s === 'Idle') return <Badge variant="blue">Idle</Badge>
  return <Badge variant="red">Retired</Badge>
}

export function Vehicles() {
  const loading = usePageLoad()
  const [search, setSearch] = useState('')
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={8} hasToolbar /></>

  const filtered = vehicles.filter(
    (v) =>
      v.plateNo.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.driver.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle={`${vehicles.length} registered vehicles`}
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vehicles..."
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
                <th className="table-th">Plate No.</th>
                <th className="table-th">Make / Model</th>
                <th className="table-th">Year</th>
                <th className="table-th">Type</th>
                <th className="table-th">Assigned Driver</th>
                <th className="table-th">Mileage</th>
                <th className="table-th">Last Service</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td font-mono font-semibold text-blue-700 text-sm">{v.plateNo}</td>
                  <td className="table-td font-medium text-gray-900">{v.make} {v.model}</td>
                  <td className="table-td text-gray-500">{v.year}</td>
                  <td className="table-td text-gray-500">{v.type}</td>
                  <td className="table-td">
                    {v.driver === 'Unassigned' ? (
                      <span className="text-gray-400 italic text-xs">Unassigned</span>
                    ) : (
                      <span className="text-gray-700 text-sm">{v.driver}</span>
                    )}
                  </td>
                  <td className="table-td text-gray-500 text-xs">{v.mileage}</td>
                  <td className="table-td text-gray-500 text-xs">{v.lastService}</td>
                  <td className="table-td">{statusBadge(v.status)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No vehicles match your search.</div>
        )}
      </div>
    </div>
  )
}
