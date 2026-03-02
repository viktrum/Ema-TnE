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
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Ema Avatar */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F8844] mt-0.5 text-[10px] font-bold text-white">
          E
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="typing-dot h-2 w-2 rounded-full bg-[#1F8844]/60" />
            <span
              className="typing-dot h-2 w-2 rounded-full bg-[#1F8844]/60"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="typing-dot h-2 w-2 rounded-full bg-[#1F8844]/60"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
          <span className="text-[12px] text-gray-400">Ema is thinking...</span>
        </div>
      </div>
    </>
  );
}
