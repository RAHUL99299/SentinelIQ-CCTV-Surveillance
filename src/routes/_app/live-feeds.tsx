import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Grid2X2, LayoutGrid, Maximize2, Volume2, VolumeX,
  Users, Loader2, ExternalLink, Camera, RefreshCw,
  Wifi, WifiOff, Circle, Square, Shield, HardHat, Eye, Car, Trash2,
} from "lucide-react";
import { useState, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCameras, useAlerts, useDeleteCamera } from "@/lib/queries";
import { CctvPlayer } from "@/components/sentinel/CctvPlayer";
import type { Camera as CameraType } from "@/lib/api";
import { CameraFormModal } from "@/components/sentinel/CameraFormModal";

export const Route = createFileRoute("/_app/live-feeds")({
  head: () => ({ meta: [{ title: "Live Feeds — SentinelIQ" }] }),
  component: LiveFeeds,
});

const LAYOUTS = [
  { v: 1 as const, Icon: LayoutGrid, label: "1×1 Focus" },
  { v: 2 as const, Icon: Grid2X2,   label: "2×2 Wall" },
] as const;

const ZONE_STYLE: Record<string, { icon: typeof Users; className: string }> = {
  "Crowd Management": { icon: Users, className: "bg-primary/90 text-primary-foreground" },
  "Crime Prevention": { icon: Shield, className: "bg-destructive/90 text-white" },
  "Work Monitoring": { icon: HardHat, className: "bg-[oklch(0.78_0.17_75)] text-black" },
  "Public Safety": { icon: Eye, className: "bg-[oklch(0.7_0.18_155)] text-black" },
};

