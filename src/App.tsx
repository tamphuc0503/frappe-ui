import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'

import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { LiveNews } from './pages/LiveNews'

import { Employee } from './pages/hrm/Employee'
import { Leave } from './pages/hrm/Leave'
import { Payrolls } from './pages/hrm/Payrolls'
import { Recruitment } from './pages/hrm/Recruitment'
import { ShiftAttendance } from './pages/hrm/ShiftAttendance'
import { ClockInOut } from './pages/hrm/ClockInOut'

import { Vehicles } from './pages/fleet/Vehicles'
import { Drivers } from './pages/fleet/Drivers'
import { Trips } from './pages/fleet/Trips'

import { Contacts } from './pages/crm/Contacts'
import { Deals } from './pages/crm/Deals'
import { Reports } from './pages/crm/Reports'

import { Company } from './pages/settings/Company'
import { Departments } from './pages/settings/Departments'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={<PublicRoute><Login /></PublicRoute>}
      />
      <Route
        path="/forgot-password"
        element={<PublicRoute><ForgotPassword /></PublicRoute>}
      />

      <Route
        element={<ProtectedRoute><AppShell /></ProtectedRoute>}
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/live-news" element={<LiveNews />} />

        <Route path="/hrm/employees" element={<Employee />} />
        <Route path="/hrm/leave" element={<Leave />} />
        <Route path="/hrm/payrolls" element={<Payrolls />} />
        <Route path="/hrm/recruitment" element={<Recruitment />} />
        <Route path="/hrm/attendance" element={<ShiftAttendance />} />
        <Route path="/hrm/clock-in-out" element={<ClockInOut />} />

        <Route path="/fleet/vehicles" element={<Vehicles />} />
        <Route path="/fleet/drivers" element={<Drivers />} />
        <Route path="/fleet/trips" element={<Trips />} />

        <Route path="/crm/contacts" element={<Contacts />} />
        <Route path="/crm/deals" element={<Deals />} />
        <Route path="/crm/reports" element={<Reports />} />

        <Route path="/settings/company" element={<Company />} />
        <Route path="/settings/departments" element={<Departments />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
