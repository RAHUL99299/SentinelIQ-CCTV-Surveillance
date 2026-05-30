import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Legend } from "recharts";

export function TrendChart({ trendData }: { trendData: any[] }) {
  return (
    <div className="glass rounded-xl p-5 h-[300px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="font-display font-semibold">Live Crowd Trend (Last 60 Minutes)</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Real-time DB Polling</div>
      </div>
      <div className="flex-1 min-h-0">
        {trendData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground font-mono">
            No trend data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid stroke="oklch(0.62 0.22 260 / 0.1)" vertical={false} />
              <XAxis dataKey="d" stroke="oklch(0.65 0.03 260)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="oklch(0.65 0.03 260)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: "oklch(0.11 0.04 270 / 0.9)", border: "1px solid oklch(0.62 0.22 260 / 0.3)", borderRadius: 8, backdropFilter: "blur(8px)" }}
                itemStyle={{ fontSize: 12 }}
                formatter={(v: number) => [`${v} people`, "Avg Crowd"]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Line name="Avg Crowd Density" type="monotone" dataKey="c" stroke="oklch(0.62 0.22 260)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
