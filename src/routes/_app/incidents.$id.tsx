import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Printer, Download, MessageSquare, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_app/incidents/$id")({
  head: () => ({ meta: [{ title: "Incident Detail — SentinelIQ" }] }),
  component: IncidentDetail,
});

const timeline = [
  { t: "12:04:22", who: "AI Engine", text: "Perimeter breach detected · Confidence 94%", type: "alert" },
  { t: "12:04:45", who: "CCTV Operator", text: "Acknowledged — visual confirmation requested", type: "action" },
  { t: "12:05:12", who: "Security Manager", text: "Escalated to onsite team", type: "escalation" },
  { t: "12:06:30", who: "K. Patel", text: "Officers dispatched to North Gate", type: "note" },
  { t: "12:09:14", who: "K. Patel", text: "Subject identified — non-employee, refused exit", type: "note" },
  { t: "12:14:02", who: "System", text: "Status changed: Investigating → Resolved", type: "status" },
];

function IncidentDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/incidents" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3" /> Back to incidents
          </Link>
          <h1 className="text-2xl font-display font-semibold tracking-tight mt-1">{id.toUpperCase()} · Perimeter Breach</h1>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded border border-destructive/40 bg-destructive/15 text-destructive font-bold uppercase">Critical</span>
            <span className="px-2 py-0.5 rounded border border-primary/40 bg-primary/15 text-primary uppercase">Investigating</span>
            <span className="text-muted-foreground">North Gate · cam-01 · 12:04 PM</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">
            <Printer className="size-3.5" /> Print
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">
            <Download className="size-3.5" /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold mb-4">Timeline</div>
            <ol className="relative border-l border-border/60 ml-2 space-y-5">
              {timeline.map((e, i) => (
                <li key={i} className="ml-4">
                  <span className={`absolute -left-1.5 size-3 rounded-full ${
                    e.type === "alert" ? "bg-destructive" :
                    e.type === "escalation" ? "bg-[oklch(0.78_0.17_75)]" :
                    e.type === "status" ? "bg-[oklch(0.7_0.18_155)]" : "bg-primary"
                  } ring-4 ring-background`} />
                  <div className="flex items-baseline justify-between">
                    <div className="text-sm font-medium">{e.who}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{e.t}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{e.text}</div>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold mb-3 inline-flex items-center gap-2"><ImageIcon className="size-4" /> Evidence Vault</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video rounded-md surveil-bg bg-[oklch(0.08_0.03_270)] relative overflow-hidden border border-border/60">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(circle, oklch(0.3 0.08 ${250 + i * 10}) 0%, oklch(0.07 0.03 270) 75%)` }} />
                  <span className="absolute bottom-1 left-1 text-[9px] font-mono text-muted-foreground">EV-{i + 1}.jpg</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="font-display font-semibold mb-3 inline-flex items-center gap-2"><MessageSquare className="size-4" /> Internal Notes</div>
            <div className="space-y-3 mb-3">
              {[
                { who: "K. Patel", t: "12:08", msg: "Onsite — gate camera now showing subject clearly." },
                { who: "M. Chen", t: "12:11", msg: "Alerted local PD as a precaution. Standing by." },
              ].map((n, i) => (
                <div key={i} className="rounded-lg border border-border/60 bg-white/[0.02] p-3">
                  <div className="flex justify-between text-xs"><span className="font-medium">{n.who}</span><span className="font-mono text-muted-foreground">{n.t}</span></div>
                  <div className="text-sm mt-1">{n.msg}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-border/60 bg-input/60 px-3 py-2 text-sm" placeholder="Add a note…" />
              <button className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">Post</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Escalation Chain</div>
            <ol className="space-y-2 text-sm">
              {[
                { lvl: "L1", role: "CCTV Operator", who: "J. Lee", state: "✓" },
                { lvl: "L2", role: "Security Manager", who: "K. Patel", state: "✓" },
                { lvl: "L3", role: "Admin + PD", who: "M. Chen", state: "•" },
              ].map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded border border-border/60 p-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{s.lvl}</span>
                  <div className="flex-1">
                    <div className="text-xs">{s.role}</div>
                    <div className="text-[10px] text-muted-foreground">{s.who}</div>
                  </div>
                  <span className="text-xs">{s.state}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Status History</div>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li>12:04 · New</li>
              <li>12:05 · Investigating</li>
              <li>12:14 · Resolved</li>
            </ul>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">GPS</div>
            <div className="aspect-square rounded-md grid-bg border border-border/60 relative">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 map-dot alert pulse-dot" />
            </div>
            <div className="mt-2 text-xs font-mono text-muted-foreground">37.7749° N, 122.4194° W</div>
          </div>
        </div>
      </div>
    </div>
  );
}
