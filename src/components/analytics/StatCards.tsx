import { ShieldAlert, Clock, MapPin, Activity } from "lucide-react";

export function StatCards({
  totalIncidents,
  avgResponseTime,
  busiestZone,
  topAlertType,
}: {
  totalIncidents: number;
  avgResponseTime: number;
  busiestZone: string;
  topAlertType: string;
}) {
  const stats = [
    { label: "Total Open Alerts", value: totalIncidents.toString(), trend: "Live", up: false, icon: ShieldAlert, color: "text-primary", bg: "bg-primary/20" },
    { label: "Avg Response Time", value: `${avgResponseTime}s`, trend: "SLA", up: true, icon: Clock, color: "text-[oklch(0.7_0.18_155)]", bg: "bg-[oklch(0.7_0.18_155/0.2)]" },
    { label: "Busiest Zone", value: busiestZone, trend: "By crowd count", up: true, icon: MapPin, color: "text-[oklch(0.78_0.17_75)]", bg: "bg-[oklch(0.78_0.17_75/0.2)]" },
    { label: "Top Alert Type", value: topAlertType, trend: "Current", up: false, icon: Activity, color: "text-destructive", bg: "bg-destructive/20" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <div key={i} className="glass rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start">
            <div className={`size-8 rounded-lg ${s.bg} ${s.color} grid place-items-center`}>
              <s.icon className="size-4" />
            </div>
            <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${s.up ? "text-[oklch(0.7_0.18_155)] bg-[oklch(0.7_0.18_155/0.1)]" : "text-muted-foreground bg-white/5"}`}>
              {s.trend}
            </div>
          </div>
          <div>
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
