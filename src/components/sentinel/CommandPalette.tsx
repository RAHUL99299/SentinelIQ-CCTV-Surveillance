import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight } from "lucide-react";
import { useState } from "react";

const items = [
  { label: "Dashboard", to: "/dashboard", group: "Navigate" },
  { label: "Live Feeds", to: "/live-feeds", group: "Navigate" },
  { label: "Crowd Management", to: "/crowd-management", group: "Navigate" },
  { label: "Incidents", to: "/incidents", group: "Navigate" },
  { label: "Camera 12 — North Gate", to: "/live-feeds/cam-12", group: "Cameras" },
  { label: "Camera 04 — Lobby Atrium", to: "/live-feeds/cam-04", group: "Cameras" },
  { label: "INC-2046 Perimeter Breach", to: "/incidents/inc-2046", group: "Incidents" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl gap-0 p-0 border-border/60 bg-popover/95 backdrop-blur-xl [&>button]:hidden">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results.</div>
          )}
          {filtered.map((it) => (
            <Link
              key={it.to + it.label}
              to={it.to}
              onClick={onClose}
              className="group flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-white/5"
            >
              <div className="flex flex-col">
                <span>{it.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.group}</span>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
