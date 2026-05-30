import { createFileRoute } from "@tanstack/react-router";
import { Download, Camera, AlertTriangle, Users, Wifi, WifiOff, Activity, Clock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useDashboard, useCameras, useAlerts } from "@/lib/queries";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/work-monitoring")({
  head: () => ({ meta: [{ title: "Work Monitoring — SentinelIQ" }] }),
  component: Work,
});

function Work() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: cameras = [], isLoading: camsLoading } = useCameras();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();

  const isLoading = dashLoading || camsLoading || alertsLoading;

  const handleExport = () => {
    // Build CSV from real camera data
    const rows = cameras.map(c =>
      `${c.id},${c.name},${c.zone ?? "Unknown"},${c.location ?? "—"},${c.crowd_count},${c.status}`
    );
    const csv = ["ID,Name,Zone,Location,Crowd Count,Status", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentineliq-work-monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Camera monitoring log exported to CSV");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] flex-col gap-2">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-mono">Loading real-time monitoring data...</span>
      </div>
    );
  }

  // ── Real-time KPIs from DB ──────────────────────────────────────────────────
  const activeCams   = cameras.filter(c => c.status === "active").length;
  const offlineCams  = cameras.filter(c => c.status === "offline").length;
  const inactiveCams = cameras.filter(c => c.status === "inactive").length;
  const totalPeople  = cameras.reduce((sum, c) => sum + (c.crowd_count ?? 0), 0);

  const openAlerts     = alerts.filter(a => a.status === "open").length;
  const criticalAlerts = alerts.filter(a => a.status === "open" && a.severity === "critical").length;
  const ackedAlerts    = alerts.filter(a => a.status === "acknowledged").length;
  const todayAlerts    = dashboard?.incidents?.today ?? 0;

  // ── Headcount by Zone (real camera zones from DB) ──────────────────────────
  const zoneMap: Record<string, number> = {};
  cameras.forEach(c => {
    const zone = c.zone ?? c.location ?? "Unknown";
    zoneMap[zone] = (zoneMap[zone] ?? 0) + (c.crowd_count ?? 0);
  });
  const zoneData = Object.entries(zoneMap)
    .map(([z, v]) => ({ z, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 8);

  // ── Crowd trend from dashboard (real 60-min polling data) ─────────────────
  const trendData = (dashboard?.crowd_trend ?? []).map(t => ({
    d: t.minute,
    c: Math.round(Number(t.avg_crowd) || 0),
  }));

  // ── Alert severity breakdown for bar chart ────────────────────────────────
  const severityData = [
    { s: "Critical", v: alerts.filter(a => a.severity === "critical").length, color: "oklch(0.62 0.24 25)" },
    { s: "High",     v: alerts.filter(a => a.severity === "high").length,     color: "oklch(0.78 0.17 75)" },
    { s: "Medium",   v: alerts.filter(a => a.severity === "medium").length,   color: "oklch(0.72 0.2 250)" },
    { s: "Low",      v: alerts.filter(a => a.severity === "low").length,      color: "oklch(0.7 0.18 155)" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <h1 className="text-2xl font-display font-semibold tracking-tight">Work Monitoring</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" /> Live
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time camera surveillance, crowd monitoring & incident tracking
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5 transition"
        >
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      {/* KPI Row 1 — Camera & People */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Active Cameras",
            v: activeCams,
            icon: <Wifi className="size-4" />,
            c: "text-[oklch(0.78_0.18_155)]",
            sub: `${totalPeople} people detected`,
            border: "border-[oklch(0.7_0.18_155/0.3)]",
          },
          {
            label: "Offline Cameras",
            v: offlineCams + inactiveCams,
            icon: <WifiOff className="size-4" />,
            c: "text-destructive",
            sub: offlineCams > 0 ? "Needs attention" : "All feeds healthy",
            border: offlineCams > 0 ? "border-destructive/30" : "border-border/40",
          },
          {
            label: "Live People Count",
            v: totalPeople,
            icon: <Users className="size-4" />,
            c: "text-primary",
            sub: `Across ${activeCams} active cameras`,
            border: "border-primary/30",
          },
          {
            label: "Today's Incidents",
            v: todayAlerts,
            icon: <AlertTriangle className="size-4" />,
            c: todayAlerts > 0 ? "text-[oklch(0.85_0.17_75)]" : "text-[oklch(0.78_0.18_155)]",
            sub: `${openAlerts} open · ${ackedAlerts} acknowledged`,
            border: todayAlerts > 0 ? "border-[oklch(0.78_0.17_75/0.3)]" : "border-border/40",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`glass rounded-xl p-5 border cursor-default ${s.border}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <span className={`opacity-50 ${s.c}`}>{s.icon}</span>
            </div>
            <div className={`mt-1 text-3xl font-display font-semibold ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-mono">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* KPI Row 2 — Alert severity */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Critical Alerts", v: criticalAlerts, c: "text-destructive", border: "border-destructive/30", sub: "Immediate action" },
          { label: "High Alerts",     v: alerts.filter(a => a.severity === "high" && a.status === "open").length,   c: "text-[oklch(0.85_0.17_75)]", border: "border-[oklch(0.78_0.17_75/0.3)]", sub: "Escalation ready" },
          { label: "Open Alerts",     v: openAlerts,    c: "text-primary",       border: "border-primary/30", sub: "Pending response" },
          { label: "Acknowledged",    v: ackedAlerts,   c: "text-[oklch(0.78_0.18_155)]", border: "border-[oklch(0.7_0.18_155/0.3)]", sub: "Under review" },
        ].map(s => (
          <div key={s.label} className={`glass rounded-xl p-4 border ${s.border}`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-display font-semibold ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Crowd trend — real 60-min data */}
        <div className="glass rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-semibold">Live Crowd Trend</div>
            <span className="text-xs text-muted-foreground font-mono">Last 60 min · avg across all cameras</span>
          </div>
          {trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground font-mono">
              No trend data yet — crowd counts populate as cameras stream
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" />
                  <XAxis dataKey="d" stroke="oklch(0.65 0.03 260)" fontSize={9} interval="preserveStartEnd" />
                  <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`${v} people`, "Avg Crowd"]}
                  />
                  <Line type="monotone" dataKey="c" stroke="oklch(0.72 0.2 250)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Headcount by zone — real camera zones */}
        <div className="glass rounded-xl p-5">
          <div className="font-display font-semibold mb-3">Headcount by Zone</div>
          {zoneData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground font-mono text-center">
              No zone data — assign zones to cameras in Camera Management
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={zoneData}>
                  <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" />
                  <XAxis type="number" stroke="oklch(0.65 0.03 260)" fontSize={10} />
                  <YAxis dataKey="z" type="category" stroke="oklch(0.65 0.03 260)" fontSize={9} width={90} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`${v} people`, "Headcount"]}
                  />
                  <Bar dataKey="v" fill="oklch(0.72 0.2 250)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Alert severity breakdown */}
      <div className="glass rounded-xl p-5">
        <div className="font-display font-semibold mb-4">Alert Distribution by Severity</div>
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={severityData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" vertical={false} />
              <XAxis dataKey="s" stroke="oklch(0.65 0.03 260)" fontSize={11} />
              <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v} alerts`, "Count"]}
              />
              <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                {severityData.map((entry, index) => (
                  <rect key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Camera Feed Table — real data */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-semibold">Camera Monitoring Log · Live</div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Polls every 3s from database
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                {["ID", "Camera Name", "Zone / Location", "Crowd Count", "Stream Type", "PTZ", "Status"].map((h) => (
                  <th key={h} className="text-left font-medium py-2 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs font-mono">
                    No cameras found in database. Add cameras in Camera Management.
                  </td>
                </tr>
              ) : (
                cameras.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/40 hover:bg-white/[0.02] cursor-default"
                    onClick={() => toast.info(`${c.name} · ${c.zone ?? c.location ?? "No zone"} · ${c.crowd_count} people · ${c.status}`)}
                  >
                    <td className="py-3 px-2 font-mono text-xs text-muted-foreground">CAM-{c.id}</td>
                    <td className="py-3 px-2 font-medium">{c.name}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs font-mono">
                      {c.zone ?? c.location ?? "—"}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold
                        ${(c.crowd_count ?? 0) > 30 ? "text-destructive" :
                          (c.crowd_count ?? 0) >= 10 ? "text-[oklch(0.85_0.17_75)]" :
                          "text-foreground"}`}>
                        <Users className="size-3" />
                        {c.crowd_count ?? 0}
                        {(c.crowd_count ?? 0) > 30 && " ⚠ SURGE"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs font-mono text-muted-foreground capitalize">{c.stream_type}</td>
                    <td className="py-3 px-2 text-xs">
                      {c.ptz ? <span className="text-primary font-mono">PTZ</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border
                        ${c.status === "active"   ? "border-[oklch(0.7_0.18_155/0.4)] text-[oklch(0.78_0.18_155)]" :
                          c.status === "inactive" ? "border-[oklch(0.78_0.17_75/0.4)] text-[oklch(0.85_0.17_75)]" :
                          "border-destructive/40 text-destructive"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] text-muted-foreground font-mono border-t border-border/40 pt-2">
          Total: {cameras.length} cameras · {totalPeople} people detected · {activeCams} active · {offlineCams} offline
        </div>
      </div>
    </div>
  );
}
