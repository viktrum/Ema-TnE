'use client';

import { Check, Loader2 } from 'lucide-react';

interface LoadingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export default function AssemblyProgress({ steps }: { steps: LoadingStep[] }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-xs font-bold text-white">
        E
      </div>
      <div className="rounded-lg bg-[#F3F4F6] px-4 py-3">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Assembling your report...
        </p>
        <ul className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {step.status === 'done' ? (
                <Check className="h-4 w-4 text-[#1F8844]" />
              ) : step.status === 'active' ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#1F8844]" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-gray-300" />
              )}
              <span
                className={
                  step.status === 'done'
                    ? 'text-gray-500'
                    : step.status === 'active'
                      ? 'font-medium text-gray-800'
                      : 'text-gray-400'
                }
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
