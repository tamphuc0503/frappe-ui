import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CompanyInfoDialog } from '../ui/CompanyInfoDialog'
import {
  LayoutDashboard,
  Newspaper,
  Users,
  UserCircle,
  CalendarOff,
  Banknote,
  UserPlus,
  Clock,
  LogIn,
  Truck,
  Car,
  BadgeCheck,
  Map,
  Briefcase,
  ContactRound,
  Handshake,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Anchor,
  Settings,
  Building,
  Building2,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  label: string
  icon: React.ReactNode
  path?: string
  children?: { label: string; icon: React.ReactNode; path: string }[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/dashboard',
  },
  {
    label: 'Live News',
    icon: <Newspaper className="w-5 h-5" />,
    path: '/live-news',
  },
  {
    label: 'HRM',
    icon: <Users className="w-5 h-5" />,
    children: [
      { label: 'Employees', icon: <UserCircle className="w-4 h-4" />, path: '/hrm/employees' },
      { label: 'Leave', icon: <CalendarOff className="w-4 h-4" />, path: '/hrm/leave' },
      { label: 'Payrolls', icon: <Banknote className="w-4 h-4" />, path: '/hrm/payrolls' },
      { label: 'Recruitment', icon: <UserPlus className="w-4 h-4" />, path: '/hrm/recruitment' },
      { label: 'Shift & Attendance', icon: <Clock className="w-4 h-4" />, path: '/hrm/attendance' },
      { label: 'Clock In / Out', icon: <LogIn className="w-4 h-4" />, path: '/hrm/clock-in-out' },
    ],
  },
  {
    label: 'Fleet',
    icon: <Truck className="w-5 h-5" />,
    children: [
      { label: 'Vehicles', icon: <Car className="w-4 h-4" />, path: '/fleet/vehicles' },
      { label: 'Drivers', icon: <BadgeCheck className="w-4 h-4" />, path: '/fleet/drivers' },
      { label: 'Trips', icon: <Map className="w-4 h-4" />, path: '/fleet/trips' },
    ],
  },
  {
    label: 'CRM',
    icon: <Briefcase className="w-5 h-5" />,
    children: [
      { label: 'Contacts', icon: <ContactRound className="w-4 h-4" />, path: '/crm/contacts' },
      { label: 'Deals', icon: <Handshake className="w-4 h-4" />, path: '/crm/deals' },
      { label: 'Reports', icon: <BarChart3 className="w-4 h-4" />, path: '/crm/reports' },
    ],
  },
  {
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { label: 'Company', icon: <Building className="w-4 h-4" />, path: '/settings/company' },
      { label: 'Departments', icon: <Building2 className="w-4 h-4" />, path: '/settings/departments' },
    ],
  },
]

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tooltip flex items-center">
      {children}
      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150 shadow-lg">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  // Determine which submenus should be open by default based on current path
  const getDefaultOpen = () => {
    const open: Record<string, boolean> = {}
    navItems.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((child) => location.pathname.startsWith(child.path))
        if (isActive) open[item.label] = true
      }
    })
    return open
  }

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(getDefaultOpen)
  const [showCompanyDialog, setShowCompanyDialog] = useState(false)

  // Auto-open submenu when navigating to a child route
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((child) => location.pathname.startsWith(child.path))
        if (isActive) {
          setOpenMenus((prev) => ({ ...prev, [item.label]: true }))
        }
      }
    })
  }, [location.pathname])

  function toggleMenu(label: string) {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0f172a] flex flex-col z-40 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo area — opens company info dialog on click */}
      <button
        onClick={() => setShowCompanyDialog(true)}
        title={collapsed ? 'Company info' : undefined}
        className={`h-16 flex items-center border-b border-slate-700/50 flex-shrink-0 hover:bg-slate-800/50 transition-colors w-full text-left ${collapsed ? 'justify-center px-0' : 'px-5 gap-3'}`}
      >
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Anchor className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-tight">OceanFleet</p>
            <p className="text-blue-400 text-xs font-medium leading-tight">ERP Platform</p>
          </div>
        )}
      </button>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0
          const isParentActive =
            hasChildren && item.children!.some((child) => location.pathname.startsWith(child.path))
          const isMenuOpen = openMenus[item.label] ?? false

          if (!hasChildren && item.path) {
            // Simple nav link
            return (
              <div key={item.label}>
                {collapsed ? (
                  <Tooltip label={item.label}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `sidebar-link w-full justify-center ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
                      }
                    >
                      {item.icon}
                    </NavLink>
                  </Tooltip>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                )}
              </div>
            )
          }

          // Expandable group
          return (
            <div key={item.label}>
              {collapsed ? (
                <Tooltip label={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`sidebar-link w-full justify-center ${
                      isParentActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                    }`}
                  >
                    {item.icon}
                  </button>
                </Tooltip>
              ) : (
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`sidebar-link w-full ${
                    isParentActive && !isMenuOpen ? 'sidebar-link-active' : 'sidebar-link-inactive'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              )}

              {/* Submenu - only show when not collapsed */}
              {!collapsed && isMenuOpen && item.children && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700 space-y-0.5">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'text-white bg-blue-600/80'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`
                      }
                    >
                      {child.icon}
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="flex-shrink-0 border-t border-slate-700/50 p-2">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-all duration-150 text-sm font-medium ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>

      {showCompanyDialog && (
        <CompanyInfoDialog onClose={() => setShowCompanyDialog(false)} />
      )}
    </aside>
  )
}
