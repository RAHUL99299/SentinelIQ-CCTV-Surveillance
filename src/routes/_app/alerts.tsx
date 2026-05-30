import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, UserPlus, Bell, Clock, Trophy, Download, CheckSquare, Medal, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useAlerts, useUpdateAlert, useDeleteAlert, useCameras } from "@/lib/queries";
import type { Alert } from "@/lib/api";
import { CctvPlayer } from "@/components/sentinel/CctvPlayer";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: "Alert Center — SentinelIQ" }] }),
  component: AlertCenter,
});

const sevColor: Record<string, string> = {
  critical: "border-destructive/50 bg-destructive/10 text-destructive",
  high:     "border-[oklch(0.78_0.17_75/0.5)] bg-[oklch(0.78_0.17_75/0.1)] text-[oklch(0.85_0.17_75)]",
  medium:   "border-primary/50 bg-primary/10 text-primary",
  low:      "border-[oklch(0.7_0.18_155/0.5)] bg-[oklch(0.7_0.18_155/0.1)] text-[oklch(0.78_0.18_155)]",
};
const sevDot: Record<string, string> = {
  critical: "bg-destructive",
  high:     "bg-[oklch(0.78_0.17_75)]",
  medium:   "bg-primary",
  low:      "bg-[oklch(0.7_0.18_155)]",
};

