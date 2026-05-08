import { useState } from 'react'
import { Plus, Eye, Search, Building2, Phone, Mail } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'

type ContactType = 'Client' | 'Prospect' | 'Partner' | 'Vendor'

interface Contact {
  id: number
  name: string
  company: string
  title: string
  email: string
  phone: string
  type: ContactType
  lastContact: string
  deals: number
  avatarInitials: string
  avatarBg: string
}

const contacts: Contact[] = [
  { id: 1, name: 'Angela Brooks', company: 'Horizon Shipping Co.', title: 'VP Logistics', email: 'a.brooks@horizonship.com', phone: '+1 (555) 111-2222', type: 'Client', lastContact: '2026-05-06', deals: 3, avatarInitials: 'AB', avatarBg: 'bg-blue-600' },
  { id: 2, name: 'Michael Torres', company: 'Pacific Rim Cargo', title: 'CEO', email: 'm.torres@pacrim.com', phone: '+1 (555) 222-3333', type: 'Prospect', lastContact: '2026-05-05', deals: 1, avatarInitials: 'MT', avatarBg: 'bg-emerald-600' },
  { id: 3, name: 'Fiona Chen', company: 'TransAsia Freight', title: 'Procurement Director', email: 'f.chen@transasia.com', phone: '+1 (555) 333-4444', type: 'Client', lastContact: '2026-05-04', deals: 5, avatarInitials: 'FC', avatarBg: 'bg-purple-600' },
  { id: 4, name: 'Robert Nguyen', company: 'Gulf Coast Express', title: 'Operations Manager', email: 'r.nguyen@gce.com', phone: '+1 (555) 444-5555', type: 'Partner', lastContact: '2026-05-01', deals: 2, avatarInitials: 'RN', avatarBg: 'bg-amber-600' },
  { id: 5, name: 'Diana Walsh', company: 'Euro Cargo Solutions', title: 'Business Dev Manager', email: 'd.walsh@eurocargo.eu', phone: '+44 20 7946 0123', type: 'Prospect', lastContact: '2026-04-30', deals: 0, avatarInitials: 'DW', avatarBg: 'bg-pink-600' },
  { id: 6, name: 'Hassan Ibrahim', company: 'Middle East Transport', title: 'Regional Director', email: 'h.ibrahim@met.ae', phone: '+971 4 123 4567', type: 'Client', lastContact: '2026-04-28', deals: 4, avatarInitials: 'HI', avatarBg: 'bg-indigo-600' },
  { id: 7, name: 'Natalie Fox', company: 'Fleet Supplies Ltd.', title: 'Account Manager', email: 'n.fox@fleetsupplies.com', phone: '+1 (555) 777-8888', type: 'Vendor', lastContact: '2026-04-25', deals: 0, avatarInitials: 'NF', avatarBg: 'bg-teal-600' },
  { id: 8, name: 'Carlos Ruiz', company: 'Americas Freight Hub', title: 'CTO', email: 'c.ruiz@afh.com', phone: '+1 (555) 888-9999', type: 'Prospect', lastContact: '2026-04-22', deals: 1, avatarInitials: 'CR', avatarBg: 'bg-red-600' },
]

function typeBadge(t: ContactType) {
  const map: Record<ContactType, 'blue' | 'yellow' | 'purple' | 'gray'> = {
    Client: 'blue',
    Prospect: 'yellow',
    Partner: 'purple',
    Vendor: 'gray',
  }
  return <Badge variant={map[t]}>{t}</Badge>
}

export function Contacts() {
  const loading = usePageLoad()
  const [search, setSearch] = useState('')
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={7} hasToolbar /></>

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contacts in your network`}
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
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
                <th className="table-th">Contact</th>
                <th className="table-th">Company</th>
                <th className="table-th">Contact Info</th>
                <th className="table-th">Type</th>
                <th className="table-th">Active Deals</th>
                <th className="table-th">Last Contact</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${c.avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {c.avatarInitials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {c.company}
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {c.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {c.phone}
                      </div>
                    </div>
                  </td>
                  <td className="table-td">{typeBadge(c.type)}</td>
                  <td className="table-td">
                    {c.deals > 0 ? (
                      <span className="font-semibold text-blue-700">{c.deals}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-td text-gray-500 text-xs">{c.lastContact}</td>
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
          <div className="text-center py-12 text-gray-400">No contacts match your search.</div>
        )}
      </div>
    </div>
  )
}