export default function LiveFeeds() {
  const { data: cameras = [], isLoading, isError, refetch } = useCameras();
  const { data: alerts = [] } = useAlerts({ status: "open" });
  const [layout, setLayout] = useState<1 | 2>(2);
  const [muted, setMuted]   = useState<Record<number, boolean>>({});
  const [rec, setRec]       = useState<Record<number, boolean>>({});
  const [focused, setFocused] = useState<CameraType | null>(null);
  const [focusedLiveCount, setFocusedLiveCount] = useState<number>(0);
  const [focusedLiveVehCount, setFocusedLiveVehCount] = useState<number>(0);
  const [isAddCameraOpen, setIsAddCameraOpen] = useState(false);
  const deleteCamera = useDeleteCamera();

  const handleDeleteCamera = useCallback((cam: CameraType) => {
    if (confirm(`Are you sure you want to remove the camera "${cam.name}"?`)) {
      deleteCamera.mutate(cam.id, {
        onSuccess: () => {
          toast.success(`Camera "${cam.name}" removed successfully.`);
        },
        onError: (err: any) => {
          toast.error(`Failed to remove camera: ${err.message}`);
        }
      });
    }
  }, [deleteCamera]);

  const handleFocusedCountChange = useCallback((c: number, v: number) => {
    setFocusedLiveCount(c);
    setFocusedLiveVehCount(v);
  }, []);

  const setFocusedCamera = useCallback((cam: CameraType | null) => {
    setFocused(cam);
    setFocusedLiveCount(cam?.crowd_count ?? 0);
    setFocusedLiveVehCount(0);
  }, []);

  const liveCameras = cameras
    .filter((c) => c.status === "active");
  const visible = layout === 1 ? liveCameras.slice(0, 1) : liveCameras;

  const toggleMute = useCallback((cam: CameraType) => {
    setMuted(m => {
      const next = !m[cam.id];
      toast.info(`${cam.name} audio ${next ? "muted" : "unmuted"}`);
      return { ...m, [cam.id]: next };
    });
  }, []);

  const toggleRec = useCallback((cam: CameraType) => {
    setRec(r => {
      const next = !r[cam.id];
      toast.success(next ? `Recording started: ${cam.name}` : `Recording saved: ${cam.name}`);
      return { ...r, [cam.id]: next };
    });
  }, []);

  const handleSnapshot = useCallback((cam: CameraType) => {
    toast.success(`Snapshot captured from ${cam.name} — saved to evidence vault`);
  }, []);

  if (isError) return (
    <div className="glass rounded-xl p-10 text-center space-y-3">
      <WifiOff className="size-8 mx-auto text-destructive opacity-60" />
      <div className="text-destructive font-semibold">Cannot connect to API</div>
      <code className="block text-xs bg-white/5 rounded px-3 py-1.5 font-mono">cd api &amp;&amp; php artisan serve</code>
      <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1">
        <RefreshCw className="size-3" /> Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Live Feeds</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading live feeds…"
              : `${liveCameras.length} EarthCam live feeds · YOLO crowd & crime monitoring`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout switcher */}
          <div className="flex rounded-lg border border-border/60 overflow-hidden">
            {LAYOUTS.map(o => (
              <button key={o.v} onClick={() => { setLayout(o.v); setFocused(null); }}
                className={cn("px-3 py-1.5 text-xs flex items-center gap-1 transition",
                  layout === o.v ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5")}>
                <o.Icon className="size-3" /> {o.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsAddCameraOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-glow transition"
          >
            Add Camera
          </button>
          <Link to="/cameras" className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">
            Manage cameras
          </Link>
        </div>
      </div>

      {/* Alert banner for open critical alerts */}
      {alerts.filter(a => a.severity === "critical").length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm">
          <span className="size-2 rounded-full bg-destructive pulse-dot flex-shrink-0" />
          <span className="font-semibold text-destructive">{alerts.filter(a => a.severity === "critical").length} Critical Alert{alerts.filter(a => a.severity === "critical").length > 1 ? "s" : ""} Active</span>
          <span className="text-muted-foreground text-xs">{alerts.filter(a => a.severity === "critical")[0]?.title}</span>
          <Link to="/alerts" className="ml-auto text-xs text-primary hover:underline flex-shrink-0">View →</Link>
        </div>
      )}

      {isLoading && <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div>}

      {/* Focused fullscreen overlay */}
      {focused && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-border/40">
            <div>
              <div className="font-semibold text-sm">{focused.name}</div>
              <div className="text-[10px] text-muted-foreground">{focused.location}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] text-destructive font-bold">
                <span className="size-1.5 rounded-full bg-destructive pulse-dot" /> LIVE
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
                <Users className="size-2.5" /> {focusedLiveCount.toLocaleString()} people
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-red-500 border-l border-white/20 pl-2">
                <Car className="size-2.5" /> {focusedLiveVehCount.toLocaleString()} vehicles
              </span>
              <button onClick={() => setFocusedCamera(null)} className="text-xs rounded border border-border/60 px-3 py-1 hover:bg-white/10">✕ Close</button>
            </div>
          </div>
          <div className="flex-1 relative">
            <CctvPlayer camera={focused} fullscreen enableDetection onCountsChange={handleFocusedCountChange} />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-black/80 border-t border-border/40">
            <button onClick={() => toggleMute(focused)} className="flex items-center gap-1.5 text-xs rounded border border-border/60 px-2 py-1 hover:bg-white/5">
              {muted[focused.id] ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
              {muted[focused.id] ? "Unmute" : "Mute"}
            </button>
            <button onClick={() => toggleRec(focused)} className={cn("flex items-center gap-1.5 text-xs rounded border px-2 py-1 transition", rec[focused.id] ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border/60 hover:bg-white/5")}>
              {rec[focused.id] ? <Square className="size-3 fill-current" /> : <Circle className="size-3" />}
              {rec[focused.id] ? "Stop REC" : "Record"}
            </button>
            <button onClick={() => handleSnapshot(focused)} className="flex items-center gap-1.5 text-xs rounded border border-border/60 px-2 py-1 hover:bg-white/5">
              <Camera className="size-3" /> Snapshot
            </button>
            <a href={focused.embed_url ?? focused.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs rounded border border-primary/50 bg-primary/10 text-primary px-2 py-1 hover:bg-primary/20 ml-auto">
              <ExternalLink className="size-3" /> Open stream
            </a>
          </div>
        </div>
      )}

      {/* Camera grid */}
      {!isLoading && (
        <div className={cn(
          "grid gap-3",
          layout === 1 ? "grid-cols-1 max-w-5xl mx-auto" : "grid-cols-1 md:grid-cols-2",
        )}>
          {visible.map(cam => (
            <MemoizedCameraCard
              key={cam.id}
              cam={cam}
              muted={!!muted[cam.id]}
              recording={!!rec[cam.id]}
              compact={false}
              onFocus={setFocusedCamera}
              onMute={toggleMute}
              onRecord={toggleRec}
              onSnapshot={handleSnapshot}
              onDelete={handleDeleteCamera}
            />
          ))}
        </div>
      )}

      {/* Camera strip for 1×1 mode */}
      {layout === 1 && liveCameras.length > 1 && !isLoading && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Switch camera · Click to focus</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {liveCameras.map(cam => (
              <button key={cam.id} onClick={() => setFocusedCamera(cam)}
                className="flex-shrink-0 rounded-lg border border-border/60 bg-white/[0.02] hover:bg-white/5 p-2 text-left w-36 transition">
                <div className="text-[10px] font-semibold truncate">{cam.name}</div>
                <div className="text-[9px] text-muted-foreground truncate">{cam.location}</div>
                <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-primary">
                  <Users className="size-2.5" />{cam.crowd_count?.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reusable Add Camera Modal */}
      <CameraFormModal 
        open={isAddCameraOpen} 
        onClose={() => setIsAddCameraOpen(false)} 
        editCam={null} 
      />
    </div>
  );
}

// ─── Camera Card ─────────────────────────────────────────────────────────────

const MemoizedCameraCard = memo(function CameraCard({ cam, muted, recording, compact, onFocus, onMute, onRecord, onSnapshot, onDelete }: {
  cam: CameraType; muted: boolean; recording: boolean; compact: boolean;
  onFocus: (cam: CameraType) => void; onMute: (cam: CameraType) => void; onRecord: (cam: CameraType) => void; onSnapshot: (cam: CameraType) => void;
  onDelete: (cam: CameraType) => void;
}) {
  const camAlerts = useAlerts({ camera_id: cam.id }).data?.filter(a => a.status === "open") ?? [];
  const hasCritical = camAlerts.some(a => a.severity === "critical");
  const zoneKey = cam.zone ?? "Public Safety";
  const zoneUi = ZONE_STYLE[zoneKey] ?? ZONE_STYLE["Public Safety"];
  const ZoneIcon = zoneUi.icon;

  // Real-time count from Flask YOLO (matches bounding boxes exactly)
  const [liveCount, setLiveCount] = useState<number>(cam.crowd_count ?? 0);
  const [liveVehCount, setLiveVehCount] = useState<number>(0);
  const handleCountsChange = useCallback((people: number, vehicles: number) => {
    setLiveCount(people);
    setLiveVehCount(vehicles);
  }, []);

  return (
    <div className={cn("group relative rounded-xl overflow-hidden border bg-[oklch(0.07_0.03_270)] transition",
      hasCritical ? "border-destructive/60" : "border-border/60")}>

      <div className={cn("relative w-full", compact ? "aspect-[4/3]" : "aspect-video")}>
        <CctvPlayer camera={cam} compact={compact} enableDetection onCountsChange={handleCountsChange} />
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", zoneUi.className)}>
            <ZoneIcon className="size-2.5" />
            {zoneKey}
          </span>
        </div>
        {/* Overlay controls (appear on hover) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition pointer-events-none" />
        <button
          onClick={() => onFocus(cam)}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-auto cursor-pointer outline-none w-full h-full bg-transparent border-none"
        >
          <div className="rounded-lg bg-black/70 border border-white/20 px-4 py-2 text-xs font-semibold text-white flex items-center gap-2">
            <Maximize2 className="size-3.5" /> Expand
          </div>
        </button>
        {/* Alert badge */}
        {hasCritical && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold bg-destructive/90 text-white rounded px-1.5 py-0.5 animate-pulse">
            ⚠ ALERT
          </div>
        )}
        {/* Recording indicator */}
        {recording && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold bg-black/70 text-destructive rounded px-1.5 py-0.5">
            <span className="size-1.5 rounded-full bg-destructive pulse-dot" /> REC
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80">
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-semibold truncate">{cam.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{cam.location} {cam.assigned_person ? `· Ops: ${cam.assigned_person}` : ""}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
            <Users className="size-2.5" />{liveCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-red-500 border-l border-white/20 pl-2">
            <Car className="size-2.5" />{liveVehCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-destructive font-bold">
            <span className="size-1.5 rounded-full bg-destructive pulse-dot" />LIVE
          </span>
          {!compact && (<>
            <button onClick={() => onMute(cam)} title={muted ? "Unmute" : "Mute"} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition">
              {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>
            <button onClick={() => onRecord(cam)} title="Record" className={cn("p-1 rounded transition", recording ? "text-destructive" : "text-muted-foreground hover:text-white hover:bg-white/10")}>
              <Circle className={cn("size-3.5", recording && "fill-destructive text-destructive")} />
            </button>
            <button onClick={() => onSnapshot(cam)} title="Snapshot" className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition cursor-pointer">
              <Camera className="size-3.5" />
            </button>
            <a href={cam.embed_url ?? cam.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition cursor-pointer">
              <ExternalLink className="size-3.5" />
            </a>
            <button onClick={() => onDelete(cam)} title="Remove Camera" className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition cursor-pointer">
              <Trash2 className="size-3.5" />
            </button>
          </>)}
        </div>
      </div>
    </div>
  );
});
