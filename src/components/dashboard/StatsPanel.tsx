'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
}

interface FlagType {
  type: string;
  count: number;
}

interface TrendPoint {
  week: string;
  rate: number;
}

interface StatsPanelProps {
  stats: Stat[];
  flagTypes: FlagType[];
  trend: TrendPoint[];
}

export function StatsPanel({ stats, flagTypes }: StatsPanelProps) {
  const maxFlagCount = Math.max(...flagTypes.map((f) => f.count), 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">T&E Health</h2>
        <p className="text-xs text-gray-500">CHRO View</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-gray-200 rounded-lg p-3"
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
            {stat.change && (
              <div className="flex items-center gap-1 mt-0.5">
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : stat.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-green-600" />
                ) : null}
                <span
                  className={`text-xs ${
                    stat.trend === 'up' || stat.trend === 'down'
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top Flag Types */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Top Flag Types
        </h3>
        <div className="space-y-2.5">
          {flagTypes.map((flag) => (
            <div key={flag.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">{flag.type}</span>
                <span className="text-xs font-medium text-gray-900">
                  {flag.count}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(flag.count / maxFlagCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
