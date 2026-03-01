'use client';

export default function TypingIndicator() {
  return (
    <>
      <style>
        {`
          @keyframes typing-bounce {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.4;
            }
            30% {
              transform: translateY(-6px);
              opacity: 1;
            }
          }
          .typing-dot {
            animation: typing-bounce 1.4s ease-in-out infinite;
          }
        `}
      </style>
      <div className="flex items-start gap-3 px-4 py-2">
        {/* Ema Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-xs font-bold text-white">
          E
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#F3F4F6] px-4 py-3">
          <span className="typing-dot h-2 w-2 rounded-full bg-gray-400" />
          <span
            className="typing-dot h-2 w-2 rounded-full bg-gray-400"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="typing-dot h-2 w-2 rounded-full bg-gray-400"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </>
  );
}
