import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/sentinel/AppSidebar";
import { AppTopbar } from "@/components/sentinel/AppTopbar";
import { useState, useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function CriticalAlertModal() {
  const [open, setOpen] = useState(false);
  const [alertData, setAlertData] = useState<any>(null);

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAlertData(customEvent.detail);
      setOpen(true);
      // Play sound
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
      audio.play().catch(() => { });
    };
    window.addEventListener("trigger-critical-alert", handleTrigger);
    return () => window.removeEventListener("trigger-critical-alert", handleTrigger);
  }, []);

  if (!open || !alertData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="absolute inset-0 bg-destructive/10 animate-pulse" />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border-2 border-destructive bg-background shadow-[0_0_100px_-20px_rgba(220,38,38,0.5)]">
        <div className="bg-destructive px-6 py-4 flex items-center gap-4">
          <AlertTriangle className="size-8 text-destructive-foreground animate-bounce" />
          <div>
            <h2 className="text-2xl font-bold text-destructive-foreground uppercase tracking-widest">Critical Alert</h2>
            <p className="text-destructive-foreground/80 text-sm">Immediate Action Required</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground uppercase tracking-wider">{alertData.id} · {alertData.cam}</div>
            <div className="text-3xl font-display font-bold">{alertData.title}</div>
          </div>
          <div className="aspect-video rounded-lg bg-[oklch(0.07_0.03_270)] surveil-bg relative overflow-hidden border border-border/60">
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle, oklch(0.32 0.08 250) 0%, oklch(0.07 0.03 270) 75%)` }} />
            <div className="absolute inset-0 scanline" />
            <span className="absolute top-2 left-2 text-[10px] font-bold text-destructive">● LIVE SNAPSHOT</span>
          </div>
          <p className="text-muted-foreground">This alert cannot be dismissed without acknowledgment.</p>
          <button
            onClick={() => setOpen(false)}
            className="w-full rounded-xl bg-destructive py-4 text-lg font-bold text-destructive-foreground hover:bg-destructive/90 transition shadow-lg active:scale-[0.98]"
          >
            Acknowledge & View Details
          </button>
        </div>
      </div>
    </div>
  );
}

import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCameras, useUserPermissions } from "@/lib/queries";
import { toast } from "sonner";
import { OnboardingWizard } from "@/components/sentinel/OnboardingWizard";

// Map route path prefixes to permission module names
const PATH_MODULE_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/live-feeds": "Live Feeds",
  "/crowd-management": "Cameras",
  "/incidents": "Incidents",
  "/work-monitoring": "Analytics",
  "/alerts": "Incidents",
  "/analytics": "Analytics",
  "/cameras": "Cameras",
  "/users": "Users",
  "/admin/roles": "Settings",
  "/audit-logs": "Settings",
  "/settings": "Settings",
};

function AppLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const notifiedCams = useRef<Record<number, boolean>>({});
  console.log("[DEBUG] Rendering AppLayout, path:", path, "role:", role);

  const { data: cameras = [] } = useCameras();
  const { hasPermission, isLoading: permLoading } = useUserPermissions();

  // 1. Guard authentication session
  useEffect(() => {
    const storedRole = localStorage.getItem("sentineliq-role");
    if (!storedRole) {
      if (path !== "/login") {
        navigate({ to: "/login" });
      }
    } else {
      setRole(storedRole);
    }
  }, [navigate, path]);

  // 2. Guard path authorizations dynamically based on DB role permissions
  useEffect(() => {
    if (!role || role === "Super Admin" || permLoading) return;

    // Find the module for this path
    const matchedModule = Object.entries(PATH_MODULE_MAP).find(([p]) =>
      path === p || path.startsWith(p + "/")
    );

    if (matchedModule) {
      const [, module] = matchedModule;
      const isAllowed = hasPermission(module, "View");
      if (!isAllowed) {
        toast.warning(`Access Denied: Your role cannot access ${path}`);
        navigate({ to: "/dashboard" });
      }
    }
  }, [role, path, navigate, hasPermission, permLoading]);

  // 3. Real-time crowd alerts for Super Admin and Security Manager
  // NOTE: notifiedCams is a ref (not state) to avoid re-triggering this effect
  // on every notification — the previous useState caused an infinite loop.
  useEffect(() => {
    if (!role || (role !== "Super Admin" && role !== "Security Manager")) return;

    cameras.forEach(cam => {
      if (cam.status === "active" && cam.crowd_count >= 50) {
        if (!notifiedCams.current[cam.id]) {
          toast.error(`Crowd Surge Alert at ${cam.name}!`, {
            description: `Crowd count is ${cam.crowd_count} people. Assigned: ${cam.assigned_person || "Unassigned"}.`,
            duration: 6000,
          });
          notifiedCams.current[cam.id] = true;
        }
      } else if (cam.crowd_count < 50 && notifiedCams.current[cam.id]) {
        delete notifiedCams.current[cam.id];
      }
    });
  }, [cameras, role]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`transition-[padding] duration-300 ${collapsed ? "pl-16" : "pl-16 md:pl-60"}`}>
        <AppTopbar />
        <main className="px-5 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
      <CriticalAlertModal />
      <OnboardingWizard />
    </div>
  );
}
