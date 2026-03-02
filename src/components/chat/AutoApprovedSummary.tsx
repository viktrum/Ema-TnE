'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExpenseItem {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: string;
  confidence: number;
}

interface AutoApprovedSummaryProps {
  items: ExpenseItem[];
}

export default function AutoApprovedSummary({ items }: AutoApprovedSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="animate-in fade-in duration-300 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
            <span className="h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-[13px] font-semibold text-gray-900">
            {items.length} items auto-approved
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-wrap gap-1">
            {categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500"
              >
                {cat}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                +{categories.length - 3}
              </span>
            )}
          </div>
          <span className="font-mono text-[13px] font-semibold text-gray-700">
            ₹{total.toLocaleString('en-IN')}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="mt-3 divide-y divide-gray-100">
          {items.map((item) => {
            const confColor =
              item.confidence > 90 ? 'bg-green-500' : item.confidence >= 70 ? 'bg-amber-500' : 'bg-red-500';

            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${confColor}`} />
                  <span className="truncate text-[12px] text-gray-800">{item.description}</span>
                  <span className="shrink-0 text-[11px] text-gray-400">{item.date}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    {item.category}
                  </span>
                  <span className="font-mono text-[12px] text-gray-700">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
