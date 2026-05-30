import { Shield } from "lucide-react";
import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  console.log("[DEBUG] Rendering SplashScreen, visible:", visible);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500">
      <div className="relative mb-6">
        <Shield className="size-20 text-primary animate-pulse" />
        <span className="absolute -top-1 -right-1 size-6 rounded-full bg-primary pulse-dot" />
      </div>
      <h1 className="text-4xl font-display font-bold tracking-tight mb-2">
        Sentinel<span className="text-primary">IQ</span>
      </h1>
      <p className="text-muted-foreground uppercase tracking-widest text-xs animate-in fade-in slide-in-from-bottom-2 duration-700">
        Initializing Intelligence...
      </p>
    </div>
  );
}
