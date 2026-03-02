'use client';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'isomorphic-dompurify';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
}

interface MessageBubbleProps {
  message: Message;
  children?: ReactNode;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const proseClasses =
  'prose prose-sm max-w-none text-gray-800 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left';

export default function MessageBubble({
  message,
  children,
}: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  if (isAssistant) {
    const isHTML = /^\s*<(?:p|div|table|strong|em|ul|ol|li|h[1-6]|br|span|a)\b/i.test(message.content);

    // Don't render empty streaming placeholder — the TypingIndicator handles that
    if (!message.content.trim() && !children) return null;

    return (
      <div className="flex items-start gap-3 px-4 py-3 animate-in fade-in slide-in-from-left-2 duration-300">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-[10px] font-bold text-white">
          E
        </div>

        <div className="max-w-[80%]">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1F8844]">Ema</span>
            <span className="text-xs text-gray-400">
              {formatTime(message.timestamp)}
            </span>
          </div>

          <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
            {isHTML ? (
              <div
                className={proseClasses}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }}
              />
            ) : (
              <div className={proseClasses}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {children && <div className="mt-2">{children}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-end gap-3 px-4 py-3 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="max-w-[60%]">
        <div className="mb-1 flex items-center justify-end gap-2">
          <span className="text-xs text-gray-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div className="rounded-xl bg-[#1F8844] px-4 py-3 text-[13px] text-white shadow-sm">
          <p className="leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
