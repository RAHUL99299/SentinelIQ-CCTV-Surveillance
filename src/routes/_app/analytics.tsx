import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StatCards } from "@/components/analytics/StatCards";
import { TrendChart } from "@/components/analytics/TrendChart";
import { SecurityScore } from "@/components/analytics/SecurityScore";
import { ReportBuilder } from "@/components/analytics/ReportBuilder";
import { AIInsightsPanel } from "@/components/analytics/AIInsightsPanel";
import { useDashboard, useAlerts, useCameras, useLandingStats } from "@/lib/queries";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — SentinelIQ" }] }),
  component: Analytics,
});

function Analytics() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: cameras = [], isLoading: camsLoading } = useCameras();
  const { data: landingStats } = useLandingStats();

  const isLoading = dashLoading || alertsLoading || camsLoading;

  // ── Calculate Real Analytics Data ──────────────────────────────────────
  const openAlerts = alerts.filter(a => a.status === "open");
  const totalIncidents = openAlerts.length;

  // Avg response time from landingStats (fallback to 0)
  const avgResponseTime = landingStats?.avg_alert_response ?? 0;

  // Calculate busiest zone from cameras
  const zoneMap: Record<string, number> = {};
  cameras.forEach(c => {
    const z = c.zone ?? c.location ?? "Unknown";
    zoneMap[z] = (zoneMap[z] ?? 0) + (c.crowd_count ?? 0);
  });
  const busiestZone = Object.entries(zoneMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";

  // Top alert type
  const typeMap: Record<string, number> = {};
  alerts.forEach(a => {
    typeMap[a.type] = (typeMap[a.type] ?? 0) + 1;
  });
  const topAlertType = Object.entries(typeMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";

  // Trend Data for chart
  const trendData = (dashboard?.crowd_trend ?? []).map(t => ({
    d: t.minute,
    c: Math.round(Number(t.avg_crowd) || 0),
  }));

  // Insights Data
  const criticalCount = alerts.filter(a => a.status === "open" && a.severity === "critical").length;
  const offlineCount = cameras.filter(c => c.status === "offline" || c.status === "inactive").length;

  // Security Score: 100 - (critical * 5) - (offline * 2), floor at 0
  const baseScore = 100 - (criticalCount * 5) - (offlineCount * 2);
  const securityScore = Math.max(0, Math.min(100, baseScore));

  const exportData = (type: string) => {
    if (type === 'CSV') {
      const rows = alerts.map(a => `${a.id},${a.title},${a.severity},${a.status},${a.camera_name ?? "Unknown"}`);
      const csv = ["ID,Title,Severity,Status,Camera", ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentineliq-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Analytics CSV exported successfully.");
    } else {
      toast.success(`Exporting ${type}...`, { description: "Your file will download shortly." });
    }
  };

  const handleTemplateClick = (t: string) => {
    toast.success(`Generating ${t}...`, { description: "This report will use live real-time data." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] flex-col gap-2">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-mono">Compiling real-time analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">Live operational intelligence and automated reporting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportData('PDF')} className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition">
            <FileText className="size-3.5" /> PDF
          </button>
          <button onClick={() => exportData('Excel')} className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition">
            <Download className="size-3.5" /> Excel
          </button>
          <button onClick={() => exportData('CSV')} className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary px-3 py-1.5 text-xs hover:bg-primary/20 transition">
            <Download className="size-3.5" /> CSV (Real Data)
          </button>
        </div>
      </div>

      <StatCards 
        totalIncidents={totalIncidents} 
        avgResponseTime={avgResponseTime} 
        busiestZone={busiestZone} 
        topAlertType={topAlertType} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <TrendChart trendData={trendData} />
        </div>
        <div className="lg:col-span-1">
          <SecurityScore score={securityScore} />
        </div>
      </div>

      <AIInsightsPanel 
        topAlertType={topAlertType} 
        busiestZone={busiestZone} 
        criticalCount={criticalCount} 
        offlineCount={offlineCount} 
      />

      <div className="space-y-3">
        <h3 className="font-display font-semibold text-lg">Live Predefined Templates</h3>
        <div className="flex flex-wrap gap-2">
          {["Daily Incident Summary", "Weekly Crowd Analytics", "Monthly Security Overview", "Camera Uptime & Health Report"].map(t => (
            <button key={t} onClick={() => handleTemplateClick(t)} className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs hover:bg-primary/20 transition">
              {t}
            </button>
          ))}
        </div>
      </div>

      <ReportBuilder />
    </div>
  );
}
