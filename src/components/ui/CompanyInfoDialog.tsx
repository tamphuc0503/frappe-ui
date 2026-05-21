import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  X, Building2, Globe, Mail, Phone, Calendar, DollarSign, Hash, MapPin, Tag,
} from 'lucide-react'
import { getCompanyCache } from '../../services/company'
import type { Company } from '../../types/company'

interface CompanyInfoDialogProps {
  onClose: () => void
}

export function CompanyInfoDialog({ onClose }: CompanyInfoDialogProps) {
  const [company] = useState<Company | null>(() => getCompanyCache())
  const [closing, setClosing] = useState(false)

  function handleClose() {
    setClosing(true)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setClosing(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 ${closing ? 'backdrop-exit' : 'backdrop-enter'}`} onClick={handleClose} />
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none">
        <div
          className={`bg-white rounded-b-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto pointer-events-auto ${closing ? 'dialog-exit' : 'dialog-enter'}`}
          onClick={(e) => e.stopPropagation()}
          onAnimationEnd={() => { if (closing) onClose() }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Company Information</h2>
                <p className="text-sm text-gray-500 mt-0.5">Details from your Frappe company record.</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            {!company ? (
              <div className="text-center py-12 text-gray-400">
                <p>No cached company information. Please log out and back in.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{company.name}</p>
                  {company.abbreviation && <p className="text-sm text-gray-500 mt-0.5">Abbreviation: {company.abbreviation}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {company.domain && <Field icon={<Tag className="w-4 h-4" />} label="Domain" value={company.domain} />}
                  {company.country && <Field icon={<MapPin className="w-4 h-4" />} label="Country" value={company.country} />}
                  {company.currency && <Field icon={<DollarSign className="w-4 h-4" />} label="Currency" value={company.currency} />}
                  {company.establishedDate && <Field icon={<Calendar className="w-4 h-4" />} label="Established" value={company.establishedDate} />}
                  {company.email && <Field icon={<Mail className="w-4 h-4" />} label="Email" value={company.email} />}
                  {company.phone && <Field icon={<Phone className="w-4 h-4" />} label="Phone" value={company.phone} />}
                  {company.website && <Field icon={<Globe className="w-4 h-4" />} label="Website" value={company.website} />}
                  {company.taxId && <Field icon={<Hash className="w-4 h-4" />} label="Tax ID" value={company.taxId} />}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button onClick={handleClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface FieldProps {
  icon: ReactNode
  label: string
  value: string
}

function Field({ icon, label, value }: FieldProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  )
}
