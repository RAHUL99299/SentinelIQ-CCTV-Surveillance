import { createFileRoute } from "@tanstack/react-router";
import { Plus, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRoles, useUpdateRole, useCreateRole } from "@/lib/queries";
import { type Role } from "@/lib/api";

export const Route = createFileRoute("/_app/admin/roles")({
  head: () => ({ meta: [{ title: "Role Manager — SentinelIQ" }] }),
  component: RolesManager,
});

const modules = ["Dashboard", "Cameras", "Incidents", "Live Feeds", "Analytics", "Users", "Settings"];
const actions = ["View", "Create", "Edit", "Delete", "Export"];

// Build initial permission state
type Perms = Record<string, Record<string, boolean>>;
const buildInitialPerms = (): Perms => {
  const p: Perms = {};
  modules.forEach((m) => {
    p[m] = {};
    actions.forEach((a) => {
      p[m][a] = m !== "Settings" && (a === "View" || a === "Create" || (a === "Edit" && m === "Incidents"));
    });
  });
  return p;
};

function RolesManager() {
  const { data: roles = [], isLoading } = useRoles();
  const updateRole = useUpdateRole();
  const createRole = useCreateRole();

  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0); 
  // We use local state for perms to allow toggling before saving
  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>> | null>(null);
  
  // Keep localPerms in sync with selected role if not dirty
  const selectedRole = roles[selectedRoleIndex];

  // Initialize local perms when selected role changes
  if (selectedRole && localPerms === null) {
    setLocalPerms(selectedRole.permissions);
  }

  const togglePerm = (module: string, action: string) => {
    if (!localPerms || !selectedRole) return;
    const newVal = !localPerms[module][action];
    
    // Optimistically update local state for fast UI response
    setLocalPerms((prev) => prev ? { ...prev, [module]: { ...prev[module], [action]: newVal } } : prev);
  };

  const handleRoleSelect = (i: number) => {
    setSelectedRoleIndex(i);
    setLocalPerms(roles[i].permissions);
  };

  const handleCreateRole = () => {
    const name = window.prompt("Enter new custom role name:");
    if (!name) return;
    createRole.mutate({
      name,
      color: "bg-white/10 text-white",
      desc: "Custom role",
      permissions: buildInitialPerms()
    }, {
      onSuccess: () => toast.success(`Created custom role: ${name}`),
      onError: () => toast.error("Failed to create role")
    });
  };

  const handleSavePerms = () => {
    if (!selectedRole || !localPerms) return;
    updateRole.mutate({ id: selectedRole.id, data: { permissions: localPerms } }, {
      onSuccess: () => toast.success(`Permissions for "${selectedRole.name}" saved successfully`),
      onError: () => toast.error("Failed to save permissions")
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading roles...</div>;
  if (!roles.length) return <div className="p-8 text-muted-foreground">No roles found in database.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground">Manage access control and granular permissions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSavePerms} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium hover:bg-white/5">
            Save Changes
          </button>
          <button onClick={handleCreateRole} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-glow">
            <Plus className="size-3.5" /> Create Custom Role
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((r, i) => (
          <button
            key={r.name}
            onClick={() => handleRoleSelect(i)}
            className={`glass rounded-xl p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/50 ${selectedRoleIndex === i ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/30"}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.color}`}>{r.name}</div>
              <Shield className={`size-4 ${selectedRoleIndex === i ? "text-primary" : "text-muted-foreground opacity-50"}`} />
            </div>
            <div className="text-xs text-muted-foreground mb-4">{r.desc}</div>
            <div className="text-xs font-medium">{r.users_count || 0} Assigned Users</div>
            {selectedRoleIndex === i && <div className="mt-2 text-[10px] text-primary">● Currently editing</div>}
          </button>
        ))}
      </div>

      <div className="glass rounded-xl p-5 overflow-x-auto">
        <div className="font-display font-semibold mb-1">Granular Permission Matrix: {selectedRole.name}</div>
        <div className="text-xs text-muted-foreground mb-4">Click any checkbox to toggle. Changes are saved per-role.</div>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="py-2 px-2 text-left">Module</th>
              {actions.map(h => <th key={h} className="py-2 px-2 text-center">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m} className="border-b border-border/40 hover:bg-white/[0.02]">
                <td className="py-3 px-2 font-medium">{m}</td>
                {actions.map((a) => {
                  const isActive = localPerms ? localPerms[m]?.[a] : false;
                  return (
                    <td key={a} className="py-3 px-2 text-center">
                      <button
                        onClick={() => togglePerm(m, a)}
                        className={`inline-flex items-center justify-center size-5 rounded border cursor-pointer transition active:scale-90 ${
                          isActive
                            ? "bg-[oklch(0.7_0.18_155/0.2)] border-[oklch(0.7_0.18_155/0.5)] text-[oklch(0.7_0.18_155)]"
                            : "bg-white/5 border-border/40 text-transparent hover:border-muted-foreground"
                        }`}
                      >
                        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
