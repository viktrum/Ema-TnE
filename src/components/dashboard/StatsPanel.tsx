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

export function StatsPanel({ stats, flagTypes, trend }: StatsPanelProps) {
  const maxFlagCount = Math.max(...flagTypes.map((f) => f.count), 1);

  return (
    <div className="space-y-4">
      {/* Horizontal stats strip */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <p className="text-[11px] text-gray-500 mb-1">{stat.label}</p>
            <p className="text-lg font-semibold text-gray-800">{stat.value}</p>
            {stat.change && (
              <div className="flex items-center gap-1 mt-0.5">
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : stat.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-green-600" />
                ) : null}
                <span className="text-[10px] text-green-600">{stat.change}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Flag types + trend side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Flag type distribution */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Flag Types</h3>
          <div className="space-y-2">
            {flagTypes.map((flag) => (
              <div key={flag.type}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-600">{flag.type}</span>
                  <span className="text-xs font-medium text-gray-800">{flag.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(flag.count / maxFlagCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval rate trend */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Approval Rate Trend</h3>
          <div className="flex items-end gap-3 h-20">
            {trend.map((point) => (
              <div key={point.week} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-t bg-[#1F8844]/80 transition-all"
                  style={{ height: `${(point.rate / 100) * 80}px` }}
                />
                <span className="mt-1 text-[10px] text-gray-500">{point.rate}%</span>
                <span className="text-[9px] text-gray-400">{point.week.replace('Week ', 'W')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
