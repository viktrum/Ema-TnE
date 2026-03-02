'use client';

interface SourceCardGridProps {
  sources: string[];
}

interface BrandedSource {
  label: string;
  color: string;      // text color
  bg: string;          // background color
  dotColor: string;    // branded dot color
}

/**
 * Maps raw source strings from seed data → branded product names + colors.
 * Uses recognizable brand colors so the panel "feels" like real integrations.
 */
const BRAND_MAP: Record<string, BrandedSource> = {
  // Core integrations — branded colors
  Calendar:              { label: 'Google Calendar',   color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#4285F4]' },
  CRM:                   { label: 'Salesforce',        color: 'text-sky-700',     bg: 'bg-sky-50',     dotColor: 'bg-[#00A1E0]' },
  Policy:                { label: 'Company Policy',    color: 'text-gray-700',    bg: 'bg-gray-100',   dotColor: 'bg-gray-500' },
  Email:                 { label: 'Gmail',             color: 'text-red-700',     bg: 'bg-red-50',     dotColor: 'bg-[#EA4335]' },
  Card:                  { label: 'Corp Card Feed',    color: 'text-indigo-700',  bg: 'bg-indigo-50',  dotColor: 'bg-indigo-500' },
  Employee:              { label: 'Employee Input',    color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-blue-500' },
  Slack:                 { label: 'Slack',             color: 'text-purple-700',  bg: 'bg-purple-50',  dotColor: 'bg-[#4A154B]' },

  // Seed data source strings — branded where possible
  'Transaction History': { label: 'Card Transactions', color: 'text-indigo-700',  bg: 'bg-indigo-50',  dotColor: 'bg-indigo-500' },
  'Payment Gateway':     { label: 'Razorpay',         color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#2D64BC]' },
  'Pattern Analysis':    { label: 'Ema Analytics',     color: 'text-emerald-700', bg: 'bg-emerald-50', dotColor: 'bg-[#1F8844]' },
  'Gap Analysis':        { label: 'Ema Analytics',     color: 'text-emerald-700', bg: 'bg-emerald-50', dotColor: 'bg-[#1F8844]' },
  'Receipt Scanner':     { label: 'Receipt OCR',      color: 'text-teal-700',    bg: 'bg-teal-50',    dotColor: 'bg-teal-500' },
  HRMS:                  { label: 'SAP SuccessFactors',color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#0070F2]' },
  'Pre-Approval System': { label: 'ServiceNow',       color: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-[#81B5A1]' },
  'Pre-Approval':        { label: 'ServiceNow',       color: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-[#81B5A1]' },
  'Booking System':      { label: 'TripActions',       color: 'text-violet-700',  bg: 'bg-violet-50',  dotColor: 'bg-violet-500' },
  'HR Org Chart':        { label: 'SAP Org Chart',    color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#0070F2]' },
  'Conference Agenda':   { label: 'Event Agenda',      color: 'text-orange-700',  bg: 'bg-orange-50',  dotColor: 'bg-orange-500' },
  'Currency Exchange':   { label: 'XE Rates',          color: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-green-600' },
  'RBI Reference Rates': { label: 'RBI Rates',         color: 'text-red-700',     bg: 'bg-red-50',     dotColor: 'bg-[#C41E3A]' },
  'Uber Receipt':        { label: 'Uber',              color: 'text-gray-800',    bg: 'bg-gray-100',   dotColor: 'bg-black' },
};

const FALLBACK: BrandedSource = { label: '', color: 'text-gray-600', bg: 'bg-gray-50', dotColor: 'bg-gray-400' };

function getBrand(source: string): BrandedSource {
  // Exact match first
  if (BRAND_MAP[source]) return BRAND_MAP[source];

  // Partial match for sources with extra context like "Calendar (Meeting at...)"
  for (const key of Object.keys(BRAND_MAP)) {
    if (source.startsWith(key)) return BRAND_MAP[key];
  }

  return { ...FALLBACK, label: source };
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