function AlertCenter() {
  const { data: alerts = [], isLoading, isError, refetch } = useAlerts();
  const { data: cameras = [] } = useCameras();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const [selected, setSelected] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [escalateSnapshot, setEscalateSnapshot] = useState<Alert | null>(null);

  const currentAlert = alerts[selected] ?? alerts[0];

  const toggleId = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const resolve = (id: number, title: string) => {
    updateAlert.mutate({ id, status: "resolved" }, {
      onSuccess: () => toast.success(`"${title}" resolved`),
    });
  };

  const acknowledge = (id: number, title: string) => {
    updateAlert.mutate({ id, status: "acknowledged" }, {
      onSuccess: () => toast.success(`"${title}" acknowledged`),
    });
  };

  const bulkResolve = () => {
    selectedIds.forEach(id => {
      const a = alerts.find(a => a.id === id);
      updateAlert.mutate({ id, status: "resolved" });
    });
    toast.success(`${selectedIds.size} alert(s) resolved`);
    setSelectedIds(new Set());
  };

  const handleFalsePositive = (id: number, title: string) => {
    deleteAlert.mutate(id, {
      onSuccess: () => {
        toast.success(`"${title}" removed as false positive`);
        setSelected(0);
      },
    });
  };

  const escalate = (a: Alert) => {
    setEscalateSnapshot(a);
    toast.error(`"${a.title}" escalated to ${a.severity === "critical" ? "Admin + PD" : "Security Manager"}`);
    window.dispatchEvent(new CustomEvent("trigger-critical-alert", {
      detail: { id: `A-${a.id}`, cam: a.camera_name, title: a.title },
    }));
  };

  if (isError) return (
    <div className="glass rounded-xl p-10 text-center space-y-2">
      <div className="text-destructive">Cannot connect to API</div>
      <button onClick={() => refetch()} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><RefreshCw className="size-3" /> Retry</button>
    </div>
  );

  const openAlerts = alerts.filter(a => a.status === "open");

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Alert Center</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${openAlerts.length} open · ${alerts.length} total · sorted by severity`}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
            <span className="text-sm font-medium mr-2">{selectedIds.size} selected</span>
            <button onClick={bulkResolve} className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10"><CheckSquare className="size-3" /> Resolve All</button>
            <button onClick={() => { toast.info("Exporting selected…"); setSelectedIds(new Set()); }} className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10"><Download className="size-3" /> Export</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Alert list */}
        <div className="col-span-12 lg:col-span-3 glass rounded-xl p-3 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto">
          {isLoading && <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-primary" /></div>}
          {!isLoading && alerts.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No alerts — all clear ✓</div>}
          {alerts.map((a, i) => (
            <button key={a.id} onClick={() => setSelected(i)}
              className={`w-full text-left rounded-lg p-3 border transition ${selected === i ? "border-primary/50 bg-primary/10" : "border-border/40 hover:bg-white/[0.03]"} ${a.status !== "open" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <input type="checkbox" checked={selectedIds.has(a.id)} onClick={(e) => toggleId(a.id, e)} className="accent-primary mr-1" />
                <span className={`size-2 rounded-full ${sevDot[a.severity] ?? "bg-primary"} ${a.severity === "critical" ? "pulse-dot" : ""}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider text-${a.severity === "critical" ? "destructive" : a.severity === "high" ? "[oklch(0.85_0.17_75)]" : a.severity === "low" ? "[oklch(0.78_0.18_155)]" : "primary"}`}>{a.severity}</span>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-muted-foreground"><Clock className="size-3" /> {a.age}</span>
              </div>
              <div className="text-sm">{a.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{a.camera_name ?? "Unknown camera"}</div>
              {a.status !== "open" && <div className="text-[10px] text-[oklch(0.78_0.18_155)] mt-1">✓ {a.status}</div>}
            </button>
          ))}
        </div>

        {/* Detail view */}
        {currentAlert && (
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">#{currentAlert.id} · {currentAlert.camera_name}</div>
                  <h2 className="text-xl font-display font-semibold">{currentAlert.title}</h2>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${sevColor[currentAlert.severity] ?? sevColor.medium}`}>
                  {currentAlert.severity}
                </span>
              </div>
              {currentAlert.description && (
                <p className="mt-3 text-sm text-muted-foreground">{currentAlert.description}</p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Type: <span className="text-foreground">{currentAlert.type}</span></span>
                <span>Confidence: <span className="text-primary font-mono font-semibold">{currentAlert.confidence}%</span></span>
                <span>Status: <span className="text-foreground capitalize">{currentAlert.status}</span></span>
              </div>
              <div className="mt-4 aspect-video rounded-lg bg-[oklch(0.07_0.03_270)] surveil-bg relative overflow-hidden border border-border/60">
                {(() => {
                  const cam = cameras.find(c => c.id === currentAlert.camera_id || c.name === currentAlert.camera_name);
                  if (cam) {
                    return <CctvPlayer camera={cam} enableDetection={false} />;
                  }
                  return (
                    <>
                      <div className="absolute inset-0" style={{ background: `radial-gradient(circle, oklch(0.32 0.08 250) 0%, oklch(0.07 0.03 270) 75%)` }} />
                      <div className="absolute inset-0 scanline" />
                    </>
                  );
                })()}
                <div className="absolute inset-0 scanline pointer-events-none" />
                <span className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-destructive">● LIVE SNAPSHOT · {currentAlert.camera_name ?? "Unknown"}</span>
                <div className="absolute bottom-2 right-2 font-mono text-[10px] bg-black/60 px-2 py-0.5 rounded">{currentAlert.age}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() => acknowledge(currentAlert.id, currentAlert.title)}
                  disabled={currentAlert.status !== "open" || updateAlert.isPending}
                  className="rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Check className="size-3" /> Acknowledge
                </button>
                <button
                  onClick={() => resolve(currentAlert.id, currentAlert.title)}
                  disabled={currentAlert.status === "resolved" || updateAlert.isPending}
                  className="rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <CheckSquare className="size-3" /> Resolve
                </button>
                <button
                  onClick={() => escalate(currentAlert)}
                  className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                >
                  Escalate
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => toast.info(`Assigning officer to: ${currentAlert.title}`)} className="rounded-lg border border-border/60 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center justify-center gap-1.5">
                  <UserPlus className="size-3" /> Assign Officer
                </button>
                <button
                  onClick={() => handleFalsePositive(currentAlert.id, currentAlert.title)}
                  disabled={deleteAlert.isPending}
                  className="rounded-lg border border-border/60 px-3 py-2 text-xs text-destructive/70 hover:bg-destructive/10 hover:border-destructive/40 disabled:opacity-40"
                >
                  Mark False Positive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-3 space-y-3">
          <div className="glass rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Escalation Matrix</div>
            <ol className="space-y-1.5">
              {[
                { lvl: "L1", role: "CCTV Operator", t: "0s — Auto" },
                { lvl: "L2", role: "Security Manager", t: "5m unresolved" },
                { lvl: "L3", role: "Admin + PD", t: "15m unresolved" },
              ].map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded border border-border/60 p-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{s.lvl}</span>
                  <div className="flex-1">
                    <div className="text-xs">{s.role}</div>
                    <div className="text-[10px] text-muted-foreground">{s.t}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5"><Trophy className="size-3" /> SLA · Today</div>
            <div className="space-y-2 text-xs">
              {[
                { l: "Open", v: openAlerts.length, t: "alerts requiring action" },
                { l: "Total", v: alerts.length, t: "alerts in system" },
              ].map(s => (
                <div key={s.l} className="flex justify-between border-b border-border/40 pb-1.5">
                  <div><div>{s.l}</div><div className="text-[10px] text-muted-foreground">{s.t}</div></div>
                  <div className="font-mono font-semibold text-primary">{isLoading ? "—" : s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Escalate Snapshot Overlay */}
      {escalateSnapshot && (() => {
        const snapCam = cameras.find(c => c.id === escalateSnapshot.camera_id || c.name === escalateSnapshot.camera_name);
        return (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setEscalateSnapshot(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-destructive/50 bg-[oklch(0.08_0.03_270)]/95 backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl"
              style={{ boxShadow: "0 0 60px oklch(0.62 0.24 25 / 0.35)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-destructive/30 bg-destructive/10">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-bold text-destructive uppercase tracking-widest">↑ ESCALATED — ALERT SNAPSHOT</span>
                </div>
                <button
                  onClick={() => setEscalateSnapshot(null)}
                  className="rounded-lg border border-border/60 p-1.5 hover:bg-white/10 transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Incident meta */}
              <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-4">
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 text-destructive`}>
                    {escalateSnapshot.severity} SEVERITY · A-{escalateSnapshot.id}
                  </div>
                  <div className="text-xl font-display font-bold text-foreground">{escalateSnapshot.title}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {escalateSnapshot.camera_name ?? "Unknown Camera"} · {escalateSnapshot.age}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                  <div className="text-2xl font-mono font-bold text-foreground">{escalateSnapshot.confidence}%</div>
                </div>
              </div>

              {/* Live camera snapshot */}
              <div className="mx-5 rounded-xl overflow-hidden border border-border/60 relative aspect-video bg-black">
                {snapCam ? (
                  <CctvPlayer camera={snapCam} enableDetection={false} />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(circle at 50% 50%, oklch(0.3 0.1 250) 0%, oklch(0.07 0.03 270) 70%)` }}
                  />
                )}
                <div className="absolute inset-0 scanline pointer-events-none" />
                {/* Timestamp watermark */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-white/80">
                  <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                  ESCALATED · {new Date().toLocaleTimeString()}
                </div>
                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-destructive font-bold flex items-center gap-1">
                  ↑ LIVE ESCALATION FEED · {escalateSnapshot.camera_name ?? "Unknown"}
                </div>
              </div>

              {/* Description */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-destructive/40 pl-3">
                  {escalateSnapshot.description || `${escalateSnapshot.type} detected at ${escalateSnapshot.camera_name}. Immediate response escalated.`}
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setEscalateSnapshot(null)}
                    className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-white/5 transition"
                  >
                    Close Snapshot
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
