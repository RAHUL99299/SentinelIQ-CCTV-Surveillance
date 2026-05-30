import * as React from "react";
import { useEffect, memo } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateCamera, useUpdateCamera } from "@/lib/queries";
import type { Camera } from "@/lib/api";

interface CameraFormModalProps {
  open: boolean;
  onClose: () => void;
  editCam?: Camera | null;
}

export const CameraFormModal = memo(function CameraFormModal({ open, onClose, editCam }: CameraFormModalProps) {
  const createCamera = useCreateCamera();
  const updateCamera = useUpdateCamera();

  // Escape key to close modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const streamUrl = fd.get("stream_url") as string;
    const location = fd.get("location") as string;
    const zone = fd.get("zone") as string;
    const assignedPerson = fd.get("assigned_person") as string;

    if (!name.trim()) { toast.error("Camera name is required"); return; }
    if (!streamUrl.trim()) { toast.error("Stream/Video URL is required"); return; }

    // Smart Auto-detection & Link Formatting logic
    let stream_type: Camera["stream_type"] = "custom";
    let embed_url = streamUrl;
    let url = streamUrl;

    if (streamUrl.includes("youtube.com") || streamUrl.includes("youtu.be")) {
      stream_type = "youtube";
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = streamUrl.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (videoId) {
        embed_url = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
        url = `https://www.youtube.com/watch?v=${videoId}`;
      } else {
        toast.error("Invalid YouTube video URL");
        return;
      }
    } else if (streamUrl.includes("earthcam.com")) {
      stream_type = "earthcam";
      embed_url = streamUrl;
      url = streamUrl;
    } else if (streamUrl.startsWith("rtsp://")) {
      stream_type = "rtsp";
      url = streamUrl;
      embed_url = "";
    } else if (streamUrl.includes(".mp4") || streamUrl.includes(".m3u8")) {
      stream_type = "custom";
      url = streamUrl;
      embed_url = streamUrl;
    }

    const data = {
      name,
      url,
      embed_url,
      stream_type,
      location,
      zone,
      status: (editCam ? editCam.status : "active") as Camera["status"],
      ptz: editCam ? editCam.ptz : false,
      assigned_person: assignedPerson,
    };

    if (editCam) {
      updateCamera.mutate(
        { id: editCam.id, data },
        {
          onSuccess: () => { toast.success(`Camera "${data.name}" updated successfully`); onClose(); },
          onError: (err: any) => toast.error(err.message || "Failed to update camera"),
        }
      );
    } else {
      createCamera.mutate(data, {
        onSuccess: () => {
          toast.success(`Camera "${data.name}" registered and live monitoring active!`);
          onClose();
        },
        onError: (err: any) => toast.error(err.message || "Failed to add camera"),
      });
    }
  };

  // Pre-fill URL field for edit mode
  const getPreFilledUrl = () => {
    if (!editCam) return "";
    return editCam.url || editCam.embed_url || "";
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-xl border border-border/60 bg-card shadow-2xl text-foreground overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-lg border border-border/60 p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition"
        >
          <X className="size-4" />
        </button>

        <form onSubmit={handleSave} className="w-full p-6 space-y-4">
          <h2 className="font-display font-semibold text-xl border-b border-border/40 pb-3">
            {editCam ? `Edit Camera Feed #${editCam.id}` : "Register New Smart Camera"}
          </h2>
          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Camera Name *</label>
              <input name="name" defaultValue={editCam ? editCam.name : ""} className="mt-1 w-full rounded-lg border border-border/60 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary transition" placeholder="e.g. Times Square Crowd Cam" autoComplete="off" required />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Video Feed / Stream URL *</label>
              <input name="stream_url" defaultValue={getPreFilledUrl()} className="mt-1 w-full rounded-lg border border-border/60 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary transition font-mono" placeholder="YouTube link, EarthCam link, RTSP address, or MP4 URL" autoComplete="off" required />
              <span className="text-[10px] text-muted-foreground mt-1 block">Supports automatic link parsing and stream detection.</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Location</label>
                <input name="location" defaultValue={editCam ? editCam.location : ""} className="mt-1 w-full rounded-lg border border-border/60 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary transition" placeholder="e.g. Manhattan, NY" autoComplete="off" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Operational Zone</label>
                <select
                  name="zone"
                  defaultValue={editCam ? editCam.zone : "Public Safety"}
                  className="mt-1 w-full rounded-lg border border-border/60 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary transition"
                >
                  <option value="Crowd Management">Crowd Management</option>
                  <option value="Crime Prevention">Crime Prevention</option>
                  <option value="Work Monitoring">Work Monitoring</option>
                  <option value="Public Safety">Public Safety</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">Assigned Operator / Person</label>
              <input name="assigned_person" defaultValue={editCam ? editCam.assigned_person : ""} className="mt-1 w-full rounded-lg border border-border/60 bg-input/40 px-3 py-2 text-sm outline-none focus:border-primary transition" placeholder="e.g. Officer Alex Rivers" autoComplete="off" />
            </div>
          </div>
          
          <div className="flex justify-end gap-2.5 pt-4 border-t border-border/40 mt-5">
            <button type="button" onClick={onClose} className="rounded-lg border border-border/60 px-4 py-2 text-xs hover:bg-accent transition">Cancel</button>
            <button
              type="submit"
              disabled={createCamera.isPending || updateCamera.isPending}
              className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5 transition shadow-glow"
            >
              {(createCamera.isPending || updateCamera.isPending) && <Loader2 className="size-3.5 animate-spin" />}
              {editCam ? "Save Changes" : "Register Feed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}, (prev, next) => prev.open === next.open && prev.editCam?.id === next.editCam?.id);
