import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripHorizontal, BarChart, LineChart, PieChart, Table, Hash, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPie, Pie, Cell, BarChart as RechartsBar, Bar } from "recharts";
import { useDashboard, useAlerts, useCameras } from "@/lib/queries";

const AVAILABLE_WIDGETS = [
  { id: "w-line", name: "Live Crowd Trend", icon: LineChart },
  { id: "w-bar", name: "Zone Headcount", icon: BarChart },
  { id: "w-pie", name: "Alert Severities", icon: PieChart },
  { id: "w-table", name: "Recent Alerts", icon: Table },
  { id: "w-stat", name: "Quick Stats", icon: Hash },
];

export function ReportBuilder() {
  const [canvasWidgets, setCanvasWidgets] = useState<{ id: string; type: string; name: string }[]>([]);

  // Fetch real data for the widgets
  const { data: dashboard } = useDashboard();
  const { data: alerts = [] } = useAlerts();
  const { data: cameras = [] } = useCameras();

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === "available" && destination.droppableId === "canvas") {
      const widget = AVAILABLE_WIDGETS[source.index];
      setCanvasWidgets([...canvasWidgets, { ...widget, type: widget.id, id: `canvas-${widget.id}-${Date.now()}` }]);
    } else if (source.droppableId === "canvas" && destination.droppableId === "canvas") {
      const items = Array.from(canvasWidgets);
      const [reordered] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reordered);
      setCanvasWidgets(items);
    }
  };

  const removeWidget = (id: string) => {
    setCanvasWidgets(canvasWidgets.filter(w => w.id !== id));
  };

  // --- Real Data Formatting ---
  const trendData = (dashboard?.crowd_trend ?? []).map(t => ({ d: t.minute, c: Math.round(Number(t.avg_crowd) || 0) }));

  const zoneMap: Record<string, number> = {};
  cameras.forEach(c => {
    const z = c.zone ?? c.location ?? "Unknown";
    zoneMap[z] = (zoneMap[z] ?? 0) + (c.crowd_count ?? 0);
  });
  const zoneData = Object.entries(zoneMap).map(([name, val]) => ({ name, val })).sort((a, b) => b.val - a.val).slice(0, 5);

  const sevMap = { critical: 0, high: 0, medium: 0, low: 0 };
  alerts.forEach(a => { if (a.severity in sevMap) sevMap[a.severity as keyof typeof sevMap]++; });
  const pieData = [
    { name: "Critical", value: sevMap.critical, color: "oklch(0.62 0.24 25)" },
    { name: "High", value: sevMap.high, color: "oklch(0.78 0.17 75)" },
    { name: "Medium", value: sevMap.medium, color: "oklch(0.72 0.2 250)" },
    { name: "Low", value: sevMap.low, color: "oklch(0.7 0.18 155)" },
  ].filter(d => d.value > 0);

  const renderWidgetContent = (type: string) => {
    switch (type) {
      case "w-line":
        return (
          <div className="h-48 w-full mt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={trendData}>
                  <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" vertical={false} />
                  <XAxis dataKey="d" stroke="oklch(0.65 0.03 260)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="c" stroke="oklch(0.62 0.22 260)" strokeWidth={2} dot={false} />
                </RechartsLine>
              </ResponsiveContainer>
            ) : <div className="text-xs text-muted-foreground grid place-items-center h-full">No trend data</div>}
          </div>
        );
      case "w-bar":
        return (
          <div className="h-48 w-full mt-2">
            {zoneData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBar data={zoneData}>
                  <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.65 0.03 260)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="val" fill="oklch(0.78 0.17 75)" radius={[4, 4, 0, 0]} />
                </RechartsBar>
              </ResponsiveContainer>
            ) : <div className="text-xs text-muted-foreground grid place-items-center h-full">No zone data</div>}
          </div>
        );
      case "w-pie":
        return (
          <div className="h-48 w-full mt-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: 8, fontSize: 12 }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : <div className="text-xs text-muted-foreground grid place-items-center h-full">No alerts data</div>}
          </div>
        );
      case "w-table":
        return (
          <div className="mt-2 border border-border/40 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/5 border-b border-border/40 text-muted-foreground uppercase">
                <tr><th className="px-3 py-2 font-medium">ID</th><th className="px-3 py-2 font-medium">Alert</th><th className="px-3 py-2 font-medium">Severity</th></tr>
              </thead>
              <tbody>
                {alerts.slice(0, 4).map(a => (
                  <tr key={a.id} className="border-b border-border/20 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-muted-foreground">#{a.id}</td>
                    <td className="px-3 py-2 truncate max-w-[150px]">{a.title}</td>
                    <td className={`px-3 py-2 capitalize font-bold ${a.severity === 'critical' ? 'text-destructive' : a.severity === 'high' ? 'text-[oklch(0.85_0.17_75)]' : 'text-primary'}`}>{a.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "w-stat":
        return (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-primary/10 border border-primary/20 rounded p-3 text-center">
              <div className="text-2xl font-bold text-primary">{alerts.filter(a => a.status === 'open').length}</div>
              <div className="text-[10px] text-muted-foreground uppercase mt-1">Open Alerts</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-center">
              <div className="text-2xl font-bold text-destructive">{cameras.filter(c => c.status === 'offline').length}</div>
              <div className="text-[10px] text-muted-foreground uppercase mt-1">Offline Cams</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Interactive Report Builder</h2>
          <p className="text-xs text-muted-foreground">Drag and drop widgets to build a custom report with live data.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setCanvasWidgets([]); toast.success("Canvas cleared"); }} className="rounded bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition inline-flex items-center gap-1"><Trash2 className="size-3" /> Clear</button>
          <button onClick={() => toast.success("PDF Report Export Scheduled")} className="rounded bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 transition">Schedule PDF</button>
          <button onClick={() => toast.success("Template Saved")} className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition">Save Template</button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4">
          {/* Left panel: Available */}
          <div className="w-48 bg-background/50 rounded-lg p-3 border border-border/60">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Available Widgets</div>
            <Droppable droppableId="available" isDropDisabled={true}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-[200px]">
                  {AVAILABLE_WIDGETS.map((w, index) => (
                    <Draggable key={w.id} draggableId={w.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center gap-2 p-2 text-xs rounded bg-white/5 border border-white/5 transition ${snapshot.isDragging ? "opacity-50" : ""}`}
                        >
                          <w.icon className="size-3 text-primary" /> {w.name}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Right canvas */}
          <div className="flex-1 bg-background/30 rounded-lg p-4 border border-dashed border-border/60 relative">
            <Droppable droppableId="canvas">
              {(provided, snapshot) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef} 
                  className={`min-h-[400px] grid grid-cols-1 md:grid-cols-2 gap-4 items-start content-start transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                >
                  {canvasWidgets.length === 0 && !snapshot.isDraggingOver && (
                    <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm pointer-events-none">
                      Drag widgets from the left panel to build your report
                    </div>
                  )}
                  {canvasWidgets.map((w, index) => (
                    <Draggable key={w.id} draggableId={w.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="bg-[oklch(0.1_0.03_270)] border border-border/60 rounded-xl p-4 relative group shadow-lg w-full"
                        >
                          {/* Drag Handle & Delete */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <div {...provided.dragHandleProps} className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground rounded hover:bg-white/10">
                              <GripHorizontal className="size-4" />
                            </div>
                            <button onClick={() => removeWidget(w.id)} className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/20">
                              <X className="size-4" />
                            </button>
                          </div>
                          
                          <div className="font-display font-medium text-sm mb-1 text-primary pr-12">{w.name}</div>
                          {renderWidgetContent(w.type)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
