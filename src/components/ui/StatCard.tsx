import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down'
  }
  iconBgColor?: string
}

export function StatCard({ title, value, icon, trend, iconBgColor = 'bg-blue-50' }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`${iconBgColor} rounded-xl p-3 flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <span
              className={`text-xs font-medium ${
                trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trend.value}%
            </span>
            <span className="text-xs text-gray-400">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
