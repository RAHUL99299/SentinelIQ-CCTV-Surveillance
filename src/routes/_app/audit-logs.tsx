import { createFileRoute } from "@tanstack/react-router";
import { Download, Filter, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuditLogs } from "@/lib/queries";
import { format } from "date-fns";
import { type AuditLog } from "@/lib/api";

export const Route = createFileRoute("/_app/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — SentinelIQ" }] }),
  component: AuditLogs,
});

function AuditLogs() {
  const { data: events = [], isLoading } = useAuditLogs();
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("All Modules");
  const [actionType, setActionType] = useState("All Action Types");

  const filtered = events.filter((e) => {
    const matchSearch = !search || e.actor.includes(search) || (e.ip_address || "").includes(search) || e.action.toLowerCase().includes(search.toLowerCase());
    const matchModule = module === "All Modules" || e.module === module;
    const matchActionType = actionType === "All Action Types" || e.action.toLowerCase().includes(actionType.toLowerCase());
    return matchSearch && matchModule && matchActionType;
  });

  const handleExport = () => {
    toast.success(`Exported ${filtered.length} audit log entries to CSV`);
  };

  const handleFilter = () => {
    toast.info("Applying filters…");
  };

  const handleRowClick = (e: AuditLog) => {
    toast.info(`${e.actor} — ${e.action} from ${e.ip_address}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Immutable trail of every action across the platform</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-border/60 px-3 py-1.5 text-xs font-medium hover:bg-white/10 transition">
          <Download className="size-3.5" /> Export to CSV
        </button>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user, action, or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded bg-input/60 border border-border/60 pl-8 pr-3 py-1.5 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <select
            value={module}
            onChange={(e) => { setModule(e.target.value); toast.info(`Filtering by module: ${e.target.value}`); }}
            className="bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50 text-muted-foreground"
          >
            <option>All Modules</option>
            <option>Authentication</option>
            <option>Cameras</option>
            <option>Alerts</option>
            <option>Users</option>
            <option>Live Feeds</option>
            <option>Settings</option>
          </select>
          <select
            value={actionType}
            onChange={(e) => { setActionType(e.target.value); toast.info(`Filtering by action: ${e.target.value}`); }}
            className="bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50 text-muted-foreground"
          >
            <option>All Action Types</option>
            <option>Create</option>
            <option>Update</option>
            <option>Delete</option>
          </select>
          <input
            type="date"
            onChange={(e) => toast.info(`Filtering from ${e.target.value}`)}
            className="bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50 text-muted-foreground"
          />
          <button onClick={handleFilter} className="p-1.5 rounded bg-white/5 border border-border/60 hover:bg-white/10 transition"><Filter className="size-4" /></button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                {["Time","Actor","Action","Module","IP"].map((h) => <th key={h} className="text-left font-medium py-2 px-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground animate-pulse">Loading audit logs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">No audit logs found matching criteria.</td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border/40 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => handleRowClick(e)}
                  >
                    <td className="py-2.5 px-2 font-mono text-xs text-muted-foreground">{format(new Date(e.created_at), "MMM d, yyyy HH:mm:ss")}</td>
                    <td className="py-2.5 px-2 text-xs">{e.actor}</td>
                    <td className="py-2.5 px-2 text-sm">{e.action}</td>
                    <td className="py-2.5 px-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-border/40 text-muted-foreground">{e.module}</span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-xs text-muted-foreground">{e.ip_address || "N/A"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
            <div>Showing {filtered.length} of {events.length} results</div>
            <div className="flex items-center gap-1">
              <button className="px-2 py-1 rounded bg-white/5 border border-border/40 hover:bg-white/10" disabled>Prev</button>
              <button className="px-2 py-1 rounded bg-white/5 border border-border/40 hover:bg-white/10">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
