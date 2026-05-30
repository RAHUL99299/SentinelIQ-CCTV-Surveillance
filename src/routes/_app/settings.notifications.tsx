import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Bell, Send, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "@/lib/queries";

export const Route = createFileRoute("/_app/settings/notifications")({
  head: () => ({ meta: [{ title: "Notification Settings — SentinelIQ" }] }),
  component: NotificationsSettings,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface EscalationLevel {
  id: string;
  name: string;
  delay: string;
}

interface NotificationRule {
  id: string;
  event: string;
  severity: string;
  notify: string;
  via: string[];
  delay: number;
}

// ─── Defaults (used when database has no saved value yet) ─────────────────────

const DEFAULT_CHANNELS = { inApp: true, email: true, sms: false, whatsapp: false, push: true };
const DEFAULT_ESCALATION: EscalationLevel[] = [
  { id: "lvl-1", name: "Level 1: CCTV Operator",              delay: "Immediate"     },
  { id: "lvl-2", name: "Level 2: Security Manager",           delay: "5m unresolved" },
  { id: "lvl-3", name: "Level 3: Admin + External Agency",    delay: "15m unresolved" },
];
const DEFAULT_QUIET_HOURS = { sms_start: "23:00", sms_end: "07:00", push_start: "22:00", push_end: "08:00" };
const DEFAULT_RULES: NotificationRule[] = [];

function NotificationsSettings() {
  const { data: remoteSettings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  // ─── Local state (seeded from backend) ─────────────────────────────────────
  const [channels,    setChannels]    = useState(DEFAULT_CHANNELS);
  const [escalation,  setEscalation]  = useState<EscalationLevel[]>(DEFAULT_ESCALATION);
  const [quietHours,  setQuietHours]  = useState(DEFAULT_QUIET_HOURS);
  const [rules,       setRules]       = useState<NotificationRule[]>(DEFAULT_RULES);

  // New-rule form state
  const [ruleForm, setRuleForm] = useState<Omit<NotificationRule, "id">>({
    event: "Intrusion", severity: "HIGH", notify: "Security Manager", via: ["inApp"], delay: 0,
  });
  const [addingRule, setAddingRule] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Seed local state from backend once loaded ──────────────────────────────
  useEffect(() => {
    if (!remoteSettings) return;
    if (remoteSettings.notification_channels)   setChannels(remoteSettings.notification_channels);
    if (remoteSettings.notification_escalation) setEscalation(remoteSettings.notification_escalation);
    if (remoteSettings.notification_quiet_hours) setQuietHours(remoteSettings.notification_quiet_hours);
    if (remoteSettings.notification_rules)       setRules(remoteSettings.notification_rules);
  }, [remoteSettings]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const persist = (patch: Record<string, any>, label?: string) => {
    setSaving(true);
    updateSettings.mutate(patch, {
      onSuccess: () => {
        if (label) toast.success(label);
        setSaving(false);
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to save settings");
        setSaving(false);
      },
    });
  };

  // ─── Channels ───────────────────────────────────────────────────────────────

  const handleToggleChannel = (k: string, v: boolean) => {
    const newChannels = { ...channels, [k]: !v };
    setChannels(newChannels);
    persist({ notification_channels: newChannels }, `${k} notifications ${!v ? "enabled" : "disabled"}`);
  };

  // ─── Quiet Hours ────────────────────────────────────────────────────────────

  const handleSaveQuietHours = (field: string, value: string) => {
    const newHours = { ...quietHours, [field]: value };
    setQuietHours(newHours);
    persist({ notification_quiet_hours: newHours }, "Quiet hours updated");
  };

  // ─── Escalation drag-and-drop ────────────────────────────────────────────────

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(escalation);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setEscalation(items);
    persist({ notification_escalation: items }, "Escalation order updated");
  };

  // ─── Notification Rules ──────────────────────────────────────────────────────

  const handleAddRule = () => {
    const newRule: NotificationRule = { ...ruleForm, id: `rule-${Date.now()}` };
    const newRules = [...rules, newRule];
    setRules(newRules);
    persist({ notification_rules: newRules }, "Notification rule saved");
    setAddingRule(false);
    setRuleForm({ event: "Intrusion", severity: "HIGH", notify: "Security Manager", via: ["inApp"], delay: 0 });
  };

  const handleDeleteRule = (id: string) => {
    const newRules = rules.filter(r => r.id !== id);
    setRules(newRules);
    persist({ notification_rules: newRules }, "Notification rule deleted");
  };

  const toggleRuleVia = (channel: string) => {
    setRuleForm(f => {
      const via = f.via.includes(channel) ? f.via.filter(c => c !== channel) : [...f.via, channel];
      return { ...f, via };
    });
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center p-16 text-muted-foreground gap-3">
      <Loader2 className="size-5 animate-spin text-primary" />
      <span className="text-sm">Loading notification settings from database…</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Notification Settings</h1>
          <p className="text-sm text-muted-foreground">
            All changes are saved to the database in real time
            {saving && <span className="ml-2 text-primary animate-pulse">● saving…</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Notification Channels */}
        <div className="glass rounded-xl p-5">
          <div className="font-display font-semibold mb-3">Notification Channels</div>
          <div className="space-y-2">
            {Object.entries(channels).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <button
                    id={`channel-toggle-${k}`}
                    onClick={() => handleToggleChannel(k, v)}
                    className={`relative h-5 w-9 rounded-full transition ${v ? "bg-primary" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} />
                  </button>
                  <span className="text-sm capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                </div>
                <button
                  onClick={() => toast.info(`Test notification sent via ${k}`)}
                  disabled={!v}
                  className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Send className="size-3" /> Test
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="glass rounded-xl p-5">
          <div className="font-display font-semibold mb-3">Quiet Hours</div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground w-28">Mute SMS between</span>
              <input
                type="time"
                value={quietHours.sms_start}
                onChange={(e) => setQuietHours({ ...quietHours, sms_start: e.target.value })}
                onBlur={(e) => handleSaveQuietHours("sms_start", e.target.value)}
                className="rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
              />
              <span className="text-xs text-muted-foreground">and</span>
              <input
                type="time"
                value={quietHours.sms_end}
                onChange={(e) => setQuietHours({ ...quietHours, sms_end: e.target.value })}
                onBlur={(e) => handleSaveQuietHours("sms_end", e.target.value)}
                className="rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground w-28">Mute Push between</span>
              <input
                type="time"
                value={quietHours.push_start}
                onChange={(e) => setQuietHours({ ...quietHours, push_start: e.target.value })}
                onBlur={(e) => handleSaveQuietHours("push_start", e.target.value)}
                className="rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
              />
              <span className="text-xs text-muted-foreground">and</span>
              <input
                type="time"
                value={quietHours.push_end}
                onChange={(e) => setQuietHours({ ...quietHours, push_end: e.target.value })}
                onBlur={(e) => handleSaveQuietHours("push_end", e.target.value)}
                className="rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Escalation Matrix */}
        <div className="glass rounded-xl p-5">
          <div className="font-display font-semibold mb-1 flex items-center justify-between">
            <span>Escalation Flow Builder</span>
            <Bell className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-4">Drag and drop to reorder escalation levels. Changes save instantly.</p>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="escalation-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {escalation.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 rounded-lg border border-border/60 p-3 transition ${
                            snapshot.isDragging
                              ? "bg-primary/10 border-primary shadow-lg scale-[1.02]"
                              : "bg-white/[0.02] hover:bg-white/5"
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                            <GripVertical className="size-4" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">Delay: {item.delay}</div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                            Level {index + 1}
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Notification Rules */}
        <div className="glass rounded-xl p-5">
          <div className="font-display font-semibold mb-1 flex items-center justify-between">
            <span>Notification Rules</span>
            <button
              onClick={() => setAddingRule(v => !v)}
              className="flex items-center gap-1 rounded-lg bg-primary/20 border border-primary/30 px-2 py-1 text-xs text-primary hover:bg-primary/30 transition"
            >
              <Plus className="size-3" /> Add Rule
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Rules are saved to the database and applied at runtime.</p>

          {/* Rule builder form */}
          {addingRule && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2 text-sm animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">IF event is</label>
                  <select
                    value={ruleForm.event}
                    onChange={e => setRuleForm(f => ({ ...f, event: e.target.value }))}
                    className="mt-0.5 w-full rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
                  >
                    {["Intrusion", "Fight", "Loitering", "Crowd Surge", "Perimeter Breach"].map(e => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">AND severity ≥</label>
                  <select
                    value={ruleForm.severity}
                    onChange={e => setRuleForm(f => ({ ...f, severity: e.target.value }))}
                    className="mt-0.5 w-full rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
                  >
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">THEN notify</label>
                  <select
                    value={ruleForm.notify}
                    onChange={e => setRuleForm(f => ({ ...f, notify: e.target.value }))}
                    className="mt-0.5 w-full rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
                  >
                    {["Security Manager", "CCTV Operator", "Super Admin", "All"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">AFTER (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    value={ruleForm.delay}
                    onChange={e => setRuleForm(f => ({ ...f, delay: parseInt(e.target.value) || 0 }))}
                    className="mt-0.5 w-full rounded border border-border/60 bg-input/60 px-2 py-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Via channels</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.keys(channels).map(c => (
                    <label key={c} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border cursor-pointer transition ${ruleForm.via.includes(c) ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-border/40"}`}>
                      <input type="checkbox" className="hidden" checked={ruleForm.via.includes(c)} onChange={() => toggleRuleVia(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setAddingRule(false)} className="rounded border border-border/60 px-3 py-1 text-xs hover:bg-white/5">Cancel</button>
                <button
                  onClick={handleAddRule}
                  disabled={ruleForm.via.length === 0}
                  className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Save Rule
                </button>
              </div>
            </div>
          )}

          {/* Saved rules list */}
          {rules.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground rounded-lg border border-dashed border-border/40">
              No rules yet — click "Add Rule" to create one
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-start justify-between rounded-lg border border-border/60 bg-white/[0.02] p-3 gap-3 hover:bg-white/5 transition">
                  <div className="flex-1 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground">IF</span>
                      <span className="bg-white/10 border border-border/40 px-1.5 py-0.5 rounded">{rule.event}</span>
                      <span className="text-muted-foreground">severity ≥</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        rule.severity === "CRITICAL" ? "bg-destructive/20 text-destructive" :
                        rule.severity === "HIGH"     ? "bg-[oklch(0.78_0.17_75/0.2)] text-[oklch(0.78_0.17_75)]" :
                        "bg-primary/20 text-primary"
                      }`}>{rule.severity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground">THEN</span>
                      <span className="bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded text-primary">{rule.notify}</span>
                      <span className="text-muted-foreground">via</span>
                      {rule.via.map(c => (
                        <span key={c} className="bg-white/5 border border-border/40 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                      {rule.delay > 0 && <span className="text-muted-foreground">after {rule.delay}s</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-muted-foreground hover:text-destructive transition shrink-0 mt-0.5"
                    title="Delete rule"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
