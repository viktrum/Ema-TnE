'use client';

import { Clock, CheckCircle, Shield } from 'lucide-react';

interface MetricCard {
  icon: typeof Clock;
  value: string;
  label: string;
  sub?: string;
  accent?: boolean;
}

interface NorthStarBannerProps {
  heroMetric: { value: string; label: string; industryAvg: string };
  autoApprovedCount: number;
  autoApprovedRate: number;
  policyCompliance: string;
}

export function NorthStarBanner({ heroMetric, autoApprovedCount, autoApprovedRate, policyCompliance }: NorthStarBannerProps) {
  const cards: MetricCard[] = [
    {
      icon: Clock,
      value: heroMetric.value,
      label: heroMetric.label,
      sub: `was: ${heroMetric.industryAvg}`,
      accent: true,
    },
    {
      icon: CheckCircle,
      value: `${autoApprovedCount}`,
      label: 'Auto-approved',
      sub: `${autoApprovedRate}% clean rate`,
    },
    {
      icon: Shield,
      value: policyCompliance,
      label: 'Policy compliance',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl p-5 ${
              card.accent
                ? 'bg-gradient-to-br from-[#1F8844] to-[#176B36] text-white'
                : 'bg-white border border-gray-200 text-gray-800'
            }`}
          >
            <Icon className={`mb-2 h-5 w-5 ${card.accent ? 'text-white/80' : 'text-gray-400'}`} />
            <p className={`text-3xl font-bold ${card.accent ? 'text-white' : 'text-gray-800'}`}>
              {card.value}
            </p>
            <p className={`mt-0.5 text-sm ${card.accent ? 'text-white/80' : 'text-gray-500'}`}>
              {card.label}
            </p>
            {card.sub && (
              <p className={`mt-1 text-xs ${card.accent ? 'text-white/60' : 'text-gray-400'}`}>
                {card.accent ? (
                  <>was: <span className="line-through">{heroMetric.industryAvg}</span></>
                ) : (
                  card.sub
                )}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
