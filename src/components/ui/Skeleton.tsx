// ─── Base primitive ───────────────────────────────────────────────────────────
export function Sk({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

// ─── Page header ──────────────────────────────────────────────────────────────
export function SkPageHeader({ hasAction = true }: { hasAction?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <Sk className="h-6 w-44 rounded-lg" />
        <Sk className="h-4 w-28 rounded-md" />
      </div>
      {hasAction && <Sk className="h-9 w-32 rounded-lg" />}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
export function SkStatCard() {
  return (
    <div className="card p-5 flex items-start gap-4">
      <Sk className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <Sk className="h-3.5 w-24 rounded-md" />
        <Sk className="h-7 w-16 rounded-md" />
        <Sk className="h-3 w-28 rounded-md" />
      </div>
    </div>
  )
}

export function SkStatCards({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => <SkStatCard key={i} />)}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────
const ROW_WIDTHS = [
  ['w-32', 'w-24', 'w-20', 'w-16', 'w-20', 'w-16'],
  ['w-40', 'w-20', 'w-28', 'w-12', 'w-24', 'w-16'],
  ['w-36', 'w-28', 'w-16', 'w-20', 'w-16', 'w-12'],
  ['w-28', 'w-32', 'w-24', 'w-16', 'w-20', 'w-14'],
  ['w-44', 'w-20', 'w-20', 'w-12', 'w-28', 'w-16'],
  ['w-32', 'w-24', 'w-28', 'w-16', 'w-20', 'w-12'],
  ['w-36', 'w-28', 'w-16', 'w-20', 'w-24', 'w-16'],
  ['w-40', 'w-20', 'w-24', 'w-14', 'w-16', 'w-12'],
]

export function SkTableRow({ cols, hasAvatar = false }: { cols: number; hasAvatar?: boolean }) {
  const widths = ROW_WIDTHS[Math.floor(Math.random() * ROW_WIDTHS.length)]
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="table-td">
          {i === 0 && hasAvatar ? (
            <div className="flex items-center gap-3">
              <Sk className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Sk className="h-3.5 w-24 rounded-md" />
                <Sk className="h-3 w-32 rounded-md" />
              </div>
            </div>
          ) : (
            <Sk className={`h-4 rounded-md ${widths[i % widths.length]}`} />
          )}
        </td>
      ))}
    </tr>
  )
}

