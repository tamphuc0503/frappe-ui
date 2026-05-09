export interface User {
  email: string
  name: string
  role: string
  roles: string[]
  avatarInitials: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}
