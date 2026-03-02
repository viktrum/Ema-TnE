'use client';

import { Check, Loader2 } from 'lucide-react';

interface LoadingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

export default function AssemblyProgress({ steps }: { steps: LoadingStep[] }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2 animate-in fade-in duration-300">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F8844] mt-0.5 text-[10px] font-bold text-white">
        E
      </div>
      <div className="rounded-xl border border-gray-200/80 bg-white px-5 py-4 shadow-sm max-w-sm">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Assembling your report...
        </p>
        <ul className="space-y-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2 text-[13px]">
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
              {step.status === 'done' && (
                <span className="text-[10px] text-gray-400">done</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
