import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Minus,
  Camera as CameraIcon, Download, Flag, ZoomIn, ZoomOut,
  Activity, Maximize2, Users, AlertTriangle, ExternalLink,
  Volume2, VolumeX, Circle, Square, RefreshCw, Loader2, Car,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { CctvPlayer } from "@/components/sentinel/CctvPlayer";
import { useCamera, useCameraStats, useAlerts, useCreateAlert } from "@/lib/queries";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { Camera as CameraType } from "@/lib/api";

export const Route = createFileRoute("/_app/live-feeds/$id")({
  head: () => ({ meta: [{ title: "Camera View — SentinelIQ" }] }),
  component: SingleCamera,
});

function SingleCamera() {
  const { id } = Route.useParams();
  const camId = Number(id);

  const { data: camera, isLoading: camLoading, refetch } = useCamera(camId);
  const { data: statsData, isLoading: statsLoading } = useCameraStats(camId);
  const { data: allAlerts = [] } = useAlerts({ camera_id: camId });
  const createAlert = useCreateAlert();

  const [zoom, setZoom]     = useState(35);
  const [dvr, setDvr]       = useState(0);
  const [muted, setMuted]   = useState(false);
  const [recording, setRec] = useState(false);

  // Real-time count from Flask YOLO — matches bounding boxes drawn on the stream
  const [liveCount, setLiveCount] = useState<number>(0);
  const [liveVehCount, setLiveVehCount] = useState<number>(0);
  const handleCountsChange = useCallback((people: number, vehicles: number) => {
    setLiveCount(people);
    setLiveVehCount(vehicles);
  }, []);

  // Seed liveCount from DB once camera data is loaded (before MJPEG starts)
  const [seeded, setSeeded] = useState(false);
  if (camera && !seeded) {
    setLiveCount(camera.crowd_count ?? 0);
    setSeeded(true);
  }

  const stats = statsData?.stats ?? [];
  const chartData = stats.map((s, i) => ({
    t: i,
    v: s.crowd_count,
  }));

  const openAlerts = allAlerts.filter(a => a.status === "open");

  const handlePTZ = (dir: string) => toast.info(`PTZ → ${dir}`);
  const handleSnapshot = () => toast.success("Snapshot captured and saved to evidence vault");
  const handleExportClip = () => toast.success("Clip export queued — download ready in 30s");

  const handleFlagIncident = () => {
    if (!camera) return;
    createAlert.mutate({
      camera_id: camId,
      title: `Manually flagged incident at ${camera.name}`,
      type: "Manual Flag",
      severity: "high",
      confidence: 100,
      description: "Operator manually flagged this camera feed as an incident.",
    }, {
      onSuccess: () => toast.error(`Incident flagged at ${camera.name} — alert raised`),
    });
  };

  if (camLoading) return (
    <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>
  );
  if (!camera) return (
    <div className="glass rounded-xl p-10 text-center">
      <div className="text-destructive">Camera not found</div>
      <Link to="/live-feeds" className="text-xs text-primary mt-2 hover:underline block">← Back to feeds</Link>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/live-feeds" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3" /> All Cameras
          </Link>
          <h1 className="text-2xl font-display font-semibold tracking-tight mt-0.5">{camera.name}</h1>
          <p className="text-sm text-muted-foreground">{camera.location} · {camera.zone} · {camera.stream_type?.toUpperCase()} · {camera.ptz ? "PTZ" : "Fixed"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleSnapshot} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">
            <CameraIcon className="size-3.5" /> Snapshot
          </button>
          <button onClick={handleExportClip} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">
            <Download className="size-3.5" /> Export Clip
          </button>
          <button onClick={handleFlagIncident} disabled={createAlert.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60">
            <Flag className="size-3.5" /> Flag Incident
          </button>
          {camera.url && (
            <a href={camera.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 text-primary px-3 py-1.5 text-xs hover:bg-primary/20">
              <ExternalLink className="size-3.5" /> EarthCam Live
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          {/* Main player — imports the same EarthCamPlayer from live-feeds */}
          <div className="relative aspect-video rounded-xl overflow-hidden border border-border/60 bg-[oklch(0.06_0.03_270)]">
            <CctvPlayer camera={camera} enableDetection onCountsChange={handleCountsChange} />
            {/* HUD overlays */}
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-xs font-bold">
              <span className="size-2 rounded-full bg-destructive pulse-dot" />
              <span className="text-destructive">{recording ? "● REC · LIVE" : "LIVE"}</span>
            </div>
            <div className="absolute top-3 right-3 font-mono text-xs text-muted-foreground bg-black/50 px-1.5 py-0.5 rounded">
              {new Date().toLocaleTimeString("en-US", { hour12: false })}
            </div>
            <div className="absolute bottom-3 right-3 flex items-center gap-3 font-mono text-xs bg-black/60 px-2 py-0.5 rounded">
              <div className="flex items-center gap-1">
                <Users className="size-3 text-primary" />
                <span className="text-primary font-semibold">{liveCount.toLocaleString()} people</span>
              </div>
              <div className="flex items-center gap-1 border-l border-white/20 pl-2">
                <Car className="size-3 text-red-500" />
                <span className="text-red-400 font-semibold">{liveVehCount.toLocaleString()} vehicles</span>
              </div>
            </div>
            {/* Transport controls */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button onClick={() => { setMuted(!muted); toast.info(`Audio ${muted ? "unmuted" : "muted"}`); }}
                className="grid size-7 place-items-center rounded bg-black/70 hover:bg-black/90 transition">
                {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              </button>
              <button onClick={() => { setRec(!recording); toast.success(recording ? "Recording saved" : "Recording started"); }}
                className="grid size-7 place-items-center rounded bg-black/70 hover:bg-black/90 transition">
                {recording ? <Square className="size-3.5 fill-destructive text-destructive" /> : <Circle className="size-3.5" />}
              </button>
              <button onClick={handleSnapshot} className="grid size-7 place-items-center rounded bg-black/70 hover:bg-black/90 transition">
                <CameraIcon className="size-3.5" />
              </button>
            </div>
          </div>

          {/* DVR timeline */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">DVR Playback</span>
              <span className="font-mono text-muted-foreground">
                {dvr === 0 ? "● LIVE" : `−${Math.floor(dvr / 60)}h ${dvr % 60}m from live`}
              </span>
            </div>
            <input type="range" min={0} max={1440} value={dvr} onChange={e => setDvr(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
              {["−24h","−18h","−12h","−6h","LIVE"].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>

          {/* PTZ */}
          {camera.ptz && (
            <div className="glass rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">PTZ Control</div>
              <div className="flex items-center gap-6">
                <div className="grid grid-cols-3 gap-1">
                  <span />
                  <button onClick={() => handlePTZ("Up")} className="grid size-9 place-items-center rounded border border-border/60 hover:bg-white/10 active:scale-95 transition"><ChevronUp className="size-4" /></button>
                  <span />
                  <button onClick={() => handlePTZ("Left")} className="grid size-9 place-items-center rounded border border-border/60 hover:bg-white/10 active:scale-95 transition"><ChevronLeft className="size-4" /></button>
                  <button onClick={() => toast.info("PTZ Home position")} className="grid size-9 place-items-center rounded border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold active:scale-95 transition">HOME</button>
                  <button onClick={() => handlePTZ("Right")} className="grid size-9 place-items-center rounded border border-border/60 hover:bg-white/10 active:scale-95 transition"><ChevronRight className="size-4" /></button>
                  <span />
                  <button onClick={() => handlePTZ("Down")} className="grid size-9 place-items-center rounded border border-border/60 hover:bg-white/10 active:scale-95 transition"><ChevronDown className="size-4" /></button>
                  <span />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Zoom</span>
                    <span className="font-mono">{zoom}×</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(1, z - 5))} className="grid size-7 place-items-center rounded border border-border/60 hover:bg-white/5"><Minus className="size-3" /></button>
                    <input type="range" min={1} max={100} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
                    <button onClick={() => setZoom(z => Math.min(100, z + 5))} className="grid size-7 place-items-center rounded border border-border/60 hover:bg-white/5"><Plus className="size-3" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Entrance", "Street", "Wide"].map(p => (
                      <button key={p} onClick={() => toast.info(`PTZ → Preset: ${p}`)}
                        className="rounded border border-border/60 px-1.5 py-1 text-[10px] hover:bg-white/5 transition">{p}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crowd trend chart */}
          <div className="glass rounded-xl p-4">
            <div className="font-display font-semibold text-sm mb-1 flex items-center justify-between">
              Crowd Count History — Last 60 min
              <span className="font-mono text-primary text-xs">{liveCount.toLocaleString()} now</span>
            </div>
            <div className="h-40">
              {statsLoading
                ? <div className="flex justify-center py-8"><Loader2 className="size-4 animate-spin text-primary" /></div>
                : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="t" hide />
                      <Tooltip contentStyle={{ background: "oklch(0.16 0.04 268)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any) => [v.toLocaleString(), "People"]} labelFormatter={() => ""} />
                      <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.2 250)" strokeWidth={2} fill="url(#cg)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Live counts */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Live Count Details</div>
              <Activity className="size-3.5 text-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-4xl font-display font-bold gradient-text">{liveCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">people detected</div>
              </div>
              <div>
                <div className="text-4xl font-display font-bold text-red-500">{liveVehCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">vehicles detected</div>
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground mt-2 border-t border-white/5 pt-1.5">updates in real-time from AI</div>
          </div>

          {/* Camera info */}
          <div className="glass rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Camera Details</div>
            <dl className="space-y-1.5 text-xs">
              {[
                ["ID",       `#${camera.id}`],
                ["Status",   camera.status],
                ["Zone",     camera.zone ?? "—"],
                ["Type",     camera.stream_type?.toUpperCase()],
                ["PTZ",      camera.ptz ? "Enabled" : "Fixed"],
                ["Assigned Ops", camera.assigned_person ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/40 pb-1.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className={`font-mono ${v === "active" ? "text-[oklch(0.7_0.18_155)]" : v === "offline" ? "text-destructive" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* AI detection */}
          <div className="glass rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">AI Detection · Live</div>
            {[
              { label: "Person Detection",  v: Math.min(99, 70 + Math.floor(camera.crowd_count / 30)) },
              { label: "Motion Activity",   v: Math.min(95, 40 + Math.floor(camera.crowd_count / 50)) },
              { label: "Crowd Density",     v: Math.min(100, Math.floor(camera.crowd_count / 20)) },
              { label: "Anomaly Score",     v: openAlerts.length > 0 ? 62 : 8 },
            ].map(d => (
              <div key={d.label} className="mb-2.5 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span>{d.label}</span>
                  <span className="font-mono text-muted-foreground">{d.v}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-1000" style={{ width: `${d.v}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent alerts */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Alerts for this Camera</div>
              {openAlerts.length > 0 && (
                <span className="text-[10px] font-bold text-destructive">{openAlerts.length} open</span>
              )}
            </div>
            {allAlerts.length === 0
              ? <div className="text-xs text-muted-foreground text-center py-3">No alerts — all clear ✓</div>
              : (
                <ul className="space-y-2 max-h-52 overflow-y-auto text-xs">
                  {allAlerts.slice(0, 8).map(a => (
                    <li key={a.id} className="flex items-start justify-between border-b border-border/40 pb-2 last:border-0">
                      <div>
                        <div className="font-medium">{a.type}</div>
                        <div className="text-[10px] text-muted-foreground">{a.age} · {a.confidence}% conf.</div>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
                        a.severity === "critical" ? "bg-destructive/20 text-destructive" :
                        a.severity === "high" ? "bg-[oklch(0.78_0.17_75/0.2)] text-[oklch(0.85_0.17_75)]" :
                        "bg-primary/20 text-primary"
                      }`}>{a.severity}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}