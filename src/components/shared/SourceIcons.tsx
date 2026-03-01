"use client";

import {
  CreditCard,
  Calendar,
  Database,
  Mail,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

interface SourceIconsProps {
  sources: string[];
}

interface SourceConfig {
  color: string;
  bgClass: string;
  textClass: string;
  label: string;
  icon: LucideIcon;
}

const SOURCE_MAP: Record<string, SourceConfig> = {
  corporate_card: {
    color: "#3B82F6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-600",
    label: "Card",
    icon: CreditCard,
  },
  card: {
    color: "#3B82F6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-600",
    label: "Card",
    icon: CreditCard,
  },
  google_calendar: {
    color: "#22C55E",
    bgClass: "bg-green-500/15",
    textClass: "text-green-600",
    label: "Calendar",
    icon: Calendar,
  },
  calendar: {
    color: "#22C55E",
    bgClass: "bg-green-500/15",
    textClass: "text-green-600",
    label: "Calendar",
    icon: Calendar,
  },
  salesforce_crm: {
    color: "#8B5CF6",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-600",
    label: "CRM",
    icon: Database,
  },
  crm: {
    color: "#8B5CF6",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-600",
    label: "CRM",
    icon: Database,
  },
  email: {
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-600",
    label: "Email",
    icon: Mail,
  },
  email_confirmation: {
    color: "#F59E0B",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-600",
    label: "Email",
    icon: Mail,
  },
  company_policy: {
    color: "#6B7280",
    bgClass: "bg-gray-500/15",
    textClass: "text-gray-600",
    label: "Policy",
    icon: Shield,
  },
  policy: {
    color: "#6B7280",
    bgClass: "bg-gray-500/15",
    textClass: "text-gray-600",
    label: "Policy",
    icon: Shield,
  },
  employee_input: {
    color: "#3B82F6",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-600",
    label: "Employee",
    icon: User,
  },
};

export function SourceIcons({ sources }: SourceIconsProps) {
  // Deduplicate by label to avoid showing "Card" twice for "corporate_card" and "card"
  const seen = new Set<string>();
  const uniqueSources = sources.filter((s) => {
    const config = SOURCE_MAP[s];
    if (!config || seen.has(config.label)) return false;
    seen.add(config.label);
    return true;
  });

  return (
    <div className="flex flex-wrap gap-1">
      {uniqueSources.map((source) => {
        const config = SOURCE_MAP[source];
        if (!config) return null;

        const Icon = config.icon;

        return (
          <span
            key={source}
            className={`inline-flex h-6 items-center gap-1 rounded-md px-1.5 ${config.bgClass} ${config.textClass}`}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">{config.label}</span>
          </span>
        );
      })}
    </div>
  );
}

export { SOURCE_MAP };
