'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, XCircle, MessageCircle, AlertTriangle, ArrowRight,
  ChevronDown, ChevronUp, Shield,
  Calendar, Building2, Hash, Mail, CreditCard, Users, Plane, ScanLine,
  Sparkles, ClipboardCheck, CalendarDays, ArrowLeftRight, Landmark, Car,
  Wallet, UserCircle, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { deriveRecommendation } from '@/lib/utils/deriveRecommendation';
import { getBrand } from '@/lib/utils/sourceBranding';
import type { AiRecommendation, SourceFinding } from '@/lib/llm/prompts/dashboard-recommendations';

const ICON_MAP: Record<string, LucideIcon> = {
  Calendar, Building2, Hash, Mail, CreditCard, Users, Plane, ScanLine,
  Sparkles, ClipboardCheck, CalendarDays, ArrowLeftRight, Landmark, Car,
  Wallet, UserCircle, FileText, Shield,
};

function SourceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || FileText;
  return <Icon className={className || 'h-3 w-3'} />;
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
  flag_severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning?: unknown;
  sources?: string[];
}

interface FlaggedCardReviewProps {
  item: FlaggedItem;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onAsk: (id: number) => void;
  disabled?: boolean;
  aiRecommendation?: AiRecommendation | null;
  isAiLoading?: boolean;
}

/** Extract short category from flag_reason (text before the colon) */
function shortCategory(flagReason: string): string {
  const colonIdx = flagReason.indexOf(':');
  if (colonIdx > 0 && colonIdx < 40) return flagReason.slice(0, colonIdx);
  return flagReason.slice(0, 50);
}

const ACTION_STYLES = {
  approve: 'bg-[#1F8844] text-white hover:bg-[#176B36]',
  reject: 'bg-red-600 text-white hover:bg-red-700',
  ask: 'bg-amber-500 text-white hover:bg-amber-600',
} as const;

const ACTION_ICONS = { approve: CheckCircle, reject: XCircle, ask: MessageCircle } as const;

export function FlaggedCardReview({
  item,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  onAsk,
  disabled,
  aiRecommendation,
  isAiLoading,
}: FlaggedCardReviewProps) {
  const [justVerified, setJustVerified] = useState(false);
  const prevAiRef = useRef<AiRecommendation | null | undefined>(null);
  const deterministicRec = deriveRecommendation(item.flag_reason);
  const recommendation = aiRecommendation || deterministicRec;
  const sources = item.sources || [];
  const RecommendedIcon = ACTION_ICONS[recommendation.action];
  const currencySymbol = item.currency === 'GBP' ? '£' : '₹';

  const hasOverride = aiRecommendation && aiRecommendation.action !== deterministicRec.action;
  const hasSourceFindings = aiRecommendation?.sourceFindings && aiRecommendation.sourceFindings.length > 0;
  const sourceCount = hasSourceFindings ? aiRecommendation!.sourceFindings.length : sources.length;

  // Detect transition: loading → verified
  useEffect(() => {
    if (aiRecommendation && !prevAiRef.current) {
      prevAiRef.current = aiRecommendation;
      setJustVerified(true);
      const timer = setTimeout(() => setJustVerified(false), 1000);
      return () => clearTimeout(timer);
    }
    prevAiRef.current = aiRecommendation;
  }, [aiRecommendation]);

  const handleAction = (action: 'approve' | 'reject' | 'ask') => {
    if (action === 'approve') onApprove(item.id);
    else if (action === 'reject') onReject(item.id);
    else onAsk(item.id);
  };

  return (
    <div className={`rounded-xl border bg-white transition-all duration-300 ${
      isExpanded ? 'shadow-md border-gray-300'
        : justVerified ? 'border-[#1F8844]/30 animate-ai-verified'
          : 'shadow-sm border-gray-200 hover:shadow-md'
    }`}>
      {/* ═══ Compact header row — scan layer ═══ */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-sm font-medium text-gray-800 truncate flex-1">{item.traveler_name}</span>
        <span className="text-xs text-gray-500 truncate max-w-[200px]">{shortCategory(item.flag_reason)}</span>
        <span className="shrink-0 text-xs font-mono font-semibold text-gray-700">
          {currencySymbol}{item.total_amount?.toLocaleString('en-IN')}
        </span>

        {/* Inline recommended action */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleAction(recommendation.action)}
            disabled={disabled}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
          >
            <RecommendedIcon className="h-3 w-3" />
            {recommendation.label}
          </button>
        </div>

        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </div>

      {/* ═══ Expanded detail — evidence layer ═══ */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 pb-3 pt-3 space-y-2.5 animate-fadeIn" style={{ animationDuration: '200ms' }}>
          {/* Context line */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{item.destination}</span>
            <span>·</span>
            <span>{item.dates}</span>
            {sourceCount > 0 && (
              <>
                <span>·</span>
                <span>{sourceCount} source{sourceCount !== 1 ? 's' : ''} verified</span>
              </>
            )}
          </div>

          {/* Override hero line (if AI overrode) */}
          {hasOverride && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <span className="text-red-500 font-medium line-through decoration-red-300/70">
                  {deterministicRec.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[#1F8844] font-bold">{recommendation.label}</span>
              </span>
            </div>
          )}

          {/* Ema's take — rationale */}
          <div className="flex items-start gap-2">
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-[7px] font-bold text-white mt-0.5">
              E
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {isAiLoading && !aiRecommendation ? 'Ema is analyzing...' : recommendation.rationale}
            </p>
          </div>

          {/* Source-attributed findings with branded icons */}
          {hasSourceFindings && (
            <ul className="ml-6 space-y-1.5">
              {aiRecommendation!.sourceFindings.map((f: SourceFinding, i: number) => {
                const brand = getBrand(f.source);
                return (
                  <li key={i} className="flex items-center gap-2 animate-fadeIn" style={{ animationDelay: `${i * 80}ms` }}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${brand.bg}`}>
                      <SourceIcon name={brand.icon} className={`h-2.5 w-2.5 ${brand.color}`} />
                    </span>
                    <span className={`text-[11px] font-semibold ${brand.color} shrink-0`}>{brand.label}</span>
                    <span className="text-[11px] text-gray-500">{f.finding}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => handleAction(recommendation.action)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
            >
              <RecommendedIcon className="h-3.5 w-3.5" />
              {recommendation.label}
            </button>
            <span className="h-4 w-px bg-gray-200" />
            {recommendation.action !== 'approve' && (
              <button onClick={() => onApprove(item.id)} disabled={disabled}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-[#1F8844] hover:bg-green-50 disabled:opacity-50">
                Approve
              </button>
            )}
            {recommendation.action !== 'reject' && (
              <button onClick={() => onReject(item.id)} disabled={disabled}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">
                Reject
              </button>
            )}
            {recommendation.action !== 'ask' && (
              <button onClick={() => onAsk(item.id)} disabled={disabled}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50">
                Ask Employee
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
