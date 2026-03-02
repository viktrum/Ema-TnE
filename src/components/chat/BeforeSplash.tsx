'use client';

import { useEffect, useState } from 'react';

const FORM_FIELDS = [
  'Report Name',
  'Business Purpose',
  'Cost Center',
  'Department',
  'Trip Start Date',
  'Trip End Date',
  'Destination',
  'Pre-Approval #',
  'Project Code',
  'Payment Method',
  'Currency',
  'Personal Car Mileage',
  'Advance Amount',
  'Comments',
  'Attachments',
];

interface BeforeSplashProps {
  onDismiss: () => void;
}

export default function BeforeSplash({ onDismiss }: BeforeSplashProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2500);
    const dismissTimer = setTimeout(onDismiss, 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className={`fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
        <div className="opacity-40">
          <div className="mb-4 space-y-3">
            {FORM_FIELDS.map((label) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-36 text-right text-xs text-gray-500">
                  {label}
                </span>
                <div className="h-7 flex-1 rounded border border-gray-200 bg-gray-50" />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/80 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F8844] text-lg font-bold text-white">
            E
          </div>
          <p className="text-4xl font-bold text-gray-900">15 fields.</p>
          <p className="text-4xl font-bold text-gray-900">20 minutes.</p>
          <p className="mt-4 text-lg text-[#1F8844]">That was before.</p>
          <p className="mt-1 text-sm text-gray-400">Click anywhere to continue</p>
        </div>
      </div>
    </div>
  );
}
