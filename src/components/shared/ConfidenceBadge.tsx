"use client";

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);

  let dotColor: string;
  let textColor: string;

  if (percentage > 90) {
    dotColor = "bg-green-500";
    textColor = "text-green-700";
  } else if (percentage >= 70) {
    dotColor = "bg-amber-500";
    textColor = "text-amber-700";
  } else {
    dotColor = "bg-red-500";
    textColor = "text-red-700";
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <span className={`text-xs font-medium ${textColor}`}>{percentage}%</span>
    </span>
  );
}
