import { useEffect, useRef, useState } from "react";

interface Props {
  to: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({ to, decimals = 0, duration = 1200, prefix = "", suffix = "" }: Props) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);

  // Sanitize input to guarantee it is a valid finite number to prevent NaN === NaN infinite loops
  const targetVal = typeof to === "number" && !isNaN(to) && isFinite(to) ? to : 0;

  useEffect(() => {
    let active = true;
    const start = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      if (!active) return;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(targetVal * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [targetVal, duration]);

  const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();

  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}
