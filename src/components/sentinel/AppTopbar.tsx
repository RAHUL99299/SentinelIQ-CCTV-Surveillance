import { Bell, Search, Sun, Moon, ChevronDown, Siren, Check, LogOut, Settings, User } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { CommandPalette } from "./CommandPalette";
import { useTheme } from "./ThemeProvider";
import { useAlerts, useUpdateAlert } from "@/lib/queries";
import { Link } from "@tanstack/react-router";

export function AppTopbar() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const { data: openAlerts } = useAlerts({ status: "open" });
  const updateAlert = useUpdateAlert();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("sentineliq-user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAcknowledge = (id: number) => {
    updateAlert.mutate(
      { id, status: "acknowledged" },
      {
        onSuccess: () => {
          toast.success("Alert acknowledged successfully");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to acknowledge alert");
        },
      }
    );
  };

  const handleLogOut = () => {
    localStorage.removeItem("sentineliq-role");
    localStorage.removeItem("sentineliq-user");
    toast.success("Logged out successfully");
    setTimeout(() => {
      window.location.href = "/login";
    }, 800);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-5 backdrop-blur-md">
        <button
          onClick={() => setPaletteOpen(true)}
          className="group flex flex-1 max-w-md items-center gap-2 rounded-lg border border-border/60 bg-input/20 px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search cameras, incidents, people…</span>
          <kbd className="hidden md:inline-flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘ K
          </kbd>
        </button>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs bg-input/10">
          <span className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-[oklch(0.7_0.18_155)] pulse-ring" />
            <span className="relative size-2 rounded-full bg-[oklch(0.7_0.18_155)]" />
          </span>
          <span className="text-muted-foreground">All systems operational</span>
        </div>

        <button 
          onClick={() => {
            toast.error("Perimeter breach detected on cam-03", {
              description: "Immediate action required. Escalation Level 1 active.",
              duration: 5000,
            });
            window.dispatchEvent(new CustomEvent("trigger-critical-alert", {
              detail: { id: "ALT-999", cam: "cam-03", title: "Perimeter breach" }
            }));
          }}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20 transition"
        >
          <Siren className="size-3.5" />
          <span className="hidden sm:inline">Simulate Alert</span>
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative grid size-9 place-items-center rounded-lg border border-border/60 hover:bg-accent transition"
          >
            <Bell className="size-4" />
            {openAlerts && openAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {openAlerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-popover text-popover-foreground shadow-elevated z-50 overflow-hidden glass p-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
                <span className="font-display font-semibold text-sm">Active Alerts</span>
                <Link
                  to="/alerts"
                  onClick={() => setNotifOpen(false)}
                  className="text-[10px] uppercase font-bold text-primary hover:text-primary-glow transition"
                >
                  View All
                </Link>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
                {!openAlerts || openAlerts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No active alerts
                  </div>
                ) : (
                  openAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="p-3 hover:bg-accent/40 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className={`size-1.5 rounded-full ${
                            alert.severity === 'critical' ? 'bg-destructive animate-pulse' :
                            alert.severity === 'high' ? 'bg-[oklch(0.78_0.17_75)]' :
                            'bg-primary'
                          }`} />
                          <span className="font-semibold capitalize truncate">{alert.title}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {alert.camera_name || `Cam #${alert.camera_id}`}
                        </div>
                        <div className="text-[9px] text-muted-foreground/60">
                          {alert.age || "Just now"}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={updateAlert.isPending}
                        className="p-1 rounded border border-border/40 bg-secondary hover:bg-accent hover:text-success text-muted-foreground transition shrink-0"
                        title="Acknowledge Alert"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="grid size-9 place-items-center rounded-lg border border-border/60 hover:bg-accent transition"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        {/* User Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 hover:bg-accent transition"
          >
            <div className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-primary to-primary-glow text-xs font-semibold text-primary-foreground font-mono">
              {user ? getInitials(user.name) : "AR"}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-medium font-display">{user ? user.name : "Alex Rivers"}</div>
              <div className="text-[10px] text-muted-foreground">{user ? user.role : "Security Manager"}</div>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200" style={{ transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-elevated z-50 overflow-hidden glass p-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-border/40">
                <p className="text-xs font-semibold">{user ? user.name : "Alex Rivers"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user ? user.email : "alex.rivers@sentineliq.com"}</p>
              </div>
              {user?.role === "Super Admin" && (
                <div className="py-1 border-b border-border/40">
                  <Link
                    to="/settings/notifications"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition"
                  >
                    <Bell className="size-3.5" />
                    <span>Notification Settings</span>
                  </Link>
                </div>
              )}
              <div className="pt-1">
                <button
                  onClick={handleLogOut}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 rounded transition"
                >
                  <LogOut className="size-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
