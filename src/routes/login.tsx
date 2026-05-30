import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Shield, ShieldAlert, Video, HardHat, Eye, EyeOff, Fingerprint, Lock, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — SentinelIQ" }] }),
  component: LoginPage,
});

const ROLES = [
  {
    name: "Super Admin",
    email: "alex.rivers@sentineliq.com",
    icon: Shield,
    accent: "#6366f1",
    desc: "Complete command console control.",
    defaultPassword: "alex@123",
  },
  {
    name: "Security Manager",
    email: "sarah.connor@sentineliq.com",
    icon: ShieldAlert,
    accent: "#ef4444",
    desc: "Incident & camera registry tools.",
    defaultPassword: "sarah@123",
  },
  {
    name: "CCTV Operator",
    email: "john.doe@sentineliq.com",
    icon: Video,
    accent: "#f59e0b",
    desc: "Live stream monitoring & alarms.",
    defaultPassword: "john@123",
  },
  {
    name: "HR Officer",
    email: "emma.watson@sentineliq.com",
    icon: HardHat,
    accent: "#06b6d4",
    desc: "Worksite safety & PPE tracking.",
    defaultPassword: "emma@123",
  },
  {
    name: "Viewer",
    email: "guest@sentineliq.com",
    icon: Eye,
    accent: "#94a3b8",
    desc: "Read-only surveillance guest access.",
    defaultPassword: "guest@123",
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [roleIdx, setRoleIdx] = React.useState(0);
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState(false);

  console.log("[DEBUG] Rendering LoginPage, roleIdx:", roleIdx);

  const role = ROLES[roleIdx];

  function selectRole(i: number) {
    setRoleIdx(i);
    setPassword("");
    setErr("");
    setOk(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (!password) {
      setErr("Enter your security key.");
      return;
    }

    setOk(true);

    try {
      const user = await authApi.login({
        email: role.email,
        password: password,
      });

      // ✅ Auth success — store and redirect
      localStorage.setItem("sentineliq-role", user.role);
      localStorage.setItem("sentineliq-user", JSON.stringify(user));

      setTimeout(() => navigate({ to: "/dashboard" }), 400);
    } catch (e: any) {
      setOk(false);
      console.error("[LOGIN ERROR]", e);
      setErr(e.message || "Invalid credentials. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c18] relative overflow-hidden font-sans p-6">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.15)_0%,transparent_60%)] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-[440px] bg-gradient-to-br from-slate-950/90 to-slate-900/95 border border-indigo-500/20 rounded-2xl p-8 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3 self-start">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Shield size={20} className="text-indigo-400" />
          </div>
          <span className="font-bold text-lg text-slate-100 tracking-tight">
            Sentinel<span className="text-indigo-400">IQ</span>
          </span>
        </div>

        {/* Title */}
        <div className="flex items-center gap-4 self-start w-full border-b border-white/5 pb-5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Fingerprint size={22} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-100 tracking-tight">Smart Console Login</div>
            <div className="text-xs text-slate-500 mt-0.5">Select your role and enter security key</div>
          </div>
        </div>

        <form onSubmit={submit} className="w-full flex flex-col gap-5" noValidate>
          {/* Role list */}
          <div>
            <div className="text-[10px] font-bold text-slate-400/80 tracking-widest uppercase font-mono mb-2">
              OPERATIONAL PROFILE
            </div>
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 select-none custom-scrollbar">
              {ROLES.map((r, i) => {
                const Icon = r.icon;
                const sel = i === roleIdx;
                return (
                  <button
                    key={r.email}
                    type="button"
                    onClick={() => selectRole(i)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left w-full cursor-pointer hover:bg-white/[0.04] outline-none ${
                      sel ? "border-transparent" : "border-white/5"
                    }`}
                    style={{
                      borderColor: sel ? `${r.accent}40` : undefined,
                      backgroundColor: sel ? `${r.accent}12` : undefined,
                      boxShadow: sel ? `0 0 16px -2px ${r.accent}25` : undefined,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 transition-colors"
                      style={{ color: sel ? r.accent : "#64748b" }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold transition-colors ${sel ? "text-slate-100" : "text-slate-300"}`}>
                        {r.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{r.email}</div>
                    </div>
                    {sel && (
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                        style={{ backgroundColor: r.accent }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="text-[10px] font-bold text-slate-400/80 tracking-widest uppercase font-mono mb-2">
              SECURITY CONSOLE KEY
            </div>

            <div className="relative flex items-center w-full">
              <Lock className="absolute left-3 text-slate-500 shrink-0" size={14} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (err) setErr("");
                }}
                placeholder="Enter security key…"
                autoComplete="current-password"
                className="w-full py-2.5 pl-10 pr-10 rounded-xl border border-white/10 bg-white/5 text-slate-200 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all outline-none"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>


            {err && (
              <div className="text-red-400 text-[11px] font-mono p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-3 flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                <span className="shrink-0 text-red-500 font-bold">⚠</span>
                <span>{err}</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={ok}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(99,102,241,0.4)] hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {ok ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Redirecting…</span>
              </>
            ) : (
              <>
                <Fingerprint size={16} />
                <span>Verify &amp; Authenticate</span>
              </>
            )}
          </button>
        </form>
        <Link to="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors self-center mt-2">
          ← Back to landing
        </Link>
      </div>
    </div>
  );
}
