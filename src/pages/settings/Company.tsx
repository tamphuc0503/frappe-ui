import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Building, Globe, Mail, Phone, Calendar, DollarSign, Hash, MapPin, Tag,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader } from '../../components/ui/Skeleton'
import { getCompanyCache } from '../../services/company'
import type { Company as CompanyType } from '../../types/company'

export function Company() {
  const pageLoading = usePageLoad()
  const [company] = useState<CompanyType | null>(() => getCompanyCache())

  if (pageLoading) return <CompanySkeleton />

  if (!company) {
    return (
      <div>
        <PageHeader title="Company" />
        <div className="card p-12 text-center text-gray-400">
          <p>No cached company information. Please log out and back in.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Company"
        subtitle="Your organization's profile and configuration."
      />

      {/* Hero */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Building className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{company.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {company.abbreviation && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                  <Hash className="w-3 h-3" />
                  {company.abbreviation}
                </span>
              )}
              {company.domain && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  <Tag className="w-3 h-3" />
                  {company.domain}
                </span>
              )}
              {company.country && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {company.country}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Basic Information">
          <Field icon={<Tag className="w-4 h-4" />} label="Domain" value={company.domain} />
          <Field icon={<MapPin className="w-4 h-4" />} label="Country" value={company.country} />
          <Field icon={<DollarSign className="w-4 h-4" />} label="Default Currency" value={company.currency} />
          <Field icon={<Calendar className="w-4 h-4" />} label="Date of Establishment" value={company.establishedDate} />
        </Section>

        <Section title="Contact">
          <Field icon={<Mail className="w-4 h-4" />} label="Email" value={company.email} />
          <Field icon={<Phone className="w-4 h-4" />} label="Phone" value={company.phone} />
          <Field icon={<Phone className="w-4 h-4" />} label="Fax" value={company.fax} />
          <Field icon={<Globe className="w-4 h-4" />} label="Website" value={company.website} />
        </Section>

        <Section title="Tax & Registration" className="lg:col-span-2">
          <Field icon={<Hash className="w-4 h-4" />} label="Tax ID" value={company.taxId} />
        </Section>
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  children: ReactNode
  className?: string
}

function Section({ title, children, className = '' }: SectionProps) {
  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  )
}

interface FieldProps {
  icon: ReactNode
  label: string
  value?: string | null
}

function Field({ icon, label, value }: FieldProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">
          {value || <span className="text-gray-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  )
}

function CompanySkeleton() {
  return (
    <div>
      <SkPageHeader hasAction={false} />
      <div className="card p-6 mb-6 flex items-start gap-4">
        <Sk className="w-14 h-14 rounded-2xl flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Sk className="h-7 w-64 rounded-md" />
          <div className="flex gap-2 mt-2">
            <Sk className="h-5 w-16 rounded-full" />
            <Sk className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <Sk className="h-5 w-32 rounded-md" />
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex items-start gap-3 py-2">
                <Sk className="w-7 h-7 rounded-md flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Sk className="h-3 w-20 rounded-md" />
                  <Sk className="h-4 w-40 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
