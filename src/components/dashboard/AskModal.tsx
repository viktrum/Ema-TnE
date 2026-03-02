'use client';

import { useState } from 'react';

interface AskModalProps {
  defaultQuestion?: string;
  onConfirm: (question: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function AskModal({ defaultQuestion = '', onConfirm, onCancel, isPending }: AskModalProps) {
  const [question, setQuestion] = useState(defaultQuestion);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">Ask Employee</h3>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Your question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(question)}
            disabled={isPending || !question.trim()}
            className="rounded-lg bg-[#1F8844] px-4 py-2 text-xs font-medium text-white hover:bg-[#176B36] disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send Question'}
          </button>
        </div>
      </div>
    </div>
  );
}
