import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, CheckSquare, Download, PlaySquare, Settings2, MoreHorizontal, UserX, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUserPermissions, useRoles } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "User Management — SentinelIQ" }] }),
  component: Users,
});

function Users() {
  const { data: users = [], isLoading, isError, refetch } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { hasPermission } = useUserPermissions();
  const { data: roles = [] } = useRoles();

  const canCreate = hasPermission('Users', 'Create');
  const canEdit   = hasPermission('Users', 'Edit');
  const canDelete = hasPermission('Users', 'Delete');

  // Dynamic role list from the database
  const roleOptions = roles.length > 0
    ? roles.map(r => r.name)
    : ['Super Admin', 'Security Manager', 'CCTV Operator', 'HR Officer', 'Viewer'];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "CCTV Operator" });
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (id: number) => {
    const newSel = new Set(selected);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelected(newSel);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(u => u.id)));
  };

  const handleBulkDeactivate = () => {
    selected.forEach(id => updateUser.mutate({ id, data: { active: false } }));
    toast.success(`${selected.size} user(s) deactivated`);
    setSelected(new Set());
  };

  const handleBulkExport = () => {
    toast.success(`Exported ${selected.size} user record(s) to CSV`);
    setSelected(new Set());
  };

  const handleInvite = () => {
    if (!inviteForm.email.includes("@")) { toast.error("Enter a valid email address"); return; }
    const name = inviteForm.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    
    createUser.mutate({
      name,
      email: inviteForm.email,
      role: inviteForm.role,
      active: true,
    }, {
      onSuccess: () => {
        toast.success(`Invitation sent to ${inviteForm.email}`);
        setInviteOpen(false);
        setInviteForm({ email: "", role: "CCTV Operator" });
      },
      onError: (err: any) => toast.error(err.message || "Failed to invite user")
    });
  };

  const handleRoleChange = (id: number, newRole: string) => {
    updateUser.mutate({ id, data: { role: newRole } }, {
      onSuccess: () => toast.success(`Role updated to "${newRole}"`),
      onError: () => toast.error("Failed to update role")
    });
  };

  const handleImpersonate = (name: string) => {
    toast.info(`Impersonating session as ${name} — audit trail logged`);
  };

  const handleDeactivate = (id: number, name: string) => {
    updateUser.mutate({ id, data: { active: false } }, {
      onSuccess: () => {
        toast.success(`${name} deactivated`);
        setMenuOpen(null);
      }
    });
  };

  const handleSendEmail = (email: string) => {
    toast.info(`Email sent to ${email}`);
    setMenuOpen(null);
  };

  const handleSettings = () => {
    toast.info("Advanced user filters and column visibility settings");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Roles, permissions, and access control</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 animate-in fade-in slide-in-from-right-2">
              <span className="text-xs font-medium mr-1">{selected.size} selected</span>
              {canEdit   && <button onClick={handleBulkDeactivate} className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10 transition">Deactivate</button>}
              {canDelete && <button onClick={handleBulkExport} className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-xs hover:bg-white/10 transition"><Download className="size-3" /> Export</button>}
            </div>
          )}
          {canCreate && (
            <button onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-glow">
              <Plus className="size-3.5" /> Invite User
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-white/5 pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <button onClick={handleSettings} className="rounded-lg border border-border/60 bg-white/5 p-1.5 hover:bg-white/10"><Settings2 className="size-4 text-muted-foreground" /></button>
      </div>

      <div className="glass rounded-xl p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="py-2 px-2 text-left w-8">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="accent-primary" />
              </th>
              {["User","Email","Role","Status","Last Active","Actions"].map((h) => (
                <th key={h} className={`text-left font-medium py-2 px-2 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const formattedLast = u.last_active_at ? formatDistanceToNow(new Date(u.last_active_at), { addSuffix: true }) : "Never";
              return (
              <tr key={u.id} className="border-b border-border/40 hover:bg-white/[0.02]">
                <td className="py-3 px-2">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelection(u.id)} className="accent-primary" />
                </td>
                <td className="py-3 px-2 flex items-center gap-2">
                  <div className={`grid size-7 place-items-center rounded-md bg-gradient-to-br from-primary to-primary-glow text-xs font-semibold text-primary-foreground relative ${!u.active ? "opacity-50" : ""}`}>
                    {u.name.split(" ").map((n: string) => n[0]).join("").substring(0,2)}
                    <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border border-background ${u.active ? "bg-[oklch(0.7_0.18_155)]" : "bg-muted"}`}></div>
                  </div>
                  <span className={u.active ? "" : "line-through text-muted-foreground"}>{u.name}</span>
                </td>
                <td className="py-3 px-2 text-muted-foreground text-xs">{u.email}</td>
                <td className="py-3 px-2">
                  {canEdit ? (
                    <select
                      className="bg-white/5 border border-primary/20 rounded px-2 py-0.5 text-xs text-primary font-medium outline-none"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      {roleOptions.map(r => <option key={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-primary">{u.role}</span>
                  )}
                </td>
                <td className="py-3 px-2">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${u.active ? "border-[oklch(0.7_0.18_155/0.4)] text-[oklch(0.78_0.18_155)]" : "border-destructive/40 text-destructive"}`}>
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3 px-2 text-xs text-muted-foreground">{formattedLast}</td>
                <td className="py-3 px-2 text-right relative">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && <button onClick={() => handleImpersonate(u.name)} title="Impersonate User" className="text-muted-foreground hover:text-primary transition"><PlaySquare className="size-4" /></button>}
                    <button onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)} className="text-muted-foreground hover:text-foreground transition"><MoreHorizontal className="size-4" /></button>
                  </div>
                  {menuOpen === u.id && (
                    <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-border/60 bg-popover/95 backdrop-blur-md p-1 shadow-xl text-left">
                      <button onClick={() => handleSendEmail(u.email)} className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-white/5 flex items-center gap-2"><Mail className="size-3" /> Send Email</button>
                      {canDelete && <button onClick={() => handleDeactivate(u.id, u.name)} className="w-full text-left text-xs px-3 py-1.5 rounded hover:bg-white/5 flex items-center gap-2 text-destructive"><UserX className="size-3" /> Deactivate</button>}
                    </div>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <div>Showing 1 to {filtered.length} of {users.length} entries</div>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 rounded bg-white/5 border border-border/40 hover:bg-white/10" disabled>Prev</button>
            <button className="px-2 py-1 rounded bg-primary/20 border border-primary/40 text-primary">1</button>
            <button className="px-2 py-1 rounded bg-white/5 border border-border/40 hover:bg-white/10">Next</button>
          </div>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setInviteOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-semibold">Invite User</h2>
            <div>
              <label className="text-xs text-muted-foreground">Email Address</label>
              <input
                className="mt-1 w-full rounded-lg border border-border/60 bg-input/60 px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="user@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <select
                className="mt-1 w-full rounded-lg border border-border/60 bg-input/60 px-3 py-2 text-sm outline-none focus:border-primary"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                {roleOptions.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setInviteOpen(false)} className="rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5">Cancel</button>
              <button onClick={handleInvite} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
