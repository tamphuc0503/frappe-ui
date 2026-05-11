import { useRef, useState } from 'react'
import { Camera, Loader2, Save } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { usePageLoad } from '../../hooks/usePageLoad'
import { useFetchOnce } from '../../hooks/useFetchOnce'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { useAuth } from '../../hooks/useAuth'
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  type UpdateUserProfileInput,
} from '../../services/users'
import { uploadFile } from '../../services/files'
import type { UserProfile } from '../../types/user'

interface FormData {
  fullName: string
  avatarUrl: string
  phone: string
  mobileNo: string
  bio: string
  location: string
}

function fromProfile(p: UserProfile): FormData {
  return {
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    phone: p.phone,
    mobileNo: p.mobileNo,
    bio: p.bio,
    location: p.location,
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso.replace(' ', 'T'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function Profile() {
  const pageLoading = usePageLoad()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  const [pristine, setPristine] = useState<FormData | null>(null)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useFetchOnce(() => {
    setFetchLoading(true)
    getCurrentUserProfile()
      .then((p) => {
        setProfile(p)
        const snap = fromProfile(p)
        setForm(snap)
        setPristine(snap)
        setFetchError(null)
        setAvatarBroken(false)
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : 'Failed to load profile.'))
      .finally(() => setFetchLoading(false))
  })

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  async function handlePickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setSubmitError('Avatar must be an image (PNG, JPG, GIF, WEBP).')
      return
    }
    setSubmitError(null)
    setUploadingAvatar(true)
    try {
      const uploaded = await uploadFile(f, { isPrivate: false, folder: 'Home' })
      set('avatarUrl', uploaded.url)
      setAvatarBroken(false)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Avatar upload failed.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: UpdateUserProfileInput = {
        fullName: form.fullName.trim(),
        avatarUrl: form.avatarUrl,
        phone: form.phone.trim(),
        mobileNo: form.mobileNo.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
      }
      const updated = await updateCurrentUserProfile(payload)
      setProfile(updated)
      const snap = fromProfile(updated)
      setForm(snap)
      setPristine(snap)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2200)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSubmitting(false)
    }
  }

  const loading = pageLoading || fetchLoading

  if (loading) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <SkPageHeader hasAction={false} />
        <div className="flex-1 overflow-y-auto min-h-0 space-y-5">
          <div className="card p-6 flex items-center gap-5">
            <Sk className="w-28 h-28 rounded-full" />
            <div className="flex-1 space-y-2">
              <Sk className="h-5 w-48 rounded-md" />
              <Sk className="h-4 w-64 rounded-md" />
              <Sk className="h-4 w-32 rounded-md" />
            </div>
          </div>
          <div className="card p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (fetchError || !profile || !form) {
    return (
      <div className="card p-12 text-center text-red-500">
        <p>{fetchError ?? 'Failed to load profile.'}</p>
      </div>
    )
  }

  const dirty = !!pristine && JSON.stringify(form) !== JSON.stringify(pristine)
  const showAvatar = form.avatarUrl && !avatarBroken
  const displayName = form.fullName || profile.email
  const role = user?.role ?? 'User'

  return (
    <div className="h-full flex flex-col min-h-0">
      <PageHeader
        title="My Profile"
        subtitle="View and update your account information"
      />

      <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto min-h-0 space-y-5">
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-600 text-sm">{submitError}</span>
          </div>
        )}
        {savedFlash && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="text-emerald-700 text-sm">Profile saved.</span>
          </div>
        )}

        {/* Avatar + identity card */}
        <div className="card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-blue-600 text-white flex items-center justify-center overflow-hidden ring-4 ring-white shadow-md">
              {showAvatar ? (
                <img
                  src={form.avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span className="text-2xl font-bold">{getInitials(displayName)}</span>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar || submitting}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50 shadow-md border border-gray-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Change avatar"
              title="Change avatar"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handlePickAvatar}
            />
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 truncate">{displayName}</h2>
              {dirty && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Not saved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
              <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                {role}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  profile.enabled
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                    : 'text-gray-600 bg-gray-50 border-gray-200'
                }`}
              >
                {profile.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>

        {/* Editable info */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                className="form-input"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={profile.email}
                readOnly
                className="form-input bg-gray-50 text-gray-600 cursor-default"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="form-input"
                placeholder="Office phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile</label>
              <input
                type="tel"
                value={form.mobileNo}
                onChange={(e) => set('mobileNo', e.target.value)}
                className="form-input"
                placeholder="Mobile number"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className="form-input"
                placeholder="City, country"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                className="form-input"
                placeholder="A short bio shown to teammates"
              />
            </div>
          </div>
        </div>

        {/* Read-only account info */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Account</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Username</dt>
              <dd className="text-gray-900">{profile.username || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Language</dt>
              <dd className="text-gray-900">{profile.language || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Time Zone</dt>
              <dd className="text-gray-900">{profile.timeZone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Login</dt>
              <dd className="text-gray-900">{formatDateTime(profile.lastLogin)}</dd>
            </div>
          </dl>
        </div>

        {/* Footer save action */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-2">
          <button
            type="submit"
            disabled={submitting || uploadingAvatar || !dirty}
            className="btn-primary min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
