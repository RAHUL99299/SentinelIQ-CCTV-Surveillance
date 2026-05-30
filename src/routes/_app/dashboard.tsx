import {
  Camera, Activity, AlertTriangle, Users, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, MapPin, Eye, CheckCircle2, UserPlus, ArrowUp, Wifi, WifiOff, Loader2,
} from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { toast } from "sonner";
import { useDashboard, useUpdateAlert } from "@/lib/queries";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Command Center — SentinelIQ" }] }),
  component: Dashboard,
});

const sevColor: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high:     "bg-[oklch(0.78_0.17_75/0.15)] text-[oklch(0.85_0.17_75)] border-[oklch(0.78_0.17_75/0.4)]",
  medium:   "bg-primary/15 text-primary border-primary/40",
  low:      "bg-[oklch(0.7_0.18_155/0.15)] text-[oklch(0.78_0.18_155)] border-[oklch(0.7_0.18_155/0.4)]",
};

const statusDot: Record<string, string> = {
  critical: "bg-destructive",
  high:     "bg-[oklch(0.78_0.17_75)]",
  medium:   "bg-primary",
  low:      "bg-[oklch(0.7_0.18_155)]",
};

const statusColor: Record<string, string> = {
  open:         "bg-destructive/15 text-destructive border-destructive/40 animate-pulse",
  acknowledged: "bg-[oklch(0.78_0.17_75/0.15)] text-[oklch(0.85_0.17_75)] border-[oklch(0.78_0.17_75/0.4)]",
  resolved:     "bg-[oklch(0.7_0.18_155/0.15)] text-[oklch(0.78_0.18_155)] border-[oklch(0.7_0.18_155/0.4)]",
  closed:       "bg-muted/15 text-muted-foreground border-muted/40",
};

function ApiStatusBadge({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono">
      {isLoading ? (
        <><Loader2 className="size-3 animate-spin text-primary" /><span className="text-muted-foreground">Syncing…</span></>
      ) : isError ? (
        <><WifiOff className="size-3 text-destructive" /><span className="text-destructive">API offline — run: cd api && php artisan serve</span></>
      ) : (
        <><Wifi className="size-3 text-[oklch(0.7_0.18_155)]" /><span className="text-[oklch(0.7_0.18_155)]">Live · updates every 8s</span></>
      )}
    </div>
  );
}

function Dashboard() {
  const { data, isLoading, isError, isFetching } = useDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">Real-time surveillance intelligence across all sites.</p>
        </div>
        <div className="flex items-center gap-4">
          <ApiStatusBadge isLoading={isLoading} isError={isError} />
          <div className="text-xs text-muted-foreground font-mono">{new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiActiveCameras
          active={data?.cameras.active ?? 0}
          total={data?.cameras.total ?? 0}
          offline={data?.cameras.offline ?? 0}
          loading={isLoading}
        />
        <KpiAlerts
          total={data?.alerts.total ?? 0}
          critical={data?.alerts.critical ?? 0}
          high={data?.alerts.high ?? 0}
          medium={data?.alerts.medium ?? 0}
          loading={isLoading}
        />
        <KpiPeople
          count={data?.people.total ?? 0}
          trend={data?.crowd_trend ?? []}
          loading={isLoading}
        />
        <KpiIncidents
          today={data?.incidents.today ?? 0}
          yesterday={data?.incidents.yesterday ?? 0}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <CameraMap cameras={data?.camera_statuses ?? []} loading={isLoading} />
        <LiveAlertFeed alerts={data?.recent_alerts ?? []} loading={isLoading} />
      </div>

      <CameraStatusGrid cameras={data?.camera_statuses ?? []} loading={isLoading} />

      <RecentAlerts alerts={data?.recent_alerts ?? []} loading={isLoading} />
    </div>
  );
}

/* ---------- KPI cards ---------- */

