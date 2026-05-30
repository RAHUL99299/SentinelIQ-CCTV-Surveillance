import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="glass rounded-2xl flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="size-6 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary pulse-dot" />
            </div>
            <span className="font-display font-bold tracking-tight text-lg">
              Sentinel<span className="text-primary">IQ</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-glow font-medium"
            >
              Launch Console
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
