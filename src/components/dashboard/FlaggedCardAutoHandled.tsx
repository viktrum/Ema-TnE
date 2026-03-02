'use client';

import { CheckCircle } from 'lucide-react';

interface FlaggedItem {
  id: number;
  traveler_name: string;
  flag_reason: string;
  total_amount: number;
  currency: string;
  avg_confidence: number;
}

interface FlaggedCardAutoHandledProps {
  item: FlaggedItem;
}

export function FlaggedCardAutoHandled({ item }: FlaggedCardAutoHandledProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 border border-gray-100">
      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
      <span className="text-sm text-gray-700 truncate flex-1">{item.traveler_name}</span>
      <span className="text-xs text-gray-400 truncate max-w-[250px]">{item.flag_reason}</span>
      <span className="shrink-0 text-xs font-mono text-gray-500">
        {item.currency === 'GBP' ? '£' : '₹'}{item.total_amount?.toLocaleString('en-IN')}
      </span>
      <span className="text-[10px] text-green-600 font-medium">{item.avg_confidence}%</span>
    </div>
  );
}
