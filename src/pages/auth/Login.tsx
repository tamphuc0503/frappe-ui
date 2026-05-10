import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Anchor, Loader2 } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorShaking, setErrorShaking] = useState(false)
  const [shakingFields, setShakingFields] = useState<Set<'identifier' | 'password'>>(new Set())

  function shakeClass(field: 'identifier' | 'password') {
    return shakingFields.has(field) ? 'field-shake' : ''
  }

  function stopShake(field: 'identifier' | 'password') {
    setShakingFields((prev) => { const n = new Set(prev); n.delete(field); return n })
  }

  function shake(fields: Array<'identifier' | 'password'>) {
    setShakingFields(new Set(fields))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!identifier.trim()) {
      setError('Please enter your username or email.')
      setErrorShaking(true)
      shake(['identifier'])
      return
    }
    if (!password) {
      setError('Please enter your password.')
      setErrorShaking(true)
      shake(['password'])
      return
    }

    setLoading(true)
    const result = await login(identifier.trim(), password)
    setLoading(false)

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('remember_email', identifier.trim())
      } else {
        localStorage.removeItem('remember_email')
      }
      navigate('/dashboard')
    } else {
      setError(result.error ?? 'Login failed. Please try again.')
      setErrorShaking(true)
      shake(['identifier', 'password'])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Logo — anchored to top */}
      <div className="text-center pt-10 pb-2 relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-3">
          <Anchor className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">OceanFleet ERP</h1>
        <p className="text-slate-400 text-sm mt-1">Integrated Fleet & HR Management</p>
      </div>

      {/* Card — pulled toward top of remaining space */}
      <div className="flex-1 flex items-start justify-center px-4 pt-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div
                className={`mb-4 p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                onAnimationEnd={() => setErrorShaking(false)}
              >
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username or Email */}
              <div className={shakeClass('identifier')} onAnimationEnd={() => stopShake('identifier')}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="identifier">
                  Username or Email
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="username or you@company.com"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Password */}
              <div className={shakeClass('password')} onAnimationEnd={() => stopShake('password')}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer — anchored to bottom */}
      <div className="text-center pb-6 pt-4 relative z-10">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} OceanFleet ERP. All rights reserved.
        </p>
      </div>
    </div>
  )
}
