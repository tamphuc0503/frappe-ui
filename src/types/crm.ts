// ─── Contact ───────────────────────────────────────────────────────────────────
export type ContactType = 'Client' | 'Prospect' | 'Partner' | 'Vendor'

export interface Contact {
  id: number
  name: string
  company: string
  title: string
  email: string
  phone: string
  type: ContactType
  lastContact: string
  deals: number
  avatarInitials: string
  avatarBg: string
}

// ─── Deal ──────────────────────────────────────────────────────────────────────
export type DealStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'

export interface Deal {
  id: number
  name: string
  contact: string
  company: string
  value: number
  stage: DealStage
  probability: number
  closeDate: string
  owner: string
}
