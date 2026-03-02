'use client';

import { type KeyboardEvent } from 'react';
import { SendHorizonal } from 'lucide-react';

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
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          maxLength={500}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#1F8844] focus:ring-1 focus:ring-[#1F8844] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F8844] text-white transition-colors hover:bg-[#186d36] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between">
        {demoResponse ? (
          <p className="text-[11px] text-gray-400">
            Press <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[10px]">Ctrl+D</kbd> to load demo message
          </p>
        ) : <span />}
        {value.length >= 400 && (
          <span className={`text-[11px] ${value.length >= 490 ? 'text-red-500' : 'text-gray-400'}`}>
            {value.length}/500
          </span>
        )}
      </div>
    </div>
  );
}
