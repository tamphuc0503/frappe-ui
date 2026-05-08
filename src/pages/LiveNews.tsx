import { useState } from 'react'
import { Plus, Search, Calendar, User } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { usePageLoad } from '../hooks/usePageLoad'
import { Sk, SkPageHeader, SkNewsCard } from '../components/ui/Skeleton'

function LiveNewsSkeleton() {
  return (
    <div>
      <SkPageHeader />
      <div className="flex items-center gap-2 mb-5">
        <Sk className="h-9 flex-1 max-w-xs rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Sk key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => <SkNewsCard key={i} />)}
      </div>
    </div>
  )
}

type CategoryVariant = 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray'

interface NewsCard {
  id: number
  title: string
  author: string
  date: string
  category: string
  categoryVariant: CategoryVariant
  excerpt: string
  headerBg: string
}

const newsItems: NewsCard[] = [
  {
    id: 1,
    title: 'Q2 Fleet Expansion: 8 New Vehicles Added to Pacific Route',
    author: 'James Okafor',
    date: 'May 8, 2026',
    category: 'Fleet',
    categoryVariant: 'blue',
    excerpt:
      'OceanFleet has completed the acquisition of 8 new Volvo FH16 heavy-duty trucks, expanding our Pacific coast operations capacity by 20%. The vehicles are equipped with the latest telematics systems.',
    headerBg: 'bg-gradient-to-br from-blue-500 to-blue-700',
  },
  {
    id: 2,
    title: 'HR Policy Update: Revised Remote Work Guidelines Effective June 2026',
    author: 'Linda Park',
    date: 'May 7, 2026',
    category: 'HR',
    categoryVariant: 'green',
    excerpt:
      'Following a company-wide survey, the HR department is rolling out updated remote work policies allowing up to 3 days per week for eligible roles. Full details in the employee handbook.',
    headerBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  {
    id: 3,
    title: 'Record Q1 Revenue: CRM Deals Pipeline Grows 35%',
    author: 'Rachel Wong',
    date: 'May 6, 2026',
    category: 'CRM',
    categoryVariant: 'purple',
    excerpt:
      'The sales and CRM team achieved a record-breaking Q1, with total closed deals up 35% year-over-year. New enterprise clients from Southeast Asia account for 40% of the growth.',
    headerBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
  },
  {
    id: 4,
    title: 'Safety First: Mandatory Driver Certification Program Launches',
    author: 'Carlos Mendez',
    date: 'May 5, 2026',
    category: 'Safety',
    categoryVariant: 'yellow',
    excerpt:
      'All drivers are required to complete the new advanced safety certification program by July 31, 2026. The program covers defensive driving, emergency protocols, and cargo handling procedures.',
    headerBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
  },
  {
    id: 5,
    title: 'Technology Upgrade: New ERP Module for Real-Time Trip Tracking',
    author: 'David Kim',
    date: 'May 4, 2026',
    category: 'Technology',
    categoryVariant: 'blue',
    excerpt:
      'The IT team has launched an upgraded real-time trip tracking module integrated directly into the fleet management system, providing dispatchers and clients live vehicle location updates.',
    headerBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  },
  {
    id: 6,
    title: 'Employee Spotlight: Celebrating 10 Years of Excellence',
    author: 'Grace Nwosu',
    date: 'May 3, 2026',
    category: 'Culture',
    categoryVariant: 'green',
    excerpt:
      'This month, we celebrate three team members reaching their 10-year milestones: Senior Driver Ahmed Hassan, Payroll Analyst Maria Torres, and Operations Lead Kevin Bright.',
    headerBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
  },
]

export function LiveNews() {
  const loading = usePageLoad()
  const [search, setSearch] = useState('')
  if (loading) return <LiveNewsSkeleton />

  const filtered = newsItems.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.category.toLowerCase().includes(search.toLowerCase()) ||
      n.author.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Live News"
        subtitle="Company announcements and updates"
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Post Article
          </button>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search news..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No articles found</p>
          <p className="text-sm mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((news) => (
            <div
              key={news.id}
              className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            >
              {/* Colored header */}
              <div className={`${news.headerBg} h-28 flex items-end p-4`}>
                <Badge variant={news.categoryVariant}>{news.category}</Badge>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {news.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">
                  {news.excerpt}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>{news.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{news.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
