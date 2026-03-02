'use client';

import { type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  demoResponse?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ChatInput({
  onSend,
  disabled = false,
  demoResponse,
  value,
  onChange,
}: ChatInputProps) {
  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Ctrl+D — fill demo response
    if (e.ctrlKey && e.key === 'd' && demoResponse) {
      e.preventDefault();
      onChange(demoResponse);
      return;
    }

    // Enter or Ctrl+Enter — send
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center rounded-2xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-[#1F8844]/40 focus-within:shadow-md focus-within:ring-2 focus-within:ring-[#1F8844]/10">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Ema anything about your expenses..."
            disabled={disabled}
            maxLength={500}
            className="flex-1 bg-transparent px-5 py-3.5 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1F8844] text-white transition-colors hover:bg-[#186d36] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          {demoResponse ? (
            <p className="text-[11px] text-gray-400">
              <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">Ctrl+D</kbd> demo response
            </p>
          ) : <span />}
          {value.length >= 400 && (
            <span className={`text-[11px] ${value.length >= 490 ? 'text-red-500' : 'text-gray-400'}`}>
              {value.length}/500
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
