import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Anchor, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [errorShaking, setErrorShaking] = useState(false)
  const [emailShaking, setEmailShaking] = useState(false)

  function showError(msg: string, shakeEmail = false) {
    setError(msg)
    setErrorShaking(true)
    if (shakeEmail) setEmailShaking(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      showError('Please enter your email address.', true)
      return
    }
    if (!email.includes('@')) {
      showError('Please enter a valid email address.', true)
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    setSubmitted(true)
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
            {!submitted ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Enter the email address associated with your account and we'll send you a link to
                    reset your password.
                  </p>
                </div>

                {/* Error — animated slide in/out */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div
                    className={`mb-4 p-3 bg-red-50 border border-red-200 rounded-lg ${errorShaking ? 'field-shake' : ''}`}
                    onAnimationEnd={() => setErrorShaking(false)}
                  >
                    <span className="text-red-600 text-sm">{error}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div
                    className={emailShaking ? 'field-shake' : ''}
                    onAnimationEnd={() => setEmailShaking(false)}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                <p className="text-gray-500 text-sm mb-1">We sent a password reset link to</p>
                <p className="font-semibold text-gray-900 text-sm mb-4">{email}</p>
                <p className="text-gray-400 text-xs mb-6">
                  Didn't receive the email? Check your spam folder, or{' '}
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    try again
                  </button>
                  .
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-5">
                  <Mail className="w-4 h-4" />
                  <span>The link expires in 24 hours</span>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            )}
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
