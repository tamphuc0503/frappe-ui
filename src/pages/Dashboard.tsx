import { Users, Truck, Briefcase, CalendarOff, UserPlus, Car, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { usePageLoad } from '../hooks/usePageLoad'
import { Sk, SkPageHeader, SkStatCards, SkActivityItem } from '../components/ui/Skeleton'

function DashboardSkeleton() {
  return (
    <div>
      <SkPageHeader hasAction={false} />
      <SkStatCards count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-2">
            <Sk className="h-5 w-32 rounded-md" />
            <Sk className="h-4 w-20 rounded-md" />
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => <SkActivityItem key={i} />)}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <Sk className="h-4 w-32 rounded-md" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Sk className="h-3.5 w-28 rounded-md" />
                    <Sk className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const recentActivity = [
  {
    id: 1,
    type: 'employee',
    message: 'Marcus Chen joined as Senior Engineer in Technology dept.',
    time: '10 minutes ago',
    icon: <UserPlus className="w-4 h-4 text-blue-600" />,
    iconBg: 'bg-blue-100',
  },
  {
    id: 2,
    type: 'vehicle',
    message: 'Vehicle FL-039 (Volvo FH16) completed Trip #T-2047 — Port of Oakland',
    time: '32 minutes ago',
    icon: <Car className="w-4 h-4 text-emerald-600" />,
    iconBg: 'bg-emerald-100',
  },
  {
    id: 3,
    type: 'leave',
    message: 'Leave request approved for Sarah Johnson (Annual Leave, 3 days)',
    time: '1 hour ago',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    iconBg: 'bg-emerald-100',
  },
  {
    id: 4,
    type: 'deal',
    message: 'Deal "Pacific Rim Cargo" moved to Interview stage by James Okafor',
    time: '2 hours ago',
    icon: <Briefcase className="w-4 h-4 text-purple-600" />,
    iconBg: 'bg-purple-100',
  },
  {
    id: 5,
    type: 'leave',
    message: 'Leave request rejected for Tom Rivera (Sick Leave) — insufficient balance',
    time: '3 hours ago',
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    iconBg: 'bg-red-100',
  },
  {
    id: 6,
    type: 'vehicle',
    message: 'Vehicle FL-042 (MAN TGX) scheduled for maintenance — due 2026-05-12',
    time: '5 hours ago',
    icon: <Truck className="w-4 h-4 text-amber-600" />,
    iconBg: 'bg-amber-100',
  },
]

const upcomingEvents = [
  { id: 1, label: 'Team standup', time: '09:00 AM', badge: 'blue' as const },
  { id: 2, label: 'Payroll processing deadline', time: '05:00 PM', badge: 'yellow' as const },
  { id: 3, label: 'Driver safety training', time: '02:00 PM', badge: 'green' as const },
  { id: 4, label: 'Q2 Fleet inspection', time: 'Tomorrow', badge: 'gray' as const },
]

export function Dashboard() {
  const loading = usePageLoad()
  if (loading) return <DashboardSkeleton />
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Employees"
          value={248}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          iconBgColor="bg-blue-50"
          trend={{ value: 4.5, label: 'vs last month', direction: 'up' }}
        />
        <StatCard
          title="Active Vehicles"
          value={32}
          icon={<Truck className="w-6 h-6 text-emerald-600" />}
          iconBgColor="bg-emerald-50"
          trend={{ value: 2.1, label: 'vs last month', direction: 'up' }}
        />
        <StatCard
          title="Open Deals"
          value={14}
          icon={<Briefcase className="w-6 h-6 text-purple-600" />}
          iconBgColor="bg-purple-50"
          trend={{ value: 1.8, label: 'vs last month', direction: 'down' }}
        />
        <StatCard
          title="Pending Leaves"
          value={7}
          icon={<CalendarOff className="w-6 h-6 text-amber-600" />}
          iconBgColor="bg-amber-50"
          trend={{ value: 3.0, label: 'vs last month', direction: 'up' }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* Recent activity */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`${item.iconBg} rounded-full p-2 flex-shrink-0 mt-0.5`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Schedule</h2>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{ev.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ev.time}</p>
                </div>
                <Badge variant={ev.badge}>{ev.time}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Employee Growth</h2>
              <p className="text-xs text-gray-400 mt-0.5">Headcount trend over the last 12 months</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>Last 12 months</option>
              <option>Last 6 months</option>
              <option>This year</option>
            </select>
          </div>
          <div className="h-52 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl flex items-end justify-around px-4 pb-4 gap-2">
            {[180, 192, 198, 205, 210, 218, 222, 228, 232, 238, 244, 248].map((val, i) => {
              const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
              const height = `${((val - 170) / 90) * 100}%`
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer min-h-[4px]"
                    style={{ height }}
                    title={`${months[i]}: ${val}`}
                  />
                  <span className="text-xs text-gray-400">{months[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Fleet Utilization</h2>
              <p className="text-xs text-gray-400 mt-0.5">Active vs idle vehicles this week</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>This week</option>
              <option>Last week</option>
              <option>This month</option>
            </select>
          </div>
          <div className="h-52 flex items-center justify-center">
            <div className="relative w-40 h-40">
              {/* Donut chart placeholder */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="35" fill="none" stroke="#e5e7eb" strokeWidth="18" />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="18"
                  strokeDasharray="138 82"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="18"
                  strokeDasharray="50 170"
                  strokeDashoffset="-138"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">78%</span>
                <span className="text-xs text-gray-400">utilization</span>
              </div>
            </div>
            <div className="ml-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-400">25 vehicles</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Maintenance</p>
                  <p className="text-xs text-gray-400">4 vehicles</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Idle</p>
                  <p className="text-xs text-gray-400">3 vehicles</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
