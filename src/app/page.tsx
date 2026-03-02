'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { MapPin, Calendar, FileText, ArrowRight, LayoutDashboard } from 'lucide-react';

const SCENARIO_META: Record<string, { color: string; badge: string }> = {
  'mumbai-trip': { color: 'border-l-amber-500', badge: 'Domestic' },
  'bangalore-trip': { color: 'border-l-green-500', badge: 'Domestic' },
  'london-trip': { color: 'border-l-blue-500', badge: 'International' },
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const month = s.toLocaleDateString('en-IN', { month: 'short' });
  return `${s.getDate()}-${e.getDate()} ${month} ${s.getFullYear()}`;
}

export default function ScenarioSelectorPage() {
  const router = useRouter();
  const { data: scenarios, isLoading } = trpc.scenario.list.useQuery();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-3xl">
        {/* Branding */}
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F8844]">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <span className="text-sm font-medium tracking-wide text-[#1F8844]">ema</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">NexGen Industries</h1>
          <p className="mt-1 text-sm text-gray-500">T&amp;E AI Employee &mdash; Select a scenario to demo</p>
        </div>

        {/* Scenario Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1F8844] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(scenarios || []).map((s) => {
              const meta = SCENARIO_META[s.id] || { color: 'border-l-gray-400', badge: 'Other' };
              return (
                <div
                  key={s.id}
                  className={`group relative rounded-xl border border-gray-200 border-l-4 ${meta.color} bg-white p-5 shadow-sm transition-all hover:shadow-md`}
                >
                  <span className="mb-3 inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    {meta.badge}
                  </span>
                  <h2 className="text-base font-semibold text-gray-900">{s.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{s.traveler_name}</p>
                  <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{s.destination}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDateRange(s.start_date, s.end_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{s.item_count} transactions</span>
                    </div>
                  </div>
                  {s.purpose && (
                    <p className="mt-3 text-xs leading-relaxed text-gray-400 line-clamp-2">{s.purpose}</p>
                  )}
                  <div className="mt-4">
                    <button
                      onClick={() => router.push(`/login?next=${encodeURIComponent(`/chat?scenario=${s.id}`)}`)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F8844] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#186d36]"
                    >
                      Start Demo
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push(`/login?next=${encodeURIComponent('/dashboard')}`)}
            className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-[#1F8844]"
          >
            <LayoutDashboard className="h-4 w-4" />
            View Manager Dashboard
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">Demo environment &mdash; select a scenario above</p>
      </div>
    </div>
  );
}