function KpiActiveCameras({ active, total, offline, loading }: { active: number; total: number; offline: number; loading: boolean }) {
  const pct = total > 0 ? (active / total) * 100 : 0;
  const r = 28, c = 2 * Math.PI * r;
  return (
    <div
      className="glass rounded-xl p-5 relative overflow-hidden cursor-pointer hover:bg-white/[0.04] transition"
      onClick={() => toast.info(`${total} cameras registered · ${active} active · ${offline} offline`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Cameras</div>
          <div className="mt-1 text-3xl font-display font-semibold">
            {loading ? <span className="animate-pulse">—</span> : active}
            <span className="text-muted-foreground text-lg">/{loading ? "—" : total}</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-destructive">
            <Camera className="size-3" /> {offline} offline
          </div>
        </div>
        <svg width="72" height="72" viewBox="0 0 72 72" className="-mt-1">
          <circle cx="36" cy="36" r={r} stroke="oklch(0.62 0.22 260 / 0.18)" strokeWidth="6" fill="none" />
          <circle
            cx="36" cy="36" r={r} stroke="oklch(0.72 0.20 250)" strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
            transform="rotate(-90 36 36)"
            style={{ filter: "drop-shadow(0 0 6px oklch(0.72 0.20 250))", transition: "stroke-dashoffset 1s ease" }}
          />
          <text x="36" y="40" textAnchor="middle" className="fill-foreground font-display text-xs font-semibold">{Math.round(pct)}%</text>
        </svg>
      </div>
    </div>
  );
}

function KpiAlerts({ total, critical, high, medium, loading }: { total: number; critical: number; high: number; medium: number; loading: boolean }) {
  return (
    <div
      className="glass rounded-xl p-5 relative overflow-hidden cursor-pointer hover:bg-white/[0.04] transition"
      onClick={() => toast.warning(`${critical} Critical, ${high} High, ${medium} Medium alerts active`)}
    >
      <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />
      <div className="relative">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Active Alerts</div>
        <div className="mt-1 flex items-end gap-3">
          <span className="text-3xl font-display font-semibold">{loading ? <span className="animate-pulse">—</span> : total}</span>
          {critical > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-destructive/20 text-destructive border border-destructive/40 animate-pulse">
              <span className="size-1.5 rounded-full bg-destructive" /> {critical} CRITICAL
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
          <span className="rounded bg-destructive/15 text-destructive py-1 text-center border border-destructive/30">{critical} Crit</span>
          <span className="rounded bg-[oklch(0.78_0.17_75/0.15)] text-[oklch(0.85_0.17_75)] py-1 text-center border border-[oklch(0.78_0.17_75/0.3)]">{high} High</span>
          <span className="rounded bg-primary/15 text-primary py-1 text-center border border-primary/30">{medium} Med</span>
        </div>
      </div>
    </div>
  );
}

function KpiPeople({ count, trend, loading }: { count: number; trend: { minute: string; avg_crowd: number }[]; loading: boolean }) {
  const chartData = trend.length > 0 ? trend.map(t => ({ v: t.avg_crowd })) : Array.from({ length: 12 }, () => ({ v: 0 }));
  return (
    <div className="glass rounded-xl p-5 overflow-hidden">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">People Detected · Live</div>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <div className="text-3xl font-display font-semibold">{loading ? <span className="animate-pulse">—</span> : count.toLocaleString()}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-[oklch(0.78_0.18_155)]">
            <ArrowUpRight className="size-3" /> Across all active cameras
          </div>
        </div>
        <Users className="size-5 text-muted-foreground" />
      </div>
      <div className="h-12 mt-2 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sp" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.2 250)" strokeWidth={2} fill="url(#sp)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiIncidents({ today, yesterday, loading }: { today: number; yesterday: number; loading: boolean }) {
  const delta = today - yesterday;
  return (
    <div className="glass rounded-xl p-5 overflow-hidden">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Incidents Today</div>
      <div className="mt-1 flex items-end justify-between">
        <div>
          <div className="text-3xl font-display font-semibold">{loading ? <span className="animate-pulse">—</span> : today}</div>
          <div className={`mt-1 inline-flex items-center gap-1 text-xs ${delta > 0 ? "text-destructive" : "text-[oklch(0.78_0.18_155)]"}`}>
            {delta > 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta > 0 ? `+${delta}` : delta} vs yesterday
          </div>
        </div>
        <AlertTriangle className="size-5 text-muted-foreground" />
      </div>
    </div>
  );
}

/* ---------- Camera Map ---------- */

function CameraMap({ cameras, loading }: { cameras: any[]; loading: boolean }) {
  const [hover, setHover] = useState<number | null>(null);

  // Spread cameras across the map pseudo-randomly by zone
  const positions = cameras.map((cam, i) => ({
    cam,
    x: 15 + (i * 9 + 5) % 75,
    y: 25 + (i * 13 + 10) % 50,
  }));

  return (
    <div className="glass rounded-xl p-5 xl:col-span-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">Global Surveillance Network</div>
          <div className="text-xs text-muted-foreground">{cameras.length} cameras · real-time crowd counts</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary-glow" /> Active</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-destructive" /> Offline</span>
        </div>
      </div>

      <div className="mt-4 relative aspect-[16/8] rounded-lg overflow-hidden grid-bg border border-border/40">
        <svg viewBox="0 0 100 50" className="absolute inset-0 size-full opacity-25" preserveAspectRatio="none">
          <path d="M5,25 Q15,15 25,22 T45,18 Q55,28 65,22 T85,25 Q92,30 95,28 L95,42 Q80,38 70,42 T50,40 Q35,45 20,42 T5,40 Z"
            fill="oklch(0.62 0.22 260 / 0.15)" stroke="oklch(0.62 0.22 260 / 0.5)" strokeWidth="0.2" />
        </svg>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary opacity-50" />
          </div>
        )}

        {positions.map(({ cam, x, y }, i) => (
          <button
            key={cam.id}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => toast.info(`${cam.name}: ${cam.crowd_count?.toLocaleString()} people · ${cam.status}`)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className={`block map-dot ${cam.status === 'offline' ? 'alert' : ''} pulse-dot`} />
            {hover === i && (
              <div className="absolute left-4 top-0 z-10 w-52 rounded-md border border-border/60 bg-popover/95 backdrop-blur-md p-2 text-left shadow-lg">
                <div className="text-xs font-semibold">{cam.name}</div>
                <div className="text-[10px] text-muted-foreground">{cam.location}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Users className="size-3 text-primary" />
                  <span className="text-[10px] font-mono font-semibold text-primary">{cam.crowd_count?.toLocaleString()} people</span>
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px]">
                  <MapPin className="size-2.5" /> {cam.zone}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Live Alert Feed ---------- */

function LiveAlertFeed({ alerts, loading }: { alerts: any[]; loading: boolean }) {
  const updateAlert = useUpdateAlert();

  const handleAck = (id: number, title: string) => {
    updateAlert.mutate({ id, status: 'acknowledged' });
    toast.success(`Alert "${title}" acknowledged`);
  };

  return (
    <div className="glass rounded-xl p-5 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="font-display font-semibold inline-flex items-center gap-2">
          <Activity className="size-4 text-primary" /> Live Alerts
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[oklch(0.78_0.18_155)]">
          <span className="size-1.5 rounded-full bg-[oklch(0.7_0.18_155)] pulse-dot" /> Live
        </span>
      </div>
      <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {loading && <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>}
        {!loading && alerts.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No open alerts — all clear ✓</div>
        )}
        {alerts.filter(a => (a.status ?? 'open') === 'open').map((a, i) => (
          <div key={i} className="rounded-lg border border-border/60 bg-white/[0.02] p-3 hover:bg-white/[0.05] transition">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sevColor[a.severity] ?? sevColor.medium}`}>
                {a.severity}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">{a.age}</span>
            </div>
            <div className="mt-1.5 text-sm">{a.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{a.camera_name}</div>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => handleAck(a.id, a.title)}
                className="text-[10px] rounded border border-border/60 px-2 py-1 hover:bg-white/5 inline-flex items-center gap-1"
              >
                <CheckCircle2 className="size-2.5" /> Ack
              </button>
              <button
                onClick={() => toast.info(`Assigning officer to: ${a.title}`)}
                className="text-[10px] rounded border border-border/60 px-2 py-1 hover:bg-white/5 inline-flex items-center gap-1"
              >
                <UserPlus className="size-2.5" /> Assign
              </button>
              <button
                onClick={() => {
                  toast.error(`Escalating: ${a.title}`);
                  window.dispatchEvent(new CustomEvent("trigger-critical-alert", { detail: { id: `A-${a.id}`, cam: a.camera_name, title: a.title } }));
                }}
                className="text-[10px] rounded border border-destructive/40 text-destructive px-2 py-1 hover:bg-destructive/10 inline-flex items-center gap-1"
              >
                <ArrowUp className="size-2.5" /> Escalate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Camera Status Grid ---------- */

function CameraStatusGrid({ cameras, loading }: { cameras: any[]; loading: boolean }) {
  const visible = cameras.slice(0, 8);
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold">Camera Status · Live Crowd Counts</div>
          <div className="text-xs text-muted-foreground">Refreshes every 8 seconds from API</div>
        </div>
        <Link to="/live-feeds" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          Watch live <ArrowUpRight className="size-3" />
        </Link>
      </div>
      {loading && <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {visible.map((c, i) => (
          <Link
            key={c.id}
            to="/live-feeds/$id"
            params={{ id: String(c.id) }}
            className="group relative aspect-video rounded-lg overflow-hidden border border-border/60 bg-[oklch(0.08_0.03_270)] surveil-bg"
          >
            <div className="absolute inset-0 opacity-70" style={{
              background: `radial-gradient(circle at ${30 + i * 8}% ${40 + (i % 3) * 12}%, oklch(0.35 0.08 ${250 + i * 6}) 0%, oklch(0.1 0.03 270) 70%)`,
            }} />
            <div className="absolute inset-0 scanline" />
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase">
              {c.status === 'active' ? (
                <><span className="size-1.5 rounded-full bg-destructive pulse-dot" /><span className="text-destructive">LIVE</span></>
              ) : (
                <span className="text-muted-foreground">OFFLINE</span>
              )}
            </div>
            {/* Live crowd count badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono font-bold bg-black/60 rounded px-1.5 py-0.5">
              <Users className="size-2.5 text-primary" />
              <span className="text-primary">{c.crowd_count?.toLocaleString()}</span>
            </div>
            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <div className="text-xs font-semibold truncate">{c.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{c.location}</div>
            </div>
            <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <Eye className="size-5 text-white" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- Recent Alerts ---------- */

function RecentAlerts({ alerts, loading }: { alerts: any[]; loading: boolean }) {
  const updateAlert = useUpdateAlert();
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const changeStatus = (id: number, status: string, title: string) => {
    updateAlert.mutate({ id, status: status as any });
    toast.success(`Alert "${title}" updated to "${status}"`);
    setMenuOpen(null);
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="font-display font-semibold">Recent Alerts</div>
        <Link to="/alerts" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      <div className="mt-4 overflow-x-auto">
        {loading && <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-primary" /></div>}
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border/60">
              {["Title", "Camera", "Severity", "Status", "Age", ""].map(h => <th key={h} className="text-left font-medium py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-b border-border/40 hover:bg-white/[0.02]">
                <td className="py-3 text-sm">{a.title}</td>
                <td className="py-3 text-muted-foreground text-xs">{a.camera_name}</td>
                <td className="py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sevColor[a.severity] ?? sevColor.medium}`}>{a.severity}</span>
                </td>
                <td className="py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border capitalize ${statusColor[a.status ?? 'open'] ?? statusColor.open}`}>
                    {a.status ?? 'open'}
                  </span>
                </td>
                <td className="py-3 text-xs text-muted-foreground">{a.age}</td>
                <td className="py-3 text-right relative">
                  <button onClick={() => setMenuOpen(menuOpen === a.id ? null : a.id)} className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen === a.id && (
                    <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-border/60 bg-popover/95 backdrop-blur-md p-1 shadow-xl text-left">
                      {["acknowledged", "resolved", "closed"].map(s => (
                        <button key={s} onClick={() => changeStatus(a.id, s, a.title)}
                          className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-white/5 capitalize">{s}</button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
