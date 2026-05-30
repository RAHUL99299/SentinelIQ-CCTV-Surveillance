import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Video, Users, ShieldAlert, HardHat, Bell,
  BarChart3, Camera, UserCog, Shield, ScrollText, ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPermissions } from "@/lib/queries";

const items = [
  { to: "/dashboard",        label: "Dashboard",           icon: LayoutDashboard, module: "Dashboard" },
  { to: "/live-feeds",       label: "Live Feeds",          icon: Video,           module: "Live Feeds" },
  { to: "/crowd-management", label: "Crowd Management",    icon: Users,           module: "Cameras"    },
  { to: "/incidents",        label: "Crime Prevention",    icon: ShieldAlert,     module: "Incidents"  },
  { to: "/work-monitoring",  label: "Work Monitoring",     icon: HardHat,         module: "Analytics"  },
  { to: "/alerts",           label: "Incidents & Alerts",  icon: Bell,            module: "Incidents"  },
  { to: "/analytics",        label: "Analytics & Reports", icon: BarChart3,       module: "Analytics"  },
  { to: "/cameras",          label: "Camera Registry",     icon: Camera,          module: "Cameras"    },
  { to: "/users",            label: "User Management",     icon: UserCog,         module: "Users"      },
  { to: "/admin/roles",      label: "Roles & Permissions", icon: Shield,          module: "Settings"   },
  { to: "/audit-logs",       label: "Audit Logs",          icon: ScrollText,      module: "Settings"   },
] as const;

interface AppSidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export function AppSidebar({ collapsed, setCollapsed }: AppSidebarProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { canViewModule, userRole, isLoading } = useUserPermissions();

  // Filter items based on DB permissions (Super Admin sees everything, others filtered by DB)
  const filteredItems = items.filter(it => {
    if (!userRole) return false;
    if (userRole === "Super Admin") return true;
    if (isLoading) return it.module === "Dashboard"; // Show only dashboard during load
    return canViewModule(it.module);
  });


  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border/60 bg-sidebar transition-[width] duration-300",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
        <div className="relative">
          <Shield className="size-6 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary pulse-dot" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold tracking-tight text-base">
            Sentinel<span className="text-primary">IQ</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {filteredItems.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_oklch(0.62_0.22_260/0.4)] font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title={collapsed ? it.label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary shadow-glow" />
              )}
              <it.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="m-2 flex items-center justify-center gap-2 rounded-lg border border-border/60 px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition"
      >
        <ChevronLeft className={cn("size-4 transition", collapsed && "rotate-180")} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
