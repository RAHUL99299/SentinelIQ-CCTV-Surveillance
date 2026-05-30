import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Search, CheckCircle2, AlertTriangle,
  XCircle, Trash2, Pencil, Loader2, RefreshCw, Users, Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCameras, useDeleteCamera, useUserPermissions } from "@/lib/queries";
import type { Camera } from "@/lib/api";
import { CameraFormModal } from "@/components/sentinel/CameraFormModal";

export const Route = createFileRoute("/_app/cameras")({
  head: () => ({ meta: [{ title: "Camera Management — SentinelIQ" }] }),
  component: Cameras,
});

function Cameras() {
  const { data: cams = [], isLoading, isError, refetch, isFetching } = useCameras();
  const deleteCamera = useDeleteCamera();
  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('Cameras', 'Create');
  const canEdit   = hasPermission('Cameras', 'Edit');
  const canDelete = hasPermission('Cameras', 'Delete');

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editCam, setEditCam] = useState<Camera | null>(null);

  const filtered = cams.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.location ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (c.zone ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditCam(null);
    setOpen(true);
  };

  const handleOpenEdit = (cam: Camera) => {
    setEditCam(cam);
    setOpen(true);
  };

  const handleDelete = (cam: Camera) => {
    if (!confirm(`Delete "${cam.name}"? This cannot be undone.`)) return;
    deleteCamera.mutate(cam.id, {
      onSuccess: () => toast.success(`Camera "${cam.name}" deleted`),
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isError) {
    return (
      <div className="glass rounded-xl p-10 text-center space-y-3">
        <div className="text-destructive font-semibold">Cannot reach API</div>
        <div className="text-sm text-muted-foreground">Start the backend: <code className="bg-white/10 px-2 py-0.5 rounded font-mono">cd api && php artisan serve</code></div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Camera Management</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${cams.length} cameras configured · data from API`}
            {isFetching && !isLoading && <span className="ml-2 text-primary text-[10px]">● syncing</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refetch(); toast.info("Refreshed camera list"); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          {canCreate && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-glow"
            >
              <Plus className="size-3.5" /> Add Camera
            </button>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-border/60 bg-white/[0.02] px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, location, zone…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border/60">
                  {["ID","Name","Location","Zone","Type","PTZ","Crowd","Assigned Operator","Status",""].map(h => (
                    <th key={h} className="text-left font-medium py-2 px-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/40 hover:bg-accent/10 group">
                    <td className="py-3 px-2 font-mono text-xs text-muted-foreground">#{c.id}</td>
                    <td className="py-3 px-2 font-medium">{c.name}</td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{c.location ?? "—"}</td>
                    <td className="py-3 px-2 text-xs"><span className="px-1.5 py-0.5 rounded bg-white/5 border border-border/40">{c.zone ?? "—"}</span></td>
                    <td className="py-3 px-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Video className="size-3" /> {c.stream_type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{c.ptz ? "PTZ" : "Fixed"}</td>
                    <td className="py-3 px-2">
                      <span className="flex items-center gap-1 text-xs font-mono font-semibold text-primary">
                        <Users className="size-3" /> {c.crowd_count?.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-muted-foreground">{c.assigned_person ?? "—"}</td>
                    <td className="py-3 px-2">
                      {c.status === "active"   && <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-[oklch(0.78_0.18_155)]"><CheckCircle2 className="size-3" /> Active</span>}
                      {c.status === "inactive" && <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-[oklch(0.78_0.17_75)]"><AlertTriangle className="size-3" /> Inactive</span>}
                      {c.status === "offline"  && <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-destructive"><XCircle className="size-3" /> Offline</span>}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                        {canEdit   && <button onClick={() => handleOpenEdit(c)} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Pencil className="size-3" /> Edit</button>}
                        {canDelete && <button onClick={() => handleDelete(c)} className="text-xs text-destructive hover:underline inline-flex items-center gap-1"><Trash2 className="size-3" /> Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No cameras match your search</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reusable Camera Modal */}
      <CameraFormModal 
        open={open} 
        onClose={() => setOpen(false)} 
        editCam={editCam} 
      />
    </div>
  );
}
