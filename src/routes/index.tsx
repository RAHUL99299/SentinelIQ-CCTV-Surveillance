import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, Camera, Globe2, HardHat, History,
  Play, ArrowRight, Check, Star, Users, Zap, X,
} from "lucide-react";
import { SiteHeader } from "@/components/sentinel/SiteHeader";
import { SiteFooter } from "@/components/sentinel/SiteFooter";
import { NetworkGrid } from "@/components/sentinel/NetworkGrid";
import { CameraGrid } from "@/components/sentinel/CameraGrid";
import { AnimatedCounter } from "@/components/sentinel/AnimatedCounter";
import { useState, useEffect } from "react";
import { useLandingStats, useBookDemo, useRequestPlan } from "@/lib/queries";

const BRAND_LOGOS = [
  {
    name: "Axiom",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 22h20L12 2zM12 18l-5-5h10l-5 5z" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">AXIOM</span>
      </div>
    )
  },
  {
    name: "Northgate",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 2l3 4.5M12 2l-3 4.5M12 22l3-4.5M12 22l-3-4.5M2 12l4.5 3M2 12l4.5-3M22 12l-4.5 3M22 12l-4.5-3" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">NORTHGATE</span>
      </div>
    )
  },
  {
    name: "Vantage",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 16 8-16" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">VANTAGE</span>
      </div>
    )
  },
  {
    name: "Helios",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" className="fill-primary" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">HELIOS</span>
      </div>
    )
  },
  {
    name: "Proton",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(-30 12 12)" />
          <circle cx="12" cy="12" r="2" className="fill-primary" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">PROTON</span>
      </div>
    )
  },
  {
    name: "Obsidian",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 12l10 10 10-10L12 2zM12 2v20M2 12h20" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">OBSIDIAN</span>
      </div>
    )
  },
  {
    name: "Quantum",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 0115-6.7M21 12a9 9 0 01-15 6.7" />
          <circle cx="12" cy="12" r="3" className="fill-primary" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">QUANTUM</span>
      </div>
    )
  },
  {
    name: "Stratus",
    svg: (
      <div className="flex items-center gap-2 text-muted-foreground/70 hover:text-foreground transition duration-300">
        <svg className="size-6 text-primary fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.99A4 4 0 0010 9a4 4 0 00-7 6z" />
        </svg>
        <span className="font-display font-bold tracking-widest text-lg">STRATUS</span>
      </div>
    )
  }
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SentinelIQ — AI-Powered Surveillance Intelligence" },
      { name: "description", content: "Real-time AI surveillance, crowd detection, incident timelines, and global multi-site security operations." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Starter");

  const openPlanModal = (planName: string) => {
    setSelectedPlan(planName);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <TrustedBy />
      <Pricing onSelectPlan={openPlanModal} />
      <CtaFooter />
      <SiteFooter />
      <PricingDemoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultPlan={selectedPlan} />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
      <div className="absolute inset-0 grid-bg radial-mask" />
      <NetworkGrid className="absolute inset-0 size-full opacity-70" />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 size-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.22 260 / 0.25), transparent 60%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-success pulse-dot" />
            <span className="text-muted-foreground">Operational · 2.4M cameras online</span>
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            <span className="gradient-text">AI-Powered</span>
            <br />
            <span className="cursor-blink">Surveillance Intelligence</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Monitor every site, every camera, every minute. SentinelIQ unifies global CCTV, predictive
            crowd analytics, and incident response into a single command center your security team can trust.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:bg-primary/90 transition"
            >
              Request Demo <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {[0,1,2,3].map((i) => (
                <div key={i} className="size-7 rounded-full border-2 border-background"
                  style={{ background: `hsl(${210 + i*15} 60% 55%)` }} />
              ))}
            </div>
            <div>
              Trusted by <span className="text-foreground font-semibold">450+</span> security ops teams
            </div>
          </div>
        </div>

        {/* Floating dashboard mock */}
        <div className="relative animate-float">
          <div className="absolute -inset-6 blur-3xl opacity-50"
            style={{ background: "radial-gradient(circle, oklch(0.62 0.22 260 / 0.5), transparent 60%)" }} />
          <div className="relative glass glow-border rounded-2xl overflow-hidden shadow-elevated">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-card/50">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-destructive" />
                <span className="size-2 rounded-full bg-warning" />
                <span className="size-2 rounded-full bg-success" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">sentineliq.live · ops</span>
              <div className="text-[10px] text-muted-foreground">12:48:02</div>
            </div>
            <CameraGrid />
            <div className="grid grid-cols-3 gap-2 p-3 pt-0 text-[11px]">
              {[
                { label: "Active alerts", v: "07", c: "text-destructive" },
                { label: "Sites online", v: "184", c: "text-success" },
                { label: "AI events / min", v: "1.2k", c: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-secondary/60 p-2.5">
                  <div className={`font-display font-bold text-xl ${s.c}`}>{s.v}</div>
                  <div className="text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- STATS ---------------- */
function StatsBar() {
  const { data } = useLandingStats();

  const stats = [
    { 
      v: data ? data.cameras_monitored : 2418290, 
      suf: "+", 
      dec: 0, 
      label: "Cameras Monitored" 
    },
    { 
      v: data ? data.uptime_sla : 99.98, 
      suf: "%", 
      dec: 2, 
      label: "Uptime SLA" 
    },
    { 
      v: data ? data.avg_alert_response : 0.24, 
      suf: "s", 
      dec: 2, 
      label: "Avg Alert Response", 
      prefix: data && data.avg_alert_response < 0.3 ? "< " : "" 
    },
    { 
      v: data ? data.countries : 180, 
      suf: "+", 
      dec: 0, 
      label: "Countries" 
    },
  ];

  return (
    <section className="border-y border-border/40 bg-card/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center md:text-left">
            <div className="font-display text-3xl md:text-4xl font-bold gradient-text">
              <AnimatedCounter to={s.v} decimals={s.dec} suffix={s.suf} prefix={s.prefix} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */
const FEATURES = [
  { icon: Camera, title: "Real-Time CCTV Monitoring", desc: "Stream and orchestrate every camera across every site from a single command surface." },
  { icon: Users, title: "AI Crowd Detection", desc: "Predict density, dwell time, and movement anomalies before they escalate." },
  { icon: AlertTriangle, title: "Crime Prevention Alerts", desc: "Edge-AI flags weapons, intrusion, loitering, and tailgating in milliseconds." },
  { icon: HardHat, title: "Worksite Productivity", desc: "Track attendance, PPE compliance, and active work sessions automatically." },
  { icon: History, title: "Incident Timeline", desc: "Reconstruct any incident with frame-accurate evidence and full chain-of-custody." },
  { icon: Globe2, title: "Multi-Site Management", desc: "Roll up operations across regions with role-based access and unified policy." },
];

function Features() {
  return (
    <section id="features" className="py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Capabilities"
          title="Built for security teams who can't afford to blink."
          sub="Six tightly integrated modules that turn passive footage into actionable intelligence."
        />
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group relative glass rounded-2xl p-6 hover:border-primary/40 transition">
              <div className="size-11 rounded-xl bg-primary/15 grid place-items-center text-primary group-hover:scale-110 group-hover:bg-primary/25 transition">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              <div className="mt-5 inline-flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition">
                Learn more <ArrowRight className="ml-1 size-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    { n: "01", t: "Connect", d: "Plug in any IP/ONVIF camera, NVR, or RTSP feed in minutes." },
    { n: "02", t: "Detect", d: "Edge AI models analyze every frame for events, people, and risk signals." },
    { n: "03", t: "Respond", d: "Operators receive prioritized alerts with one-click incident workflows." },
  ];
  return (
    <section id="how" className="py-28 relative">
      <div className="absolute inset-0 grid-bg radial-mask opacity-50" />
      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="How it works" title="From signal to response in under a second." />
        <div className="relative mt-16 grid md:grid-cols-3 gap-6">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px"
            style={{ background: "linear-gradient(90deg, transparent, oklch(0.62 0.22 260 / 0.6), transparent)" }} />
          {steps.map((s) => (
            <div key={s.n} className="relative glass rounded-2xl p-7 text-center">
              <div className="mx-auto size-14 rounded-full bg-background border border-primary/40 grid place-items-center font-display text-lg font-bold text-primary shadow-glow">
                {s.n}
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TRUSTED BY ---------------- */
function TrustedBy() {
  return (
    <section className="py-16 border-y border-border/40 bg-card/20">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">
          Trusted by security operations worldwide
        </p>
        <div className="mt-8 overflow-hidden">
          <div className="flex gap-20 animate-marquee w-max items-center">
            {[...BRAND_LOGOS, ...BRAND_LOGOS].map((logo, i) => (
              <div key={i} className="inline-flex items-center whitespace-nowrap">
                {logo.svg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PRICING ---------------- */
function Pricing({ onSelectPlan }: { onSelectPlan: (plan: string) => void }) {
  const tiers = [
    { name: "Starter", price: "$199", per: "/site/mo",
      desc: "For single-site teams getting started with AI surveillance.",
      features: ["Up to 25 cameras", "30-day footage retention", "Basic AI alerts", "Email + chat support"],
      cta: "Start free trial", featured: false },
    { name: "Professional", price: "$799", per: "/site/mo",
      desc: "For growing security operations across multiple sites.",
      features: ["Up to 250 cameras", "180-day retention", "All AI modules", "SSO + audit logs", "24/7 priority support"],
      cta: "Get started", featured: true },
    { name: "Enterprise", price: "Custom", per: "",
      desc: "Global rollouts with custom AI models and on-prem options.",
      features: ["Unlimited cameras", "Custom retention", "On-prem / hybrid", "Dedicated success manager", "Custom AI training"],
      cta: "Talk to sales", featured: false },
  ];
  return (
    <section id="pricing" className="py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Pricing" title="Plans that scale with your operations." />
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div key={t.name}
              className={`relative rounded-2xl p-7 ${t.featured ? "glass glow-border" : "glass"}`}>
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs bg-primary text-primary-foreground shadow-glow">
                  Most Popular
                </div>
              )}
              <div className="text-sm text-muted-foreground">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-muted-foreground text-sm">{t.per}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => onSelectPlan(t.name)}
                className={`mt-7 w-full py-2.5 rounded-xl font-medium transition ${
                  t.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {t.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



/* ---------------- CTA + NEWSLETTER ---------------- */
function CtaFooter() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const bookDemo = useBookDemo();

  const handleBookDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    bookDemo.mutate(
      { name, email, company },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setCompany("");
          setStatus("success");
        },
        onError: (err: any) => {
          setStatus("error");
          setErrorMessage(err.message || "Failed to book demo. Please try again.");
        }
      }
    );
  };

  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative glass glow-border rounded-3xl p-10 md:p-14 overflow-hidden">
          <div className="absolute -top-32 -right-20 size-96 rounded-full opacity-50"
            style={{ background: "radial-gradient(circle, oklch(0.62 0.22 260 / 0.4), transparent 60%)" }} />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs glass rounded-full px-3 py-1">
                <Zap className="size-3 text-primary" /> Schedule a 30-min demo
              </div>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-tight">
                See SentinelIQ live on <span className="gradient-text">your sites.</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Book a tailored walkthrough with our solutions team. Or join our briefing list for monthly intel.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="size-3 text-success" />
                Avg. setup time: 12 minutes
              </div>
            </div>

            <div className="relative">
              {status === "success" ? (
                <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center animate-[fade-in_0.4s_ease-out]">
                  <div className="size-12 rounded-full bg-success/20 grid place-items-center text-success mx-auto">
                    <Check className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">Demo Request Received!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Thank you! We've saved your details and a briefing notification was sent to <strong>ds633093@gmail.com</strong>. Our solutions team will contact you shortly.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 text-xs text-primary hover:underline"
                  >
                    Submit another response
                  </button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleBookDemoSubmit}>
                  {status === "error" && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground flex items-center justify-between">
                      <span>{errorMessage}</span>
                      <button type="button" onClick={() => setStatus("idle")} className="p-1 hover:bg-destructive/10 rounded">
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    required
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={status === "loading"}
                    className="w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition disabled:opacity-50"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading"}
                    className="w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition disabled:opacity-50"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={status === "loading"}
                    className="w-full px-4 py-3 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:bg-primary/90 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {status === "loading" ? "Scheduling..." : "Schedule Demo"} <ArrowRight className="size-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-block text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface PricingDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan: string;
}

function PricingDemoModal({ isOpen, onClose, defaultPlan }: PricingDemoModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState(defaultPlan);
  const [need, setNeed] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const requestPlan = useRequestPlan();

  useEffect(() => {
    setPlan(defaultPlan);
    setStatus("idle");
    setName("");
    setEmail("");
    setCompany("");
    setNeed("");
    setErrorMessage("");
  }, [defaultPlan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    requestPlan.mutate(
      { name, email, company, plan, need },
      {
        onSuccess: () => {
          setStatus("success");
        },
        onError: (err: any) => {
          setStatus("error");
          setErrorMessage(err.message || "Failed to submit request. Please try again.");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary/10 border-b border-primary/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
              <Zap className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Plan Registration</h2>
              <p className="text-xs text-primary">Provide details to try/purchase {plan}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition outline-none"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {status === "success" ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="size-16 rounded-full bg-success/20 grid place-items-center text-success mx-auto">
                <Check className="size-8" />
              </div>
              <h3 className="text-xl font-bold">Request Submitted!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Thank you! We've saved your details and a briefing notification was sent to <strong>ds633093@gmail.com</strong>. Our solutions team will contact you shortly.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-glow"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === "error" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive-foreground flex items-start justify-between gap-2">
                  <span>{errorMessage}</span>
                  <button type="button" onClick={() => setStatus("idle")} className="p-1 hover:bg-destructive/10 rounded shrink-0">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full px-4 py-2.5 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm disabled:opacity-50 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full px-4 py-2.5 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm disabled:opacity-50 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">Company (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Northgate Logistics"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full px-4 py-2.5 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm disabled:opacity-50 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">Selected Plan</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm disabled:opacity-50 text-foreground"
                >
                  <option value="Starter">Starter ($199/mo)</option>
                  <option value="Professional">Professional ($799/mo)</option>
                  <option value="Enterprise">Enterprise (Custom)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">Operational Needs / Custom Requirements</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your security needs, camera count, custom AI alerts, etc..."
                  value={need}
                  onChange={(e) => setNeed(e.target.value)}
                  disabled={status === "loading"}
                  className="w-full px-4 py-2.5 rounded-xl bg-input/40 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition text-sm disabled:opacity-50 text-foreground resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-glow hover:bg-primary/90 transition inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {status === "loading" ? "Submitting Request..." : "Submit Purchase Request"} <ArrowRight className="size-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
