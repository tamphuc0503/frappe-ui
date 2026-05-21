import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-4 flex-shrink-0">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${i}-${item.label}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
            {isLast || !item.to ? (
              <span className={isLast ? 'font-medium text-gray-700 truncate max-w-[220px]' : 'text-gray-400'}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="text-gray-400 hover:text-blue-600 transition-colors truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
