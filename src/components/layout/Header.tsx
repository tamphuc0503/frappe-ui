import { useState } from 'react'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  sidebarCollapsed: boolean
}

const mockNotifications = [
  { id: 1, text: 'New leave request from Sarah Johnson', time: '5m ago', unread: true },
  { id: 2, text: 'Vehicle #FL-042 maintenance due', time: '1h ago', unread: true },
  { id: 3, text: 'Deal "Horizon Shipping" moved to Offer stage', time: '3h ago', unread: false },
  { id: 4, text: 'Payroll for March has been processed', time: '1d ago', unread: false },
]

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const unreadCount = mockNotifications.filter((n) => n.unread).length

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-100 z-30 flex items-center px-6 gap-4 shadow-sm transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Brand for mobile fallback */}
      <div className="flex-1 flex items-center">
        <span className="text-sm text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifs((p) => !p)
              setShowUserMenu(false)
            }}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      n.unread ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <p className={`text-sm ${n.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {n.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 text-center">
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu((p) => !p)
              setShowNotifs(false)
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.avatarInitials ?? 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{user?.name ?? 'User'}</p>
              <p className="text-xs text-gray-400 leading-tight">{user?.role ?? 'Admin'}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden py-1">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click-outside overlay */}
      {(showNotifs || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifs(false)
            setShowUserMenu(false)
          }}
        />
      )}
    </header>
  )
}
