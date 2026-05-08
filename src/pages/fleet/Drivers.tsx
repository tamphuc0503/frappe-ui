import { useState } from 'react'
import { Plus, Eye, Search, Phone, Mail } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'

type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'

interface Driver {
  id: number
  name: string
  license: string
  licenseExpiry: string
  phone: string
  email: string
  assignedVehicle: string
  status: DriverStatus
  totalTrips: number
  rating: number
  avatarInitials: string
  avatarBg: string
}

const drivers: Driver[] = [
  { id: 1, name: 'Ahmed Hassan', license: 'DL-2019-48231', licenseExpiry: '2027-08-15', phone: '+1 (555) 102-3344', email: 'a.hassan@oceanfleet.com', assignedVehicle: 'FL-031', status: 'On Trip', totalTrips: 312, rating: 4.9, avatarInitials: 'AH', avatarBg: 'bg-blue-600' },
  { id: 2, name: 'Jamal Osei', license: 'DL-2020-51102', licenseExpiry: '2026-12-30', phone: '+1 (555) 203-4455', email: 'j.osei@oceanfleet.com', assignedVehicle: 'FL-032', status: 'Available', totalTrips: 287, rating: 4.7, avatarInitials: 'JO', avatarBg: 'bg-emerald-600' },
  { id: 3, name: 'Peter Novak', license: 'DL-2018-30021', licenseExpiry: '2028-03-10', phone: '+1 (555) 304-5566', email: 'p.novak@oceanfleet.com', assignedVehicle: 'FL-033', status: 'On Trip', totalTrips: 425, rating: 4.8, avatarInitials: 'PN', avatarBg: 'bg-purple-600' },
  { id: 4, name: 'Luis Reyes', license: 'DL-2021-62341', licenseExpiry: '2027-06-22', phone: '+1 (555) 405-6677', email: 'l.reyes@oceanfleet.com', assignedVehicle: 'FL-035', status: 'Available', totalTrips: 198, rating: 4.6, avatarInitials: 'LR', avatarBg: 'bg-amber-600' },
  { id: 5, name: 'Kevin Bright', license: 'DL-2022-70033', licenseExpiry: '2028-11-05', phone: '+1 (555) 506-7788', email: 'k.bright@oceanfleet.com', assignedVehicle: 'FL-037', status: 'On Trip', totalTrips: 145, rating: 4.5, avatarInitials: 'KB', avatarBg: 'bg-teal-600' },
  { id: 6, name: 'Sam Adeleke', license: 'DL-2019-41209', licenseExpiry: '2026-09-18', phone: '+1 (555) 607-8899', email: 's.adeleke@oceanfleet.com', assignedVehicle: 'FL-039', status: 'Off Duty', totalTrips: 356, rating: 4.8, avatarInitials: 'SA', avatarBg: 'bg-indigo-600' },
  { id: 7, name: 'Dmitri Volkov', license: 'DL-2017-28812', licenseExpiry: '2027-02-28', phone: '+1 (555) 708-9900', email: 'd.volkov@oceanfleet.com', assignedVehicle: 'FL-042', status: 'Off Duty', totalTrips: 501, rating: 4.7, avatarInitials: 'DV', avatarBg: 'bg-red-600' },
  { id: 8, name: 'Marco Ferretti', license: 'DL-2020-55789', licenseExpiry: '2025-12-01', phone: '+1 (555) 809-0011', email: 'm.ferretti@oceanfleet.com', assignedVehicle: 'Unassigned', status: 'Suspended', totalTrips: 89, rating: 3.2, avatarInitials: 'MF', avatarBg: 'bg-gray-500' },
]

function statusBadge(s: DriverStatus) {
  if (s === 'Available') return <Badge variant="green">Available</Badge>
  if (s === 'On Trip') return <Badge variant="blue">On Trip</Badge>
  if (s === 'Off Duty') return <Badge variant="gray">Off Duty</Badge>
  return <Badge variant="red">Suspended</Badge>
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  return (
    <div className="flex items-center gap-1">
      <span className="text-amber-400 text-sm">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
    </div>
  )
}

export function Drivers() {
  const loading = usePageLoad()
  const [search, setSearch] = useState('')
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={7} hasToolbar hasAvatar /></>

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.license.toLowerCase().includes(search.toLowerCase()) ||
      d.assignedVehicle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={`${drivers.length} registered drivers`}
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Driver
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search drivers..."
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
                <th className="table-th">Driver</th>
                <th className="table-th">License No.</th>
                <th className="table-th">Expiry</th>
                <th className="table-th">Assigned Vehicle</th>
                <th className="table-th">Total Trips</th>
                <th className="table-th">Rating</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${d.avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {d.avatarInitials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <a href={`tel:${d.phone}`} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-0.5 transition-colors">
                            <Phone className="w-3 h-3" />{d.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs text-gray-600">{d.license}</td>
                  <td className="table-td">
                    <span className={`text-xs font-medium ${new Date(d.licenseExpiry) < new Date('2026-06-01') ? 'text-amber-600' : 'text-gray-500'}`}>
                      {d.licenseExpiry}
                    </span>
                  </td>
                  <td className="table-td">
                    {d.assignedVehicle === 'Unassigned' ? (
                      <span className="text-gray-400 italic text-xs">Unassigned</span>
                    ) : (
                      <span className="font-mono font-semibold text-blue-700 text-sm">{d.assignedVehicle}</span>
                    )}
                  </td>
                  <td className="table-td font-medium text-gray-900">{d.totalTrips.toLocaleString()}</td>
                  <td className="table-td"><RatingStars rating={d.rating} /></td>
                  <td className="table-td">{statusBadge(d.status)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Email">
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No drivers match your search.</div>
        )}
      </div>
    </div>
  )
}
