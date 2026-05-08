// ─── Vehicle ───────────────────────────────────────────────────────────────────
export type VehicleStatus = 'Active' | 'Maintenance' | 'Idle' | 'Retired'

export interface Vehicle {
  id: number
  plateNo: string
  make: string
  model: string
  year: number
  type: string
  driver: string
  status: VehicleStatus
  lastService: string
  mileage: string
}

// ─── Driver ────────────────────────────────────────────────────────────────────
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'

export interface Driver {
  id: number
  name: string
  license: string
  licenseExpiry: string
  phone: string
  email: string
  assignedVehicle: string
  status: DriverStatus
  totalTrips: number
  rating: number
  avatarInitials: string
  avatarBg: string
}

// ─── Trip ──────────────────────────────────────────────────────────────────────
export type TripStatus = 'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled'

export interface Trip {
  id: number
  tripNo: string
  vehicle: string
  driver: string
  origin: string
  destination: string
  distance: string
  startDate: string
  endDate: string
  cargo: string
  status: TripStatus
}
