import React, { createContext, useState, useEffect, useCallback } from 'react'
import type { User, AuthContextType } from '../types/auth'
import { frappeLogin, clearSid, clearApiCredentials } from '../services/auth'
import { getCompany, setCompanyCache, clearCompanyCache } from '../services/company'

export const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_STORAGE_KEY = 'oceanfleet_auth'

function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0]
  return local
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as User
    } catch {
      // ignore parse errors
    }
    return null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [user])

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { fullName, roles } = await frappeLogin(email, password)
        const name = fullName || deriveNameFromEmail(email)
        const newUser: User = {
          email,
          name,
          role: 'Administrator',
          roles,
          avatarInitials: getInitials(name),
        }
        setUser(newUser)
        const company = await getCompany().catch(() => null)
        setCompanyCache(company)
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to connect. Please check your connection and try again.'
        return { success: false, error: message }
      }
    },
    []
  )

  const logout = useCallback(() => {
    clearSid()
    clearApiCredentials()
    clearCompanyCache()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
