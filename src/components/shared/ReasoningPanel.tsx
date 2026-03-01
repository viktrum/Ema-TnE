"use client";

import { Calendar, Database, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReasoningPanelProps {
  reasoning: string;
  sources: string[];
  confidence: number;
  category: string;
  original_category: string | null;
  policy_status: string;
  isExpanded: boolean;
  onToggle: () => void;
  isHeroItem?: boolean;
}

interface SourceCard {
  type: "calendar" | "crm" | "policy";
  title: string;
  excerpt: string;
}

function parseSourceCards(reasoning: string): SourceCard[] {
  const cards: SourceCard[] = [];

  // Look for Calendar-related content
  const calendarMatch = reasoning.match(
    /(?:Calendar|calendar|meeting|Meeting)[:\s—\-]+([^.]+(?:\.[^.]+)?)/i
  );
  if (calendarMatch) {
    cards.push({
      type: "calendar",
      title: "Calendar Match",
      excerpt: calendarMatch[1].trim(),
    });
  }

  // Look for CRM-related content
  const crmMatch = reasoning.match(
    /(?:CRM|Salesforce|crm|deal|Deal|opportunity|Opportunity)[:\s—\-]+([^.]+(?:\.[^.]+)?)/i
  );
  if (crmMatch) {
    cards.push({
      type: "crm",
      title: "CRM Record",
      excerpt: crmMatch[1].trim(),
    });
  }

  // Look for Policy-related content
  const policyMatch = reasoning.match(
    /(?:Policy|policy|rule|Rule|limit|Limit|complian|Complian)[:\s—\-]+([^.]+(?:\.[^.]+)?)/i
  );
  if (policyMatch) {
    cards.push({
      type: "policy",
      title: "Policy Check",
      excerpt: policyMatch[1].trim(),
    });
  }

  return cards;
}

const CARD_CONFIG = {
  calendar: {
    borderColor: "border-l-green-500",
    iconColor: "text-green-600",
    bgColor: "bg-green-50",
    Icon: Calendar,
  },
  crm: {
    borderColor: "border-l-violet-500",
    iconColor: "text-violet-600",
    bgColor: "bg-violet-50",
    Icon: Database,
  },
  policy: {
    borderColor: "border-l-gray-500",
    iconColor: "text-gray-600",
    bgColor: "bg-gray-50",
    Icon: Shield,
  },
} as const;

function SourceCardDisplay({ card }: { card: SourceCard }) {
  const config = CARD_CONFIG[card.type];
  const { Icon } = config;

  return (
    <div
      className={cn(
        "flex-1 rounded-md border-l-3 p-3",
        config.borderColor,
        config.bgColor
      )}
    >
      <div className={cn("mb-1.5 flex items-center gap-1.5", config.iconColor)}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold">{card.title}</span>
      </div>
      <p className="text-xs leading-relaxed text-gray-700">{card.excerpt}</p>
    </div>
  );
}

export function ReasoningPanel({
  reasoning,
  confidence,
  original_category,
  isExpanded,
  isHeroItem = false,
}: ReasoningPanelProps) {
  if (!isExpanded) return null;

  const isSimple =
    !isHeroItem && confidence > 0.9 && original_category === null;
  const sourceCards = parseSourceCards(reasoning);
  const showFullLayout = isHeroItem || sourceCards.length >= 2;

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-1 duration-200">
      {isSimple && !showFullLayout ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700">
          {reasoning}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-gray-700">{reasoning}</p>

          {sourceCards.length > 0 && (
            <div className="flex gap-3">
              {sourceCards.map((card) => (
                <SourceCardDisplay key={card.type} card={card} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
