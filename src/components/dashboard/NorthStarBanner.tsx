'use client';

interface NorthStarBannerProps {
  value: string;
  label: string;
  industryAvg: string;
}

export function NorthStarBanner({ value, label, industryAvg }: NorthStarBannerProps) {
  return (
    <div
      className="w-full rounded-xl px-6 py-8 flex flex-col items-center justify-center"
      style={{
        minHeight: '120px',
        background: 'linear-gradient(135deg, #1F8844 0%, #176B36 100%)',
      }}
    >
      <p className="text-5xl font-extrabold text-white leading-tight">
        {value}
      </p>
      <p className="mt-1 text-base text-white/80">{label}</p>
      <p className="mt-1 text-sm text-white/60">
        Industry average:{' '}
        <span className="line-through">{industryAvg}</span>
      </p>
    </div>
  );
}
