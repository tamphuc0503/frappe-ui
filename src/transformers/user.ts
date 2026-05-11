import type { UserProfile } from '../types/user'
import type { Codec } from './codec'

export interface FrappeUser {
  name: string
  email?: string
  full_name?: string
  username?: string
  user_image?: string
  language?: string
  time_zone?: string
  phone?: string
  mobile_no?: string
  bio?: string
  location?: string
  enabled?: number
  last_login?: string
}

export const userCodec: Codec<UserProfile, FrappeUser> = {
  decode(frappe) {
    return {
      email: frappe.email || frappe.name,
      fullName: frappe.full_name || '',
      username: frappe.username || '',
      avatarUrl: frappe.user_image || '',
      language: frappe.language || '',
      timeZone: frappe.time_zone || '',
      phone: frappe.phone || '',
      mobileNo: frappe.mobile_no || '',
      bio: frappe.bio || '',
      location: frappe.location || '',
      enabled: frappe.enabled === 1,
      lastLogin: frappe.last_login || '',
    }
  },
  encode(profile) {
    return {
      name: profile.email,
      email: profile.email,
      full_name: profile.fullName,
      username: profile.username || undefined,
      user_image: profile.avatarUrl || undefined,
      language: profile.language || undefined,
      time_zone: profile.timeZone || undefined,
      phone: profile.phone || undefined,
      mobile_no: profile.mobileNo || undefined,
      bio: profile.bio || undefined,
      location: profile.location || undefined,
      enabled: profile.enabled ? 1 : 0,
      last_login: profile.lastLogin || undefined,
    }
  },
}
