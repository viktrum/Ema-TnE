'use client';

import type { ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}

interface MessageBubbleProps {
  message: Message;
  userInitials?: string;
  children?: ReactNode;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageBubble({
  message,
  userInitials = 'U',
  children,
}: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  if (isAssistant) {
    return (
      <div className="flex items-start gap-3 px-4 py-2">
        {/* Ema Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-xs font-bold text-white">
          E
        </div>

        <div className="max-w-[80%]">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1F8844]">Ema</span>
            <span className="text-xs text-gray-400">
              {formatTime(message.timestamp)}
            </span>
          </div>

          <div className="rounded-lg bg-[#F3F4F6] px-4 py-3">
            <div
              className="prose prose-sm max-w-none text-gray-800 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }}
            />
          </div>

          {/* Embedded components (expense table, reasoning panel, etc.) */}
          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    );
  }

  // User message — right-aligned
  return (
    <div className="flex items-start justify-end gap-3 px-4 py-2">
      <div className="max-w-[60%]">
        <div className="mb-1 flex items-center justify-end gap-2">
          <span className="text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </span>
          <span className="text-sm font-semibold text-gray-700">You</span>
        </div>

        <div className="rounded-lg bg-[#1F8844] px-4 py-3 text-white">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>

      {/* User Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
        {userInitials}
      </div>
    </div>
  );
}
