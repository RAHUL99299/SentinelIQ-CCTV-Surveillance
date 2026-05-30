import { createFileRoute } from "@tanstack/react-router";
import { HardDrive, Server, Activity, Database, Mail, UploadCloud, BrainCircuit } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSettings, useUpdateSettings, useSystemHealth } from "@/lib/queries";

export const Route = createFileRoute("/_app/admin/settings")({
  head: () => ({ meta: [{ title: "System Settings — SentinelIQ" }] }),
  component: SystemSettings,
});

function SystemSettings() {
  const { data: remoteSettings, isLoading: settingsLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: health, isLoading: healthLoading } = useSystemHealth();

  console.log("SystemSettings rendering...");

  const [aiModels, setAiModels] = useState({ yolo: true, lpr: true, behavioral: false });
  const [general, setGeneral] = useState({ company_name: "Acme Corp Security", timezone: "UTC (Coordinated Universal Time)" });
  const [storage, setStorage] = useState({ video_retention_days: 30, storage_path: "/mnt/nfs/surveillance" });
  const [smtp, setSmtp] = useState({ host: "smtp.sendgrid.net", port: 587, user: "apikey" });

  useEffect(() => {
    if (remoteSettings) {
      if (remoteSettings.system_ai_models && JSON.stringify(remoteSettings.system_ai_models) !== JSON.stringify(aiModels)) {
        setAiModels(remoteSettings.system_ai_models);
      }
      if (remoteSettings.system_general && JSON.stringify(remoteSettings.system_general) !== JSON.stringify(general)) {
        setGeneral(remoteSettings.system_general);
      }
      if (remoteSettings.system_storage && JSON.stringify(remoteSettings.system_storage) !== JSON.stringify(storage)) {
        setStorage(remoteSettings.system_storage);
      }
      if (remoteSettings.system_smtp && JSON.stringify(remoteSettings.system_smtp) !== JSON.stringify(smtp)) {
        setSmtp(remoteSettings.system_smtp);
      }
    }
  }, [remoteSettings]);

  const handleSaveGeneral = (field: string, value: string) => {
    const newGeneral = { ...general, [field]: value };
    setGeneral(newGeneral);
    updateSettings.mutate({ system_general: newGeneral }, { onSuccess: () => toast.success("General settings updated") });
  };

  const handleSaveStorage = (field: string, value: any) => {
    const newStorage = { ...storage, [field]: value };
    setStorage(newStorage);
    updateSettings.mutate({ system_storage: newStorage }, { onSuccess: () => toast.success("Storage policy updated") });
  };

  const handleSaveSmtp = (field: string, value: any) => {
    const newSmtp = { ...smtp, [field]: value };
    setSmtp(newSmtp);
    updateSettings.mutate({ system_smtp: newSmtp }, { onSuccess: () => toast.success("SMTP configuration updated") });
  };

  const handleTestSMTP = () => toast.info(`Testing SMTP connection to ${smtp.host}…`);
  const handleUploadLogo = () => toast.info("Click to upload company logo (PNG/SVG, max 2MB)");

  const toggleAI = (key: keyof typeof aiModels) => {
    const newVal = !aiModels[key];
    const newModels = { ...aiModels, [key]: newVal };
    setAiModels(newModels);
    updateSettings.mutate({ system_ai_models: newModels }, {
      onSuccess: () => toast.success(`AI model "${key}" ${newVal ? "enabled" : "disabled"}`)
    });
  };

  if (settingsLoading) return <div className="p-8 text-muted-foreground animate-pulse">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">Global configuration, storage, and health metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* General */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h2 className="font-display font-semibold border-b border-border/40 pb-2">General</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Company Name</label>
                <input
                  type="text"
                  value={general.company_name}
                  onChange={(e) => setGeneral({ ...general, company_name: e.target.value })}
                  onBlur={(e) => handleSaveGeneral('company_name', e.target.value)}
                  className="w-full bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Timezone</label>
                <select
                  value={general.timezone}
                  onChange={(e) => handleSaveGeneral('timezone', e.target.value)}
                  className="w-full bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                >
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>EST (Eastern Standard Time)</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-4 mt-2">
                <div className="size-12 rounded bg-white/5 border border-dashed border-border/60 grid place-items-center">Logo</div>
                <button onClick={handleUploadLogo} className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-border/60 rounded px-3 py-1.5 transition"><UploadCloud className="size-3" /> Upload Logo</button>
              </div>
            </div>
          </div>

          {/* Storage & AI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-5 space-y-4">
              <h2 className="font-display font-semibold border-b border-border/40 pb-2 flex items-center gap-2"><HardDrive className="size-4" /> Storage Policy</h2>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Video Retention (Days)</label>
                <input
                  type="number"
                  value={storage.video_retention_days}
                  onChange={(e) => setStorage({ ...storage, video_retention_days: parseInt(e.target.value) || 0 })}
                  onBlur={(e) => handleSaveStorage('video_retention_days', parseInt(e.target.value) || 0)}
                  className="w-full bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Storage Path</label>
                <input
                  type="text"
                  value={storage.storage_path}
                  onChange={(e) => setStorage({ ...storage, storage_path: e.target.value })}
                  onBlur={(e) => handleSaveStorage('storage_path', e.target.value)}
                  className="w-full font-mono bg-input/60 border border-border/60 rounded px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="glass rounded-xl p-5 space-y-4">
              <h2 className="font-display font-semibold border-b border-border/40 pb-2 flex items-center gap-2"><BrainCircuit className="size-4 text-primary" /> AI Models</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>Person Detection (YOLOv8)</span>
                  <input type="checkbox" checked={aiModels.yolo} onChange={() => toggleAI('yolo')} className="accent-primary" />
                </label>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>License Plate Rec (LPR)</span>
                  <input type="checkbox" checked={aiModels.lpr} onChange={() => toggleAI('lpr')} className="accent-primary" />
                </label>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>Behavioral Analysis</span>
                  <input type="checkbox" checked={aiModels.behavioral} onChange={() => toggleAI('behavioral')} className="accent-primary" />
                </label>
              </div>
            </div>
          </div>

          {/* SMTP */}
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <h2 className="font-display font-semibold flex items-center gap-2"><Mail className="size-4" /> SMTP Configuration</h2>
              <button onClick={handleTestSMTP} className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition">Test Connection</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-muted-foreground mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={smtp.host}
                  onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  onBlur={(e) => handleSaveSmtp('host', e.target.value)}
                  className="w-full bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs text-muted-foreground mb-1">Port</label>
                <input
                  type="number"
                  value={smtp.port}
                  onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) || 0 })}
                  onBlur={(e) => handleSaveSmtp('port', parseInt(e.target.value) || 0)}
                  className="w-full bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">SMTP User</label>
                <input
                  type="text"
                  value={smtp.user}
                  onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                  onBlur={(e) => handleSaveSmtp('user', e.target.value)}
                  className="w-full bg-input/60 border border-border/60 rounded px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2"><Activity className="size-4 text-[oklch(0.7_0.18_155)]" /> System Health</h2>

            {healthLoading || !health ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Fetching live system metrics...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Server className="size-3" /> Memory Usage</span>
                    <span className="font-medium text-[oklch(0.78_0.17_75)]">{health.memory.used} GB / {health.memory.total} GB</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[oklch(0.78_0.17_75)] transition-all duration-1000 ease-in-out" style={{ width: `${health.memory.percentage}%` }}></div></div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><HardDrive className="size-3" /> Disk Usage</span>
                    <span className="font-medium text-destructive">{health.disk.used} TB / {health.disk.total} TB</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-destructive transition-all duration-1000 ease-in-out" style={{ width: `${health.disk.percentage}%` }}></div></div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Database className="size-3" /> Redis Cache</span>
                    <span className="px-1.5 rounded bg-[oklch(0.7_0.18_155/0.2)] text-[oklch(0.7_0.18_155)]">{health.redis_status}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="size-3" /> Worker Queue</span>
                    <span className="font-medium">{health.worker_queue} jobs pending</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
