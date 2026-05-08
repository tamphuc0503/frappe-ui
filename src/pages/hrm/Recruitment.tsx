import React from 'react'
import { Plus, Mail, Phone, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { usePageLoad } from '../../hooks/usePageLoad'
import { Sk, SkPageHeader, SkKanbanColumn } from '../../components/ui/Skeleton'

function RecruitmentSkeleton() {
  return (
    <div>
      <SkPageHeader />
      <div className="flex items-center gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Sk className="h-4 w-20 rounded-md" />
            <Sk className="h-5 w-6 rounded-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[3, 2, 3, 2].map((cards, i) => (
          <div key={i} className="flex-1 min-w-[220px] bg-gray-50 rounded-xl p-3">
            <SkKanbanColumn cards={cards} />
          </div>
        ))}
      </div>
    </div>
  )
}

interface Candidate {
  id: number
  name: string
  role: string
  email: string
  experience: string
  appliedDate: string
  avatarInitials: string
  avatarBg: string
  score?: number
}

type KanbanColumn = {
  key: string
  label: string
  color: string
  headerColor: string
  candidates: Candidate[]
}

const columns: KanbanColumn[] = [
  {
    key: 'applied',
    label: 'Applied',
    color: 'bg-gray-100 border-gray-200',
    headerColor: 'bg-gray-50 border-b-2 border-gray-200',
    candidates: [
      { id: 1, name: 'Ahmed Hassan', role: 'Senior Driver', email: 'ahmed.h@email.com', experience: '8 years', appliedDate: 'May 7', avatarInitials: 'AH', avatarBg: 'bg-blue-500' },
      { id: 2, name: 'Priya Sharma', role: 'HR Coordinator', email: 'priya.s@email.com', experience: '4 years', appliedDate: 'May 6', avatarInitials: 'PS', avatarBg: 'bg-pink-500' },
      { id: 3, name: 'Leon Fischer', role: 'Fleet Analyst', email: 'leon.f@email.com', experience: '3 years', appliedDate: 'May 5', avatarInitials: 'LF', avatarBg: 'bg-teal-500' },
    ],
  },
  {
    key: 'screening',
    label: 'Screening',
    color: 'bg-blue-50 border-blue-100',
    headerColor: 'bg-blue-50 border-b-2 border-blue-200',
    candidates: [
      { id: 4, name: 'Mei Lin', role: 'Software Engineer', email: 'mei.lin@email.com', experience: '5 years', appliedDate: 'May 3', avatarInitials: 'ML', avatarBg: 'bg-indigo-500', score: 82 },
      { id: 5, name: 'Ben Osei', role: 'Logistics Manager', email: 'ben.o@email.com', experience: '7 years', appliedDate: 'May 2', avatarInitials: 'BO', avatarBg: 'bg-emerald-500', score: 76 },
    ],
  },
  {
    key: 'interview',
    label: 'Interview',
    color: 'bg-amber-50 border-amber-100',
    headerColor: 'bg-amber-50 border-b-2 border-amber-300',
    candidates: [
      { id: 6, name: 'Sofia Martinez', role: 'Account Executive', email: 'sofia.m@email.com', experience: '6 years', appliedDate: 'Apr 28', avatarInitials: 'SM', avatarBg: 'bg-purple-500', score: 90 },
      { id: 7, name: 'Kwame Asante', role: 'DevOps Engineer', email: 'kwame.a@email.com', experience: '5 years', appliedDate: 'Apr 25', avatarInitials: 'KA', avatarBg: 'bg-orange-500', score: 88 },
    ],
  },
  {
    key: 'offer',
    label: 'Offer',
    color: 'bg-emerald-50 border-emerald-100',
    headerColor: 'bg-emerald-50 border-b-2 border-emerald-300',
    candidates: [
      { id: 8, name: 'Yuki Tanaka', role: 'Data Analyst', email: 'yuki.t@email.com', experience: '4 years', appliedDate: 'Apr 20', avatarInitials: 'YT', avatarBg: 'bg-red-500', score: 94 },
      { id: 9, name: 'Omar Farouk', role: 'Safety Officer', email: 'omar.f@email.com', experience: '9 years', appliedDate: 'Apr 18', avatarInitials: 'OF', avatarBg: 'bg-cyan-600', score: 91 },
    ],
  },
]

export function Recruitment() {
  const loading = usePageLoad()
  if (loading) return <RecruitmentSkeleton />
  return (
    <div>
      <PageHeader
        title="Recruitment"
        subtitle="Manage candidates across hiring pipeline"
        action={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>
        }
      />

      {/* Pipeline summary */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {columns.map((col, i) => (
          <React.Fragment key={col.key}>
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className="font-medium text-gray-700">{col.label}</span>
              <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                {col.candidates.length}
              </span>
            </div>
            {i < columns.length - 1 && (
              <div className="w-12 h-0.5 bg-gray-200 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.key} className={`rounded-xl border ${col.color} overflow-hidden`}>
            <div className={`px-4 py-3 ${col.headerColor}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 text-sm">{col.label}</span>
                <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {col.candidates.length}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-3 min-h-[200px]">
              {col.candidates.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-grab">
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full ${c.avatarBg} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {c.avatarInitials}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{c.name}</p>
                        <p className="text-xs text-gray-500 leading-tight">{c.role}</p>
                      </div>
                    </div>
                    <button className="p-1 text-gray-300 hover:text-gray-500 transition-colors rounded">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <Badge variant="gray">{c.experience}</Badge>
                    {c.score !== undefined && (
                      <Badge variant={c.score >= 90 ? 'green' : c.score >= 80 ? 'blue' : 'yellow'}>
                        Score: {c.score}%
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2.5 border-t border-gray-100">
                    <span>Applied {c.appliedDate}</span>
                    <div className="flex items-center gap-2">
                      <button className="hover:text-blue-600 transition-colors" title="Email">
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button className="hover:text-emerald-600 transition-colors" title="Call">
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-3 pb-3">
              <button className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
