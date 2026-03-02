'use client';

import { useState } from 'react';

const REJECT_REASONS = [
  'Policy Violation',
  'Insufficient Documentation',
  'Amount Exceeds Limit',
  'Duplicate Expense',
  'Other',
] as const;

interface RejectModalProps {
  onConfirm: (data: { reason: string; notes?: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function RejectModal({ onConfirm, onCancel, isPending }: RejectModalProps) {
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">Reject Expense</h3>
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
          >
            {REJECT_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
            placeholder="Add context for the employee..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            Keep Expense
          </button>
          <button
            onClick={() => onConfirm({ reason, notes: notes || undefined })}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Rejecting...' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
