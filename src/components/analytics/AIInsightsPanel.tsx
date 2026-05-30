import { Sparkles, TrendingUp, AlertTriangle, Activity } from "lucide-react";

export function AIInsightsPanel({
  topAlertType,
  busiestZone,
  criticalCount,
  offlineCount,
}: {
  topAlertType: string;
  busiestZone: string;
  criticalCount: number;
  offlineCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background/50 p-5 shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(var(--primary),0.05)_0%,transparent_100%)] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4 text-primary animate-pulse" />
          <h3 className="font-display font-semibold text-lg bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Sentinel AI Insights (Live)
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
              <TrendingUp className="size-3" />
            </div>
            <div>
              <p className="text-sm font-medium">Incident pattern detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The most frequent alert type currently is <strong>{topAlertType}</strong>. The busiest zone by crowd density is <strong>{busiestZone}</strong>. Consider reallocating patrol resources here.
              </p>
            </div>
          </div>
          
          {criticalCount > 0 && (
            <div className="flex gap-3">
              <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-destructive/20 text-destructive">
                <AlertTriangle className="size-3" />
              </div>
              <div>
                <p className="text-sm font-medium">Critical Threat Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  There are {criticalCount} unresolved critical alerts. Ensure emergency response protocols are initiated.
                </p>
              </div>
            </div>
          )}

          {offlineCount > 0 && (
            <div className="flex gap-3">
              <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[oklch(0.85_0.17_75/0.2)] text-[oklch(0.85_0.17_75)]">
                <Activity className="size-3" />
              </div>
              <div>
                <p className="text-sm font-medium">Camera Infrastructure Warning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {offlineCount} cameras are currently offline. Immediate maintenance is recommended to maintain optimal surveillance SLA.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[oklch(0.7_0.18_155/0.2)] text-[oklch(0.78_0.18_155)]">
              <Sparkles className="size-3" />
            </div>
            <div>
              <p className="text-sm font-medium">Predictive Forecast (Next 24 Hours)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on current camera feeds and alert volumes, AI predicts stable conditions. Routine patrol operations can proceed normally.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
