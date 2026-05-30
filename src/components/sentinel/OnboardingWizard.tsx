import { useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  console.log("[DEBUG] Rendering OnboardingWizard, open:", open, "step:", step);

  useEffect(() => {
    if (localStorage.getItem("sentineliq-onboarded") !== "true") {
      // Small delay to let the splash screen finish
      const timer = setTimeout(() => setOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps = [
    { title: "Welcome to SentinelIQ", desc: "Let's set up your operational intelligence platform." },
    { title: "Add Your First Camera", desc: "Connect RTSP feeds or IP cameras to start monitoring." },
    { title: "Invite Your Team", desc: "Bring in security managers and operators." },
    { title: "Configure Alerts", desc: "Set up rules for AI detection and anomaly highlighting." },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      localStorage.setItem("sentineliq-onboarded", "true");
      setOpen(false);
      toast.success("Onboarding Complete", { description: "You're ready to use SentinelIQ." });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-primary/10 border-b border-primary/20 p-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Play className="size-6 ml-1" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Getting Started</h2>
            <p className="text-sm text-primary">Step {step + 1} of {steps.length}</p>
          </div>
        </div>

        <div className="p-8 flex-1">
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <h3 className="text-2xl font-bold">{steps[step].title}</h3>
            <p className="text-muted-foreground">{steps[step].desc}</p>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-white/10"}`} />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition"
            >
              {step === steps.length - 1 ? "Finish Setup" : "Next Step"}
              {step === steps.length - 1 ? <CheckCircle2 className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
