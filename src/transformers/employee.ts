import type { Employee, EmployeeStatus } from '../types/hrm'
import type { Codec } from './codec'

export const AVATAR_COLORS = [
  'bg-pink-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-orange-500', 'bg-rose-500', 'bg-violet-500',
]

export interface FrappeEmployee {
  name: string
  employee_name?: string
  personal_email?: string
  company_email?: string
  cell_number?: string
  department?: string
  designation?: string
  status?: string
  date_of_joining?: string
}

export interface CreateEmployeeInput {
  name: string
  email: string
  phone: string
  department: string
  position: string
  status: EmployeeStatus
  joinDate: string
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Stable color choice based on the name — keeps avatars consistent across renders.
function colorFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function decodeStatus(s: string | undefined): EmployeeStatus {
  if (s === 'Active') return 'Active'
  if (s === 'Suspended') return 'On Leave'
  return 'Inactive'
}

function encodeStatus(s: EmployeeStatus): string {
  if (s === 'Inactive') return 'Inactive'
  if (s === 'On Leave') return 'Suspended'
  return 'Active'
}

export const employeeCodec: Codec<Employee, FrappeEmployee> = {
  decode(frappe) {
    const fullName = frappe.employee_name || frappe.name
    return {
      id: frappe.name,
      name: fullName,
      email: frappe.company_email || frappe.personal_email || '',
      phone: frappe.cell_number || '',
      department: frappe.department || '',
      position: frappe.designation || '',
      status: decodeStatus(frappe.status),
      joinDate: frappe.date_of_joining || '',
      avatarInitials: deriveInitials(fullName),
      avatarBg: colorFor(fullName),
    }
  },
  encode(emp) {
    return {
      name: emp.id,
      employee_name: emp.name,
      company_email: emp.email || undefined,
      cell_number: emp.phone || undefined,
      department: emp.department || undefined,
      designation: emp.position || undefined,
      status: encodeStatus(emp.status),
      date_of_joining: emp.joinDate || undefined,
    }
  },
}

// Build the payload for `frappe.client.insert`. Asymmetric to the codec above
// because Frappe's insert requires `first_name` / `last_name` / `doctype`,
// which aren't part of the read shape.
export function toFrappeEmployeeDoc(input: CreateEmployeeInput): Record<string, unknown> {
  const parts = input.name.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] || input.name
  const lastName = parts.slice(1).join(' ')

  return {
    doctype: 'Employee',
    first_name: firstName,
    last_name: lastName,
    employee_name: input.name.trim(),
    company_email: input.email,
    cell_number: input.phone,
    department: input.department,
    designation: input.position,
    status: encodeStatus(input.status),
    date_of_joining: input.joinDate,
  }
}
