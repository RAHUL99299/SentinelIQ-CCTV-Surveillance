import { useMemo } from "react";
import { Shield } from "lucide-react";

export function SecurityScore({ score = 87 }: { score?: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useMemo(() => circumference - (score / 100) * circumference, [score, circumference]);

  return (
    <div className="glass rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[200px]">
      <div className="font-display font-semibold mb-2 text-center absolute top-5 w-full">Security Score</div>
      <div className="relative mt-8 grid place-items-center">
        {/* Background Circle */}
        <svg className="w-32 h-32 -rotate-90 transform">
          <circle
            className="text-white/5"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="64"
            cy="64"
          />
          {/* Progress Circle */}
          <circle
            className="text-primary transition-all duration-1000 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="64"
            cy="64"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <Shield className="size-5 mb-1 text-primary opacity-80" />
          <span className="text-3xl font-display font-bold text-primary shadow-glow bg-clip-text">{score}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-4 text-center">Calculated based on 90-day incident resolution and threat mitigation.</p>
    </div>
  );
}