export function SkTable({
  rows = 7,
  cols = 5,
  hasToolbar = true,
  hasAvatar = false,
}: {
  rows?: number
  cols?: number
  hasToolbar?: boolean
  hasAvatar?: boolean
}) {
  return (
    <div className="card overflow-hidden">
      {hasToolbar && (
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Sk className="h-9 flex-1 max-w-xs rounded-lg" />
          <Sk className="h-9 w-24 rounded-lg" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="table-th">
                  <Sk className="h-3.5 w-16 rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: rows }).map((_, i) => (
              <SkTableRow key={i} cols={cols} hasAvatar={hasAvatar} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Toolbar only ─────────────────────────────────────────────────────────────
export function SkToolbar() {
  return (
    <div className="card p-4 mb-4 flex items-center gap-3">
      <Sk className="h-9 flex-1 max-w-xs rounded-lg" />
      <Sk className="h-9 w-24 rounded-lg" />
    </div>
  )
}

// ─── News card ────────────────────────────────────────────────────────────────
export function SkNewsCard() {
  return (
    <div className="card overflow-hidden">
      <Sk className="h-36 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sk className="h-5 w-16 rounded-full" />
          <Sk className="h-4 w-20 rounded-md" />
        </div>
        <Sk className="h-5 w-full rounded-md" />
        <Sk className="h-4 w-4/5 rounded-md" />
        <div className="space-y-2 pt-1">
          <Sk className="h-3.5 w-full rounded-md" />
          <Sk className="h-3.5 w-3/4 rounded-md" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Sk className="w-6 h-6 rounded-full" />
          <Sk className="h-3.5 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}

// ─── Kanban card ──────────────────────────────────────────────────────────────
export function SkKanbanCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sk className="w-8 h-8 rounded-full" />
        <div className="space-y-1 flex-1">
          <Sk className="h-3.5 w-28 rounded-md" />
          <Sk className="h-3 w-20 rounded-md" />
        </div>
      </div>
      <Sk className="h-3.5 w-3/4 rounded-md" />
      <div className="flex gap-2">
        <Sk className="h-5 w-14 rounded-full" />
        <Sk className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function SkAssetGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <Sk className="w-full aspect-square rounded-none" />
          <div className="px-3 py-2.5 space-y-1.5">
            <Sk className="h-3.5 w-3/4 rounded-md" />
            <Sk className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkKanbanColumn({ cards = 3 }: { cards?: number }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <Sk className="h-5 w-24 rounded-md" />
        <Sk className="h-5 w-6 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: cards }).map((_, i) => <SkKanbanCard key={i} />)}
      </div>
    </div>
  )
}

// ─── Week bar (ShiftAttendance) ───────────────────────────────────────────────
export function SkWeekBar() {
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <Sk className="h-4 w-40 rounded-md" />
        <Sk className="h-4 w-24 rounded-md" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl p-3 bg-gray-50 flex flex-col items-center gap-1.5">
            <Sk className="h-3 w-6 rounded-md" />
            <Sk className="h-6 w-8 rounded-md" />
            <Sk className="h-3 w-6 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Calendar grid (ClockInOut) ───────────────────────────────────────────────
export function SkCalendarGrid() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <Sk className="h-5 w-36 rounded-md" />
        <div className="flex items-center gap-1">
          <Sk className="h-8 w-8 rounded-lg" />
          <Sk className="h-8 w-14 rounded-lg" />
          <Sk className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {['S','M','T','W','T','F','S'].map((_d, i) => (
          <Sk key={i} className="h-4 w-5 mx-auto rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-0.5 p-1">
            <Sk className="h-4 w-4 rounded-md" />
            {i % 5 !== 0 && i % 7 !== 0 && i % 7 !== 6 && i < 28 && (
              <Sk className="h-2.5 w-7 rounded-sm" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Sk className="w-3 h-3 rounded-sm" />
            <Sk className="h-3 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Clock detail panel (ClockInOut) ─────────────────────────────────────────
export function SkClockPanel() {
  return (
    <div className="card p-5 space-y-4">
      <Sk className="h-5 w-40 rounded-md" />
      <Sk className="h-8 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <Sk className="h-3 w-14 rounded-md" />
          <Sk className="h-7 w-16 rounded-md" />
        </div>
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <Sk className="h-3 w-14 rounded-md" />
          <Sk className="h-7 w-16 rounded-md" />
        </div>
      </div>
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <Sk className="h-3.5 w-28 rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <Sk className="h-3.5 w-16 rounded-md" />
              <Sk className="h-3 w-24 rounded-md" />
            </div>
            <Sk className="h-4 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activity item (Dashboard) ────────────────────────────────────────────────
export function SkActivityItem() {
  return (
    <div className="flex items-start gap-3 py-3">
      <Sk className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Sk className="h-3.5 w-full rounded-md" />
        <Sk className="h-3.5 w-3/4 rounded-md" />
      </div>
      <Sk className="h-3.5 w-16 rounded-md flex-shrink-0" />
    </div>
  )
}

// ─── Bar chart placeholder (Reports) ─────────────────────────────────────────
export function SkBarChart() {
  const heights = ['h-24', 'h-16', 'h-32', 'h-20', 'h-36', 'h-12', 'h-28', 'h-10', 'h-24', 'h-16', 'h-8', 'h-20']
  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <Sk className="h-5 w-36 rounded-md" />
        <Sk className="h-8 w-28 rounded-lg" />
      </div>
      <div className="flex items-end gap-3 h-40 px-2">
        {heights.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Sk className={`w-full ${h} rounded-t-md`} />
            <Sk className="h-3 w-6 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
