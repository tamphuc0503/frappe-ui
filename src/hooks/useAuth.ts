import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import type { AuthContextType } from '../types/auth'

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
