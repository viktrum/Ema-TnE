'use client';

import {
  CheckCircle,
  XCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FlaggedItemDetail {
  description: string;
  amount: number;
  currency: string;
  flag_reason: string;
}

interface FlaggedItem {
  id: number;
  traveler_name: string;
  destination: string;
  dates: string;
  total_amount: number;
  currency: string;
  avg_confidence: number;
  flag_reason: string;
  flag_severity: 'HIGH' | 'MEDIUM' | 'LOW';
  items?: FlaggedItemDetail[];
  reasoning?: string;
  sources?: string[];
}

interface FlaggedPanelProps {
  items: FlaggedItem[];
  expandedId: number | null;
  onToggle: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onAsk: (id: number) => void;
}

const severityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function FlaggedPanel({
  items,
  expandedId,
  onToggle,
  onApprove,
  onReject,
  onAsk,
}: FlaggedPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Flagged for Review
        </h2>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          {items.length} &middot;{' '}
          {items.length > 0
            ? `${Math.round((items.length / (items.length + 38)) * 100)}%`
            : '0%'}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)] space-y-2 pr-1">
        {items.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Collapsed header — always visible */}
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.traveler_name}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityColors[item.flag_severity]}`}
                    >
                      {item.flag_severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.destination} &middot; {item.dates}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {item.flag_reason}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-mono font-medium text-gray-900">
                      {item.currency}
                      {item.total_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.avg_confidence}% confidence
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 mt-1 text-gray-400">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                  {/* Flagged line items */}
                  {item.items && item.items.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {item.items.map((lineItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-700">
                            {lineItem.description}
                          </span>
                          <span className="font-mono text-gray-900">
                            {lineItem.currency}
                            {lineItem.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reasoning */}
                  {item.reasoning && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        AI Reasoning
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Sources */}
                  {item.sources && item.sources.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {item.sources.map((source, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove(item.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject(item.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAsk(item.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Ask Employee
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
