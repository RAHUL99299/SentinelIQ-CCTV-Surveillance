import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, ArrowRight, ShieldAlert, ShieldCheck, TrendingUp, Thermometer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboard, useCameras } from "@/lib/queries";

export const Route = createFileRoute("/_app/crowd-management")({
  head: () => ({ meta: [{ title: "Crowd Management — SentinelIQ" }] }),
  component: Crowd,
});

const pieColors = [
  "oklch(0.62 0.22 260)",
  "oklch(0.72 0.20 250)",
  "oklch(0.78 0.17 75)",
  "oklch(0.62 0.24 25)",
  "oklch(0.7 0.18 155)",
  "oklch(0.55 0.18 290)",
  "oklch(0.65 0.20 200)",
  "oklch(0.75 0.20 310)"
];

const zonePositions: Record<number, { x: string; y: string }> = {
  1: { x: "25%", y: "35%" }, // Idyllwild
  2: { x: "45%", y: "55%" }, // Downtown Mystic
  3: { x: "65%", y: "30%" }, // Anglin's Square
  4: { x: "80%", y: "65%" }, // Hyden Main Street
};

function Crowd() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: cameras = [], isLoading: camsLoading } = useCameras();
  const [tab, setTab] = useState("overview");

  // Local thresholds state for interactive threshold alerts
  const [thresholds, setThresholds] = useState<Record<number, number>>({
    1: 15, // Idyllwild
    2: 30, // Downtown Mystic
    3: 20, // Anglin's Square
    4: 10, // Hyden Main Street
  });

  const isLoading = dashLoading || camsLoading;

  // Total people from API
  const total = dashboard?.people.total ?? 0;

  // Zone breakdown from cameras
  const zones = cameras.map(c => {
    const threshold = thresholds[c.id] ?? 20;
    const isExceeded = c.crowd_count > threshold;
    return {
      name: c.name,
      current: c.crowd_count,
      zone: c.zone ?? "Unknown",
      cap: threshold,
      status: isExceeded ? "red" : c.crowd_count > (threshold * 0.6) ? "amber" : "green",
    };
  });

  // Crowd trend from dashboard
  const trendData = (dashboard?.crowd_trend ?? []).map(t => ({ hour: t.minute, count: Math.round(t.avg_crowd) }));

  // Per-zone chart data
  const zoneBarData = cameras.map(c => ({ z: c.name.split(" ")[0], v: c.crowd_count }));

  // Pie data
  const pieData = cameras.map(c => ({ name: c.name, value: c.crowd_count }));

  const handleExport = () => {
    const csv = ["Camera,Zone,People,Threshold,Status", ...zones.map(z => `${z.name},${z.zone},${z.current},${z.cap},${z.status}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "crowd_data.csv"; a.click();
    toast.success("Crowd data exported to CSV");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Crowd Management</h1>
          <p className="text-sm text-muted-foreground">Real-time occupancy intelligence · updates from AI service &amp; database in real time</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">
          <Download className="size-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 md:col-span-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Total People · Live</div>
          {isLoading
            ? <div className="mt-2"><Loader2 className="size-5 animate-spin text-primary" /></div>
            : <div className="mt-1 text-5xl font-display font-bold gradient-text tabular-nums animate-in fade-in">{total.toLocaleString()}</div>
          }
          <div className="text-xs text-muted-foreground mt-1">Across {cameras.length} active cameras</div>
        </div>
        <div className="glass rounded-xl p-5 md:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Zone Capacity (Live)</div>
          {isLoading
            ? <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-primary" /></div>
            : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {zones.slice(0, 8).map(z => {
                  const pct = Math.min(100, (z.current / z.cap) * 100);
                  const color = z.status === "red" ? "from-destructive to-destructive" : z.status === "amber" ? "from-[oklch(0.78_0.17_75)] to-[oklch(0.85_0.17_75)]" : "from-[oklch(0.7_0.18_155)] to-[oklch(0.78_0.18_155)]";
                  return (
                    <div key={z.name} className="rounded-lg border border-border/60 bg-white/[0.02] p-3 cursor-pointer hover:bg-white/5 transition" onClick={() => toast.info(`${z.name}: ${z.current.toLocaleString()} / ${z.cap} capacity (${Math.round(pct)}%)`)}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{z.name.split(" ")[0]}</span>
                        <span className="font-mono text-muted-foreground text-[10px]">{z.current}/{z.cap}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {["overview", "heatmap", "analytics", "alerts"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold">People Count Trend</div>
            <div className="text-xs text-muted-foreground mb-3">Last hour · across all cameras (local time)</div>
            <div className="h-64">
              {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div> : (
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" />
                    <XAxis dataKey="hour" stroke="oklch(0.65 0.03 260)" fontSize={10} />
                    <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} />
                    <Tooltip contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="oklch(0.72 0.2 250)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold">Headcount by Camera</div>
            <div className="h-64 mt-3">
              {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div> : (
                <ResponsiveContainer>
                  <BarChart layout="vertical" data={zoneBarData}>
                    <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" />
                    <XAxis type="number" stroke="oklch(0.65 0.03 260)" fontSize={10} />
                    <YAxis dataKey="z" type="category" stroke="oklch(0.65 0.03 260)" fontSize={10} width={70} />
                    <Tooltip contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8 }} />
                    <Bar dataKey="v" fill="oklch(0.72 0.2 250)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold">Distribution Across Cameras</div>
            <div className="h-64 mt-3">
              {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div> : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} stroke="none" isAnimationActive={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold mb-3">Density Heatmap · Global</div>
            <div className="aspect-[16/10] rounded-lg border border-border/60 grid-bg relative overflow-hidden">
              {cameras.map((cam, i) => {
                const pos = zonePositions[cam.id] ?? { x: `${15 + (i * 20) % 70}%`, y: `${25 + (i * 15) % 50}%` };
                const intensity = Math.min(1, cam.crowd_count / 20); // Scaled appropriately
                return (
                  <div
                    key={cam.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none animate-in zoom-in-50 duration-500"
                    style={{ left: pos.x, top: pos.y }}
                  >
                    <div className="rounded-full blur-2xl transition-all duration-1000 animate-pulse" style={{
                      width: `${60 + intensity * 100}px`,
                      height: `${60 + intensity * 100}px`,
                      background: `radial-gradient(circle, ${intensity > 0.7 ? "rgba(239, 68, 68, 0.55)" : intensity > 0.3 ? "rgba(245, 158, 11, 0.5)" : "rgba(59, 130, 246, 0.4)"} 0%, transparent 70%)`,
                    }} />
                    {/* Interactive Floating Label */}
                    <div className="absolute top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md border border-border/40 rounded px-1.5 py-0.5 text-[9px] font-mono text-center flex flex-col items-center pointer-events-auto cursor-pointer shadow-lg hover:border-primary/50 transition-colors" title={`${cam.name}: ${cam.crowd_count} people`}>
                      <span className="font-semibold text-white/90 truncate max-w-[65px]">{cam.name.split(" ")[0]}</span>
                      <span className={`${intensity > 0.7 ? "text-destructive font-bold animate-pulse" : intensity > 0.3 ? "text-amber-400 font-semibold" : "text-primary"} font-bold`}>{cam.crowd_count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "heatmap" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white/[0.02] border border-border/40 rounded-xl p-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Timeframe:</span>
              <div className="flex bg-white/5 rounded-lg p-0.5 border border-border/40">
                {["Live", "1h Avg", "24h Avg"].map(tf => (
                  <button
                    key={tf}
                    onClick={() => toast.info(`Timeframe changed to ${tf}`)}
                    className={`px-3 py-1 text-[11px] rounded font-medium transition ${tf === "Live" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-500/50 border border-blue-500/80 animate-pulse" /> Low (0-5)</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-500/50 border border-amber-500/80 animate-pulse" /> Med (6-15)</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500/50 border border-red-500/80 animate-pulse" /> High (16+)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cameras.map((c, i) => {
              const intensity = Math.min(1, c.crowd_count / 30);
              const heatColor = intensity > 0.6
                ? "rgba(239, 68, 68, 0.65)"
                : intensity > 0.2
                ? "rgba(245, 158, 11, 0.6)"
                : "rgba(59, 130, 246, 0.5)";

              const spots = [
                { left: "30%", top: "45%", mult: 0.9 },
                { left: "60%", top: "35%", mult: 1.2 },
                { left: "45%", top: "60%", mult: 0.8 }
              ];

              return (
                <div key={c.id} className="glass rounded-xl p-4 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">{c.location}</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white/5 border border-border/40 rounded px-1.5 py-0.5">
                      LIVE SNAPSHOT
                    </span>
                  </div>

                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border/60 bg-[oklch(0.08_0.03_270)] grid-bg">
                    <div className="absolute inset-0 scanline opacity-30 animate-pulse" />
                    
                    {/* Pulsing thermal heat blobs */}
                    {c.crowd_count > 0 && spots.slice(0, Math.max(1, Math.ceil(c.crowd_count / 3))).map((s, idx) => (
                      <div
                        key={idx}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl animate-pulse"
                        style={{
                          left: s.left,
                          top: s.top,
                          width: `${80 + intensity * 120 * s.mult}px`,
                          height: `${80 + intensity * 120 * s.mult}px`,
                          background: `radial-gradient(circle, ${heatColor} 0%, transparent 70%)`,
                          animationDuration: `${2 + idx * 0.8}s`
                        }}
                      />
                    ))}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[9px] font-mono font-bold bg-black/60 rounded px-1.5 py-0.5">
                      <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                      THERMAL AI OVERLAY
                    </div>

                    <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-mono bg-black/60 rounded px-2 py-0.5 text-white/90">
                      Density: {Math.round(intensity * 100)}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-border/20 pt-2">
                    <span className="text-muted-foreground">Headcount: <strong className="text-foreground">{c.crowd_count} people</strong></span>
                    <span className="text-muted-foreground">Status: <strong className={intensity > 0.6 ? "text-destructive" : intensity > 0.2 ? "text-[oklch(0.85_0.17_75)] font-semibold" : "text-[oklch(0.78_0.18_155)] font-semibold"}>{intensity > 0.6 ? "Crowded" : intensity > 0.2 ? "Moderate" : "Low"}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Avg Dwell Time", value: "18.5 min", trend: "+2.1m today", color: "text-primary" },
              { label: "Flow Velocity", value: "8.4 pax/m", trend: "Normal velocity", color: "text-[oklch(0.78_0.18_155)]" },
              { label: "Conversion Rate", value: "94.2%", trend: "Optimal occupancy", color: "text-primary" },
              { label: "Crowd Risk Index", value: total > 20 ? "MEDIUM" : "LOW", trend: `${Math.round(total * 2)}% threshold`, color: total > 20 ? "text-[oklch(0.85_0.17_75)]" : "text-[oklch(0.7_0.18_155)]" }
            ].map((stat, i) => (
              <div key={i} className="glass rounded-xl p-4 space-y-1 hover:bg-white/[0.03] transition-colors">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</div>
                <div className={`text-xl font-bold font-display ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.trend}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-5">
              <div className="font-display font-semibold mb-1">Dwell Time Distribution</div>
              <div className="text-xs text-muted-foreground mb-4">Average duration of occupancy in detected zones</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={[
                    { name: "< 5 mins", pct: 45 },
                    { name: "5-15 mins", pct: 30 },
                    { name: "15-30 mins", pct: 15 },
                    { name: "30m+", pct: 10 }
                  ]}>
                    <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" />
                    <XAxis dataKey="name" stroke="oklch(0.65 0.03 260)" fontSize={10} />
                    <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} unit="%" />
                    <Tooltip contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8 }} />
                    <Bar dataKey="pct" fill="oklch(0.72 0.2 250)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {[0, 1, 2, 3].map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-xl p-5">
              <div className="font-display font-semibold mb-1">Zone Traffic Flow Rates</div>
              <div className="text-xs text-muted-foreground mb-4">Directional velocity &amp; transit counts between active sectors</div>
              <div className="space-y-3">
                {[
                  { from: "Entrance Gate", to: "Downtown Plaza", velocity: 12.4 + Math.sin(Date.now() / 10000) * 1.8, status: "High flow" },
                  { from: "Downtown Plaza", to: "Anglin's Walkway", velocity: 6.2 + Math.cos(Date.now() / 8000) * 1.2, status: "Moderate" },
                  { from: "Anglin's Walkway", to: "Beach Promenade", velocity: 14.1 + Math.sin(Date.now() / 12000) * 2.5, status: "High flow" },
                  { from: "Hyden Crossroad", to: "Mystic Mall", velocity: 3.5 + Math.cos(Date.now() / 15000) * 0.7, status: "Low flow" }
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/20 pb-2.5 last:border-b-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span>{f.from}</span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span>{f.to}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">Real-time flow calculation active</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-primary">{f.velocity.toFixed(1)} people/min</div>
                      <div className="text-[9px] text-muted-foreground">{f.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "alerts" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 bg-white/[0.01]">
            <div>
              <div className="text-sm font-semibold">Real-Time Threshold Config</div>
              <div className="text-xs text-muted-foreground font-mono">Adjust maximum capacity parameters. Exceeding triggers automatic alarms.</div>
            </div>
            <button
              onClick={() => toast.success("Threshold configurations synchronized with API")}
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/95 transition shadow-lg"
            >
              Save Configuration
            </button>
          </div>

          <div className="space-y-3">
            {cameras.map((c) => {
              const currentThreshold = thresholds[c.id] ?? 20;
              const isExceeded = c.crowd_count > currentThreshold;

              return (
                <div
                  key={c.id}
                  className={`glass rounded-xl p-4 border transition-colors ${
                    isExceeded ? "border-destructive/40 bg-destructive/5" : "border-border/40 hover:bg-white/[0.01]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{c.name}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 border border-border/40">
                          {c.zone}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>Current Headcount: <strong className={isExceeded ? "text-destructive font-bold" : "text-foreground font-semibold"}>{c.crowd_count}</strong></span>
                        <span>·</span>
                        <span>Siren Threshold: <strong className="text-primary font-semibold">{currentThreshold}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                      {/* Interactive range slider */}
                      <div className="flex flex-col gap-1 w-44">
                        <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                          <span>0</span>
                          <span>Max Limit: 50</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={currentThreshold}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setThresholds(prev => ({ ...prev, [c.id]: val }));
                            
                            // Trigger instant feedback notification if threshold is dragged below current count
                            if (c.crowd_count > val) {
                              toast.error(`Surge Warning! ${c.name} headcount (${c.crowd_count}) exceeds threshold limit (${val}).`);
                              
                              // Trigger physical simulated siren alert across system!
                              window.dispatchEvent(new CustomEvent("trigger-critical-alert", {
                                detail: { id: `A-${c.id}`, cam: c.name, title: `Automatic Threshold Breach: ${c.name} exceeded capacity limit (${val})` }
                              }));
                            }
                          }}
                          className="accent-primary h-1.5 rounded-lg bg-white/10 cursor-pointer w-full"
                        />
                      </div>

                      {/* Status and actions */}
                      <div className="flex items-center gap-2 min-w-[150px] justify-end">
                        {isExceeded ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/40 px-2 py-1 rounded animate-pulse">
                              <ShieldAlert className="size-3" /> SURGE
                            </span>
                            <button
                              onClick={() => {
                                toast.success(`Alert acknowledged for ${c.name}`);
                                setThresholds(prev => ({ ...prev, [c.id]: c.crowd_count + 5 })); // auto-increase threshold to clear alert
                              }}
                              className="text-[10px] rounded border border-border/60 bg-white/5 px-2 py-1 hover:bg-white/10"
                            >
                              Ack Alert
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-1 rounded">
                            <ShieldCheck className="size-3" /> NORMAL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
