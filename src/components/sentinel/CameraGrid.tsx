import { Users, Shield } from "lucide-react";

const MOCK_CAMERAS = [
  {
    id: 1,
    name: "Idyllwild — Live",
    location: "California, USA",
    zone: "Crowd Management",
    icon: Users,
    color: "border-primary/40 text-primary bg-primary/5",
    countText: "PEOPLE: 42 | VEH: 8",
    boxes: [
      { x: "20%", y: "30%", w: "15%", h: "45%", label: "Person 94%" },
      { x: "65%", y: "40%", w: "18%", h: "40%", label: "Person 88%" },
    ]
  },
  {
    id: 2,
    name: "Downtown Mystic — Live",
    location: "Connecticut, USA",
    zone: "Crime Prevention",
    icon: Shield,
    color: "border-red-500/40 text-red-500 bg-red-500/5",
    countText: "PEOPLE: 12 | VEH: 15",
    boxes: [
      { x: "40%", y: "50%", w: "22%", h: "35%", label: "Vehicle 97%", isVehicle: true },
      { x: "15%", y: "35%", w: "12%", h: "45%", label: "Person 91%" },
    ]
  },
  {
    id: 3,
    name: "Anglin's Square — Live",
    location: "Florida, USA",
    zone: "Crowd Management",
    icon: Users,
    color: "border-primary/40 text-primary bg-primary/5",
    countText: "PEOPLE: 114 | VEH: 2",
    boxes: [
      { x: "30%", y: "25%", w: "10%", h: "50%", label: "Person 95%" },
      { x: "45%", y: "30%", w: "12%", h: "48%", label: "Person 92%" },
      { x: "70%", y: "20%", w: "11%", h: "52%", label: "Person 89%" },
    ]
  },
  {
    id: 4,
    name: "Hyden Main Street — Live",
    location: "Kentucky, USA",
    zone: "Crime Prevention",
    icon: Shield,
    color: "border-red-500/40 text-red-500 bg-red-500/5",
    countText: "PEOPLE: 5 | VEH: 4",
    boxes: [
      { x: "50%", y: "45%", w: "25%", h: "40%", label: "Vehicle 96%", isVehicle: true },
    ]
  }
];

export function CameraGrid({ compact = false }: { compact?: boolean }) {
  const timeString = "12:48:02";

  return (
    <div className={`grid grid-cols-2 gap-3 ${compact ? "p-3" : "p-4"}`}>
      {MOCK_CAMERAS.map((cam) => {
        const ZoneIcon = cam.icon;
        return (
          <div
            key={cam.id}
            className="relative aspect-video rounded-lg overflow-hidden border border-border/40 bg-[#020617] shadow-inner group select-none scanline"
          >
            {/* Dark grid optical overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />
            
            {/* Subtle camera lens blur effect & dark ambient shadow */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_20%,rgba(3,7,18,0.9)_100%)]" />

            {/* Mock Bounding Boxes (YOLO Simulation) */}
            {cam.boxes.map((box, bidx) => (
              <div
                key={bidx}
                className="absolute border border-dashed rounded-[2px] pointer-events-none"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.w,
                  height: box.h,
                  borderColor: box.isVehicle ? "rgba(239, 68, 68, 0.6)" : "rgba(14, 165, 233, 0.6)",
                  backgroundColor: box.isVehicle ? "rgba(239, 68, 68, 0.05)" : "rgba(14, 165, 233, 0.05)"
                }}
              >
                <span 
                  className="absolute -top-3 left-0 text-[5px] font-mono font-bold px-1 py-[0.5px] rounded-[1px] text-white"
                  style={{
                    backgroundColor: box.isVehicle ? "rgba(239, 68, 68, 0.8)" : "rgba(14, 165, 233, 0.8)"
                  }}
                >
                  {box.label}
                </span>
              </div>
            ))}

            {/* Camera HUD Header */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none z-10 text-[6px] font-mono tracking-tight text-white/80">
              <span className="bg-black/60 px-1 py-0.5 rounded flex items-center gap-0.5">
                <ZoneIcon className="size-1.5 text-primary" />
                {cam.zone.toUpperCase()}
              </span>
              <span className="bg-black/60 px-1 py-0.5 rounded text-destructive flex items-center gap-0.5 font-bold">
                <span className="size-1 rounded-full bg-destructive animate-pulse" />
                LIVE
              </span>
            </div>

            {/* AI Stats HUD Banner */}
            <div className="absolute top-6 left-2 pointer-events-none z-10">
              <span className="text-[6.5px] font-mono font-semibold text-emerald-400 bg-slate-950/90 border border-emerald-500/10 px-1.5 py-0.5 rounded shadow-sm">
                {cam.countText}
              </span>
            </div>

            {/* Camera HUD Footer */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none z-10 font-mono text-[6px] text-white/70">
              <div className="flex flex-col">
                <span className="font-bold text-white bg-black/60 px-1 py-0.5 rounded leading-none">
                  CAM-{String(cam.id).padStart(2, "0")}
                </span>
                <span className="bg-black/60 px-1 py-0.5 rounded mt-0.5 leading-none max-w-[120px] truncate">
                  {cam.name}
                </span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="bg-black/60 px-1 py-0.5 rounded leading-none text-white/90">
                  {timeString}
                </span>
                <span className="bg-black/60 px-1 py-0.5 rounded mt-0.5 leading-none text-white/40">
                  1080p · 30FPS
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
