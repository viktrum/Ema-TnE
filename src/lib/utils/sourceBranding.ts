/**
 * Shared brand mapping for data sources → product names + colors + icons.
 * Used by SourceCardGrid, source-attributed reasoning bullets, and loading animations.
 */

export interface BrandedSource {
  label: string;
  color: string;      // text color
  bg: string;          // background color
  dotColor: string;    // branded dot color
  icon: string;        // lucide icon name
}

export const BRAND_MAP: Record<string, BrandedSource> = {
  // Core integrations — branded colors
  Calendar:              { label: 'Google Calendar',   color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#4285F4]',  icon: 'Calendar' },
  CRM:                   { label: 'Salesforce',        color: 'text-sky-700',     bg: 'bg-sky-50',     dotColor: 'bg-[#00A1E0]',  icon: 'Building2' },
  Policy:                { label: 'Company Policy',    color: 'text-gray-700',    bg: 'bg-gray-100',   dotColor: 'bg-gray-500',   icon: 'Shield' },
  Email:                 { label: 'Gmail',             color: 'text-red-700',     bg: 'bg-red-50',     dotColor: 'bg-[#EA4335]',  icon: 'Mail' },
  Card:                  { label: 'Corp Card Feed',    color: 'text-indigo-700',  bg: 'bg-indigo-50',  dotColor: 'bg-indigo-500', icon: 'CreditCard' },
  Employee:              { label: 'Employee Input',    color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-blue-500',   icon: 'UserCircle' },
  Slack:                 { label: 'Slack',             color: 'text-purple-700',  bg: 'bg-purple-50',  dotColor: 'bg-[#4A154B]',  icon: 'Hash' },

  // Seed data source strings — branded where possible
  'Transaction History': { label: 'Card Transactions', color: 'text-indigo-700',  bg: 'bg-indigo-50',  dotColor: 'bg-indigo-500', icon: 'CreditCard' },
  'Payment Gateway':     { label: 'Razorpay',         color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#2D64BC]',  icon: 'Wallet' },
  'Pattern Analysis':    { label: 'Ema Analytics',     color: 'text-emerald-700', bg: 'bg-emerald-50', dotColor: 'bg-[#1F8844]',  icon: 'Sparkles' },
  'Gap Analysis':        { label: 'Ema Analytics',     color: 'text-emerald-700', bg: 'bg-emerald-50', dotColor: 'bg-[#1F8844]',  icon: 'Sparkles' },
  'Receipt Scanner':     { label: 'Receipt OCR',      color: 'text-teal-700',    bg: 'bg-teal-50',    dotColor: 'bg-teal-500',   icon: 'ScanLine' },
  HRMS:                  { label: 'SAP SuccessFactors',color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#0070F2]',  icon: 'Users' },
  'Pre-Approval System': { label: 'ServiceNow',       color: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-[#81B5A1]',  icon: 'ClipboardCheck' },
  'Pre-Approval':        { label: 'ServiceNow',       color: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-[#81B5A1]',  icon: 'ClipboardCheck' },
  'Booking System':      { label: 'TripActions',       color: 'text-violet-700',  bg: 'bg-violet-50',  dotColor: 'bg-violet-500', icon: 'Plane' },
  'HR Org Chart':        { label: 'SAP Org Chart',    color: 'text-blue-700',    bg: 'bg-blue-50',    dotColor: 'bg-[#0070F2]',  icon: 'Users' },
  'Conference Agenda':   { label: 'Event Agenda',      color: 'text-orange-700',  bg: 'bg-orange-50',  dotColor: 'bg-orange-500', icon: 'CalendarDays' },
  'Currency Exchange':   { label: 'XE Rates',          color: 'text-green-700',   bg: 'bg-green-50',   dotColor: 'bg-green-600',  icon: 'ArrowLeftRight' },
  'RBI Reference Rates': { label: 'RBI Rates',         color: 'text-red-700',     bg: 'bg-red-50',     dotColor: 'bg-[#C41E3A]',  icon: 'Landmark' },
  'Uber Receipt':        { label: 'Uber',              color: 'text-gray-800',    bg: 'bg-gray-100',   dotColor: 'bg-black',      icon: 'Car' },
};

const FALLBACK: BrandedSource = { label: '', color: 'text-gray-600', bg: 'bg-gray-50', dotColor: 'bg-gray-400', icon: 'FileText' };

export function getBrand(source: string): BrandedSource {
  // Exact match first
  if (BRAND_MAP[source]) return BRAND_MAP[source];

  // Partial match for sources with extra context like "Calendar (Meeting at...)"
  for (const key of Object.keys(BRAND_MAP)) {
    if (source.startsWith(key)) return BRAND_MAP[key];
  }

  return { ...FALLBACK, label: source };
}
