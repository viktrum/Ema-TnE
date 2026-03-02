'use client';

import { getBrand } from '@/lib/utils/sourceBranding';

interface SourceCardGridProps {
  sources: string[];
}

export function SourceCardGrid({ sources }: SourceCardGridProps) {
  if (!sources || sources.length === 0) return null;

  // Deduplicate by branded label (e.g., two "Calendar" variants → one "Google Calendar")
  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    const brand = getBrand(s);
    if (seen.has(brand.label)) return false;
    seen.add(brand.label);
    return true;
  });

  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((source) => {
        const brand = getBrand(source);
        return (
          <div
            key={source}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${brand.bg}`}
          >
            <span className={`h-2 w-2 rounded-full ${brand.dotColor}`} />
            <span className={`text-[11px] font-medium ${brand.color}`}>{brand.label}</span>
          </div>
        );
      })}
    </div>
  );
}
