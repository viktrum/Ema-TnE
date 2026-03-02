'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle, XCircle, MessageCircle, AlertTriangle, ArrowRight,
  ChevronDown, ChevronUp,
  Calendar, Building2, Hash, Mail, CreditCard, Users, Plane, ScanLine,
  Sparkles, ClipboardCheck, CalendarDays, ArrowLeftRight, Landmark, Car,
  Wallet, UserCircle, FileText, Shield,
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

interface FlaggedCardDecisionProps {
  item: FlaggedItem;
  animationPhase: 'flash' | 'overlay' | 'collapsing' | null;
  isAnimating: boolean;
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

/** Loading state: source icons animate in */
function AiAnalyzing({ sources }: { sources: string[] }) {
  const brandedSources = sources.map((s) => getBrand(s));
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1F8844]/20 bg-[#1F8844]/5 px-3 py-2">
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-[9px] font-bold text-white">
        E
        <span className="absolute inset-0 rounded-full border-2 border-[#1F8844]/30 animate-ping" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[#1F8844]">Checking</span>
        {brandedSources.map((brand, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium animate-fadeIn ${brand.bg} ${brand.color}`}
            style={{ animationDelay: `${i * 400}ms`, animationFillMode: 'both' }}
          >
            <SourceIcon name={brand.icon} className="h-2.5 w-2.5" />
            {brand.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FlaggedCardDecision({
  item,
  animationPhase,
  isAnimating,
  onApprove,
  onReject,
  onAsk,
  disabled,
  aiRecommendation,
  isAiLoading,
}: FlaggedCardDecisionProps) {
  const [expanded, setExpanded] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const prevAiRef = useRef<AiRecommendation | null | undefined>(null);
  const deterministicRec = deriveRecommendation(item.flag_reason);
  const recommendation = aiRecommendation || deterministicRec;
  const sources = item.sources || [];
  const severity = item.flag_severity;
  const RecommendedIcon = ACTION_ICONS[recommendation.action];
  const currencySymbol = item.currency === 'GBP' ? '£' : '₹';

  const hasOverride = aiRecommendation && aiRecommendation.action !== deterministicRec.action;
  const hasSourceFindings = aiRecommendation?.sourceFindings && aiRecommendation.sourceFindings.length > 0;
  const isShimmering = isAiLoading && !aiRecommendation;
  const sourceCount = hasSourceFindings ? aiRecommendation!.sourceFindings.length : sources.length;

  // Detect transition: loading → verified (green pulse + fadeIn on content)
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
    <div
      className={`relative overflow-hidden rounded-xl border bg-white transition-all duration-300 ${
        isAnimating && animationPhase === 'flash'
          ? 'ring-2 ring-green-400 shadow-lg shadow-green-100'
          : isAnimating && animationPhase === 'collapsing'
            ? 'max-h-0 opacity-0 border-0 my-0 py-0'
            : justVerified
              ? 'border-[#1F8844]/30 animate-ai-verified'
              : 'border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Approve overlay */}
      {isAnimating && animationPhase === 'overlay' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-green-50/95">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Approved · Employee notified</span>
          </div>
        </div>
      )}

      {/* ═══ LAYER 1: Scan (always visible, ~80px) ═══ */}
      <div className="px-5 py-3">
        {/* Line 1: Identity + Amount + Action pill */}
        <div className="flex items-center gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            severity === 'HIGH' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <AlertTriangle className={`h-3.5 w-3.5 ${
              severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{item.traveler_name}</span>
              <span className="text-xs text-gray-400">{item.destination} · {item.dates}</span>
            </div>
          </div>

          <span className="shrink-0 text-sm font-mono font-semibold text-gray-800">
            {currencySymbol}{item.total_amount?.toLocaleString('en-IN')}
          </span>

          {/* Primary action pill — top right, always visible */}
          {!isShimmering && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction(recommendation.action); }}
              disabled={disabled || isAnimating}
              className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all disabled:opacity-50 ${justVerified ? 'animate-fadeIn' : ''} ${ACTION_STYLES[recommendation.action]}`}
            >
              <RecommendedIcon className="h-3 w-3" />
              {recommendation.label}
            </button>
          )}
        </div>

        {/* Line 2: Flag category */}
        <p className="mt-1 ml-10 text-xs text-gray-500">{shortCategory(item.flag_reason)}</p>

        {/* Line 3: AI verdict line + expand toggle */}
        <div className="mt-1.5 ml-10">
          {isShimmering ? (
            <AiAnalyzing sources={sources} />
          ) : hasOverride ? (
            /* Override: hero line — bigger, with background accent */
            <div className={`inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-1.5 ${justVerified ? 'animate-fadeIn' : ''}`}>
              <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <span className="text-red-500 font-medium line-through decoration-red-300/70">
                  {deterministicRec.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[#1F8844] font-bold">{recommendation.label}</span>
              </span>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-0.5 ml-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline decoration-amber-300 underline-offset-2"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Why
              </button>
            </div>
          ) : (
            /* Non-override: ema verdict + expand */
            <div className={`flex items-center gap-1.5 ${justVerified ? 'animate-fadeIn' : ''}`}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-[7px] font-bold text-white">E</span>
              <span className="text-xs text-gray-600 truncate">{recommendation.rationale}</span>
              {sourceCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-medium text-[#1F8844] hover:text-[#176B36]"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {sourceCount} sources
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ LAYER 2: Evidence (expanded on demand) ═══ */}
      {expanded && !isShimmering && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 space-y-2.5 animate-fadeIn" style={{ animationDuration: '200ms' }}>
          {/* Override: rationale */}
          {hasOverride && (
            <p className="text-xs text-gray-600 leading-relaxed">{recommendation.rationale}</p>
          )}

          {/* Source evidence — one line per source */}
          {hasSourceFindings && (
            <ul className="space-y-1.5">
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

          {/* Full action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleAction(recommendation.action)}
              disabled={disabled || isAnimating}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
            >
              <RecommendedIcon className="h-3.5 w-3.5" />
              {recommendation.label}
            </button>
            <span className="h-4 w-px bg-gray-200" />
            {recommendation.action !== 'approve' && (
              <button onClick={() => onApprove(item.id)} disabled={disabled || isAnimating}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-[#1F8844] hover:bg-green-50 disabled:opacity-50">
                Approve
              </button>
            )}
            {recommendation.action !== 'reject' && (
              <button onClick={() => onReject(item.id)} disabled={disabled || isAnimating}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">
                Reject
              </button>
            )}
            {recommendation.action !== 'ask' && (
              <button onClick={() => onAsk(item.id)} disabled={disabled || isAnimating}
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
