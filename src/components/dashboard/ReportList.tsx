'use client';

interface Report {
  id: string | number;
  traveler_name: string;
  traveler_role: string;
  traveler_initials: string;
  destination: string;
  dates: string;
  total_amount: number;
  currency: string;
  item_count: number;
  avg_confidence: number;
}

interface ReportListProps {
  reports: Report[];
  count: number;
  percentage: number;
}

export function ReportList({ reports, count, percentage }: ReportListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Auto-Approved</h2>
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          {count} &middot; {percentage}%
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)] space-y-2 pr-1">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 mb-2"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {report.traveler_initials}
                </span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {report.traveler_name}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                    Auto-Approved
                  </span>
                </div>
                <p className="text-xs text-gray-500">{report.traveler_role}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {report.destination} &middot; {report.dates}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-sm font-mono font-medium text-gray-900">
                    {report.currency}
                    {report.total_amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {report.item_count} items &middot;{' '}
                    {report.avg_confidence}% confidence
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
