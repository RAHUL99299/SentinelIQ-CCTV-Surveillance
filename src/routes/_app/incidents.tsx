import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus, Filter, Volume2, VolumeX, Check, UserPlus, ArrowUp, X,
  Siren, AlertTriangle, Users, ShieldAlert, Clock, CheckCircle2,
  ChevronDown, Radio, Eye, Loader2,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useDashboard, useCameras, useAlerts, useUpdateAlert, useDeleteAlert, useCreateAlert } from "@/lib/queries";
import { CctvPlayer } from "@/components/sentinel/CctvPlayer";
import type { Alert as ApiAlert, Camera } from "@/lib/api";
import { livePreviewUrl, aiStreamSource } from "@/lib/ai";

export const Route = createFileRoute("/_app/incidents")({
  head: () => ({ meta: [{ title: "Crime Prevention — SentinelIQ" }] }),
  component: Incidents,
});

// ─── Severity Config ──────────────────────────────────────────────────────────

type Sev = "Low" | "Medium" | "High" | "Critical";

const sevStyle: Record<Sev, string> = {
  Critical: "border-destructive/60 bg-destructive/10",
  High: "border-[oklch(0.78_0.17_75/0.6)] bg-[oklch(0.78_0.17_75/0.08)]",
  Medium: "border-primary/50 bg-primary/8",
  Low: "border-[oklch(0.7_0.18_155/0.5)] bg-[oklch(0.7_0.18_155/0.07)]",
};

const sevDot: Record<Sev, string> = {
  Critical: "bg-destructive",
  High: "bg-[oklch(0.78_0.17_75)]",
  Medium: "bg-primary",
  Low: "bg-[oklch(0.7_0.18_155)]",
};

const sevText: Record<Sev, string> = {
  Critical: "text-destructive",
  High: "text-[oklch(0.85_0.17_75)]",
  Medium: "text-primary",
  Low: "text-[oklch(0.78_0.18_155)]",
};

const sevBadge: Record<Sev, string> = {
  Critical: "bg-destructive/20 text-destructive border-destructive/50",
  High: "bg-[oklch(0.78_0.17_75/20)] text-[oklch(0.85_0.17_75)] border-[oklch(0.78_0.17_75/50)]",
  Medium: "bg-primary/20 text-primary border-primary/50",
  Low: "bg-[oklch(0.7_0.18_155/20)] text-[oklch(0.78_0.18_155)] border-[oklch(0.7_0.18_155/50)]",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type IncidentStatus = "open" | "acknowledged" | "escalated" | "false_positive";

interface Incident {
  id: string;
  camera_id?: number;
  type: string;
  cam: string;
  zone: string;
  conf: number;
  sev: Sev;
  elapsed: string;
  elapsedSec: number;
  status: IncidentStatus;
  people?: number;
  desc: string;
}

const TYPES = ["Intrusion", "Fight", "Vandalism", "Abandoned Object", "Perimeter Breach", "Loitering", "Crowd Surge", "Crowd Density", "Crowd Alert", "Vehicle Congestion"];
const SEVS: Sev[] = ["Low", "Medium", "High", "Critical"];

const OFFICERS = [
  { name: "Rajveer Singh", uid: "OFC-2091", rank: "Senior Patrol Officer", dept: "Patrol Division", status: "Available", distance: "1.2 km away", eta: "4 mins", statusColor: "🟢" },
  { name: "Sarah Jenkins", uid: "OFF-708", rank: "Patrol Officer", dept: "Patrol Division", status: "Available", distance: "2.4 km away", eta: "8 mins", statusColor: "🟢" },
  { name: "Marcus Vance", uid: "OFF-912", rank: "Traffic Officer", dept: "Traffic Control", status: "Busy", distance: "0.8 km away", eta: "2 mins", statusColor: "🟡" },
  { name: "David Chen", uid: "OFF-345", rank: "Tactical Sergeant", dept: "Tactical Response", status: "Available", distance: "4.1 km away", eta: "12 mins", statusColor: "🟢" },
  { name: "Elena Rostova", uid: "OFF-118", rank: "K9 Officer", dept: "K9 Unit", status: "Offline", distance: "—", eta: "—", statusColor: "🔴" },
];

const IncidentPreviewImage = React.memo(
  function IncidentPreviewImage({
    camera,
    incidentId,
  }: {
    camera: Camera;
    incidentId: string;
  }) {
    const src = livePreviewUrl(aiStreamSource(camera));
    return (
      <img
        src={src}
        alt={`${camera.name} live snapshot`}
        className="absolute inset-0 size-full object-cover transition-opacity duration-300"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  },
  (prev, next) => {
    return prev.incidentId === next.incidentId && prev.camera?.id === next.camera?.id;
  }
);
const ZONES = ["Zone A – Entrance", "Zone B – Lobby", "Zone C – Parking", "Zone D – Perimeter", "Zone E – Corridor"];
const DESCS: Record<string, string> = {
  Intrusion: "Unauthorized access detected beyond secured boundary. Individual bypassed physical barrier.",
  Fight: "Physical altercation between multiple persons detected. Immediate response required.",
  Vandalism: "Property damage activity in progress. Subject engaging in destructive behavior.",
  "Abandoned Object": "Unattended object detected for more than 5 minutes. Potential security threat.",
  "Perimeter Breach": "Motion detected in restricted zone outside operational hours.",
  Loitering: "Individual has remained stationary in monitored area for extended period.",
  "Crowd Surge": "AI detected critical crowd overflow. Siren protocol engaged.",
  "Crowd Density": "Elevated crowd occupancy detected in monitored walkway.",
  "Crowd Alert": "Moderate crowd counts observed. Monitoring active.",
  "Vehicle Congestion": "AI detected vehicle congestion in traffic zone.",
};

// ─── Alarm Text Helper ────────────────────────────────────────────────────────

function crowdLabel(count: number): string {
  if (count > 30) return `🚨 CRITICAL — ${count} persons (>30 threshold exceeded!)`;
  if (count >= 10) return `⚠️ HIGH — ${count} persons (10–30 range)`;
  if (count >= 5) return `📢 MEDIUM — ${count} persons (5–10 range)`;
  return "";
}

// ─── Siren Overlay ────────────────────────────────────────────────────────────

function SirenOverlay({ incident, onDismiss }: { incident: Incident; onDismiss: () => void }) {
  const isCritical = incident.sev === "Critical";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-300"
      style={{
        background: isCritical
          ? "radial-gradient(ellipse at center, oklch(0.25 0.18 25 / 0.97) 0%, oklch(0.08 0.05 270 / 0.98) 100%)"
          : "radial-gradient(ellipse at center, oklch(0.20 0.15 75 / 0.96) 0%, oklch(0.08 0.05 270 / 0.97) 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Pulsing rings */}
      <div className="relative flex items-center justify-center mb-8">
        <div
          className="absolute rounded-full animate-ping"
          style={{
            width: 180, height: 180,
            background: isCritical ? "oklch(0.62 0.24 25 / 0.25)" : "oklch(0.78 0.17 75 / 0.25)",
            animationDuration: "0.7s",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 140, height: 140,
            background: isCritical
              ? "oklch(0.55 0.22 25 / 0.35)"
              : "oklch(0.72 0.17 75 / 0.35)",
            animation: "pulse 0.7s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 100, height: 100,
            background: isCritical ? "oklch(0.62 0.24 25)" : "oklch(0.78 0.17 75)",
            boxShadow: isCritical
              ? "0 0 60px oklch(0.62 0.24 25 / 0.85), 0 0 120px oklch(0.62 0.24 25 / 0.45)"
              : "0 0 60px oklch(0.78 0.17 75 / 0.85), 0 0 120px oklch(0.78 0.17 75 / 0.45)",
          }}
        >
          <Siren className="size-12 text-white" />
        </div>
      </div>

      <div className="text-center space-y-3 max-w-lg px-6">
        <div
          className="text-xs font-bold uppercase tracking-[0.3em]"
          style={{ color: isCritical ? "oklch(0.85 0.18 25)" : "oklch(0.88 0.15 75)" }}
        >
          {isCritical ? "⚠ CRITICAL ALERT — IMMEDIATE ACTION REQUIRED" : "⚠ HIGH ALERT — RESPONSE REQUIRED"}
        </div>
        <h2 className="text-4xl font-display font-bold text-white mt-2">
          {incident.type.toUpperCase()}
        </h2>
        <p className="text-base text-white/80 mt-1">
          {incident.id} · {incident.cam} · {incident.zone}
        </p>

        {incident.people !== undefined && incident.people > 0 && (
          <div
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold mt-2"
            style={{
              background: isCritical ? "oklch(0.62 0.24 25 / 0.3)" : "oklch(0.78 0.17 75 / 0.3)",
              border: `1px solid ${isCritical ? "oklch(0.62 0.24 25 / 0.6)" : "oklch(0.78 0.17 75 / 0.6)"}`,
              color: "white",
            }}
          >
            <Users className="size-4" />
            {crowdLabel(incident.people)}
          </div>
        )}

        <p className="text-sm text-white/60 mt-3 leading-relaxed">{incident.desc}</p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            id="siren-acknowledge-btn"
            onClick={onDismiss}
            className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 active:scale-95"
            style={{
              background: isCritical ? "oklch(0.62 0.24 25)" : "oklch(0.72 0.17 75)",
              boxShadow: isCritical ? "0 0 20px oklch(0.62 0.24 25 / 0.5)" : "0 0 20px oklch(0.72 0.17 75 / 0.5)",
            }}
          >
            <CheckCircle2 className="size-4 inline mr-2" />
            Acknowledge & Dismiss
          </button>
          <button
            id="siren-dismiss-btn"
            onClick={onDismiss}
            className="rounded-xl border border-white/20 px-6 py-3 text-sm text-white/70 hover:bg-white/10 transition"
          >
            <X className="size-4 inline mr-2" />
            Dismiss
          </button>
        </div>
      </div>

      {/* Scanline effect */}
      <div className="pointer-events-none absolute inset-0 scanline opacity-20" />
    </div>
  );
}

// ─── Incident Card ────────────────────────────────────────────────────────────

function IncidentCard({
  incident,
  camera,
  assigned,
  onAck,
  onAssign,
  onEscalate,
  onFalse,
  onSelect,
}: {
  incident: Incident;
  camera?: Camera;
  assigned?: { officer: typeof OFFICERS[0]; task: string; notes: string };
  onAck: () => void;
  onAssign: () => void;
  onEscalate: () => void;
  onFalse: () => void;
  onSelect: () => void;
}) {
  const { sev, status } = incident;
  const isOpen = status === "open";
  const isAcked = status === "acknowledged";
  const isEscalated = status === "escalated";
  const isFalse = status === "false_positive";

  return (
    <div
      id={`incident-card-${incident.id}`}
      className={`rounded-xl border p-4 transition-all duration-300 relative overflow-hidden
        ${sevStyle[sev]}
        ${isFalse ? "opacity-30 grayscale" : ""}
        ${isEscalated ? "ring-2 ring-destructive/40" : ""}
        hover:shadow-lg hover:scale-[1.01]`}
      style={{ cursor: "pointer" }}
      onClick={onSelect}
    >
      {/* Status ribbon */}
      {!isOpen && (
        <div
          className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
            ${isAcked ? "bg-[oklch(0.7_0.18_155/0.2)] text-[oklch(0.78_0.18_155)] border-[oklch(0.7_0.18_155/0.4)]" : ""}
            ${isEscalated ? "bg-destructive/20 text-destructive border-destructive/40 animate-pulse" : ""}
            ${isFalse ? "bg-white/10 text-white/50 border-white/20" : ""}
          `}
        >
          {isAcked && "✓ Acknowledged"}
          {isEscalated && "↑ Escalated"}
          {isFalse && "✕ False Positive"}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between pr-20">
        <div>
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${sevDot[sev]} ${sev === "Critical" && isOpen ? "pulse-dot" : ""}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${sevText[sev]}`}>{sev}</span>
          </div>
          <div className="font-display font-semibold mt-1 text-base">{incident.type}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {incident.id} · {incident.cam}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
          <div className="text-xl font-mono font-bold">{incident.conf}%</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r
            ${sev === "Critical" ? "from-destructive to-[oklch(0.7_0.25_15)]" : ""}
            ${sev === "High" ? "from-[oklch(0.78_0.17_75)] to-[oklch(0.88_0.17_65)]" : ""}
            ${sev === "Medium" ? "from-primary to-[oklch(0.72_0.22_240)]" : ""}
            ${sev === "Low" ? "from-[oklch(0.7_0.18_155)] to-[oklch(0.78_0.18_145)]" : ""}
          `}
          style={{ width: `${incident.conf}%` }}
        />
      </div>

      {/* People badge */}
      {incident.people !== undefined && incident.people > 0 && (
        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold border
          ${incident.people > 30 ? "bg-destructive/20 text-destructive border-destructive/40" :
            incident.people >= 5 ? "bg-primary/20 text-primary border-primary/40" :
              "bg-white/5 text-muted-foreground border-border/40"}`}
        >
          <Users className="size-3" />
          {incident.people} persons detected
          {incident.people > 30 && " — CRITICAL SURGE"}
          {incident.people >= 5 && incident.people <= 10 && " — alert raised"}
        </div>
      )}

      {/* Assignment badge */}
      {assigned && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border border-primary/40 bg-primary/10 text-primary">
          <span>👮 Assigned: {assigned.officer.name} ({assigned.officer.uid})</span>
        </div>
      )}

      {/* Camera preview */}
      <div
        className="mt-3 aspect-video rounded-md bg-[oklch(0.08_0.03_270)] surveil-bg relative overflow-hidden cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        {camera ? (
          <IncidentPreviewImage camera={camera} incidentId={incident.id} />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, oklch(0.3 0.08 ${250 + incident.conf}) 0%, oklch(0.07 0.03 270) 75%)`,
            }}
          />
        )}
        <div className="absolute inset-0 scanline pointer-events-none" />
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-destructive flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded">
          <span className="size-1.5 rounded-full bg-destructive pulse-dot" /> LIVE SNAPSHOT
        </span>
        <span className="absolute top-1.5 right-1.5 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
          {incident.cam}
        </span>
        <span className="absolute bottom-1.5 right-1.5 font-mono text-[9px] text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
          {incident.elapsed}
        </span>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition">
          <Eye className="size-5 text-white" />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <button
          id={`ack-btn-${incident.id}`}
          onClick={(e) => { e.stopPropagation(); onAck(); }}
          disabled={!isOpen}
          className={`text-[10px] rounded-lg border py-1.5 inline-flex items-center justify-center gap-1 font-medium transition
            ${isAcked
              ? "border-[oklch(0.7_0.18_155/0.5)] text-[oklch(0.78_0.18_155)] bg-[oklch(0.7_0.18_155/0.1)]"
              : "border-border/60 hover:bg-white/5 disabled:opacity-40"}`}
        >
          <Check className="size-2.5" />
          {isAcked ? "Acked" : "Ack"}
        </button>

        <button
          id={`assign-btn-${incident.id}`}
          onClick={(e) => { e.stopPropagation(); onAssign(); }}
          className={`text-[10px] rounded-lg border py-1.5 inline-flex items-center justify-center gap-1 font-medium transition
            ${assigned
              ? "border-[oklch(0.7_0.18_155/0.6)] bg-[oklch(0.7_0.18_155/0.15)] text-[oklch(0.78_0.18_155)]"
              : "border-border/60 hover:bg-white/5"}`}
        >
          {assigned ? <Check className="size-2.5" /> : <UserPlus className="size-2.5" />}
          {assigned ? "Assigned" : "Assign"}
        </button>

        <button
          id={`escalate-btn-${incident.id}`}
          onClick={(e) => { e.stopPropagation(); onEscalate(); }}
          disabled={isFalse}
          className={`text-[10px] rounded-lg py-1.5 inline-flex items-center justify-center gap-1 font-medium transition
            ${isEscalated
              ? "border border-destructive/60 bg-destructive/20 text-destructive"
              : "border border-destructive/40 text-destructive hover:bg-destructive/15 disabled:opacity-40"}`}
        >
          <ArrowUp className="size-2.5" />
          {isEscalated ? "↑ Esc'd" : "Escalate"}
        </button>

        <button
          id={`false-btn-${incident.id}`}
          onClick={(e) => { e.stopPropagation(); onFalse(); }}
          disabled={isFalse}
          className="text-[10px] rounded-lg border border-border/60 py-1.5 hover:bg-white/5 inline-flex items-center justify-center gap-1 text-muted-foreground transition disabled:opacity-40"
        >
          <X className="size-2.5" /> False+
        </button>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  activeFilter,
  setFilter,
  counts,
}: {
  activeFilter: string;
  setFilter: (f: string) => void;
  counts: Record<string, number>;
}) {
  const filters = [
    { key: "all", label: "All" },
    { key: "Critical", label: "Critical" },
    { key: "High", label: "High" },
    { key: "Medium", label: "Medium" },
    { key: "Low", label: "Low" },
    { key: "open", label: "Open" },
    { key: "acknowledged", label: "Acknowledged" },
    { key: "escalated", label: "Escalated" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => (
        <button
          key={f.key}
          id={`filter-${f.key}`}
          onClick={() => setFilter(f.key)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition
            ${activeFilter === f.key
              ? "border-primary bg-primary/20 text-primary"
              : "border-border/60 text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
        >
          {f.label}
          {counts[f.key] > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold
              ${f.key === "Critical" ? "bg-destructive/20 text-destructive" : "bg-white/10"}`}>
              {counts[f.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  incident,
  camera,
  assigned,
  onClose,
  onAck,
  onEscalate,
  onFalse,
  onAssign,
}: {
  incident: Incident;
  camera?: Camera;
  assigned?: { officer: typeof OFFICERS[0]; task: string; notes: string };
  onClose: () => void;
  onAck: () => void;
  onEscalate: () => void;
  onFalse: () => void;
  onAssign: () => void;
}) {
  const { sev, status } = incident;
  const isOpen = status === "open";

  const timeline = [
    { label: "Detected", time: incident.elapsed, done: true },
    { label: "Acknowledged", time: status !== "open" ? "Done" : "Pending", done: status !== "open" },
    { label: "Escalated", time: status === "escalated" ? "Done" : "—", done: status === "escalated" },
    { label: "Resolved", time: "—", done: false },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-border/60 bg-popover/98 backdrop-blur-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${sevDot[sev]} ${sev === "Critical" ? "pulse-dot" : ""}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${sevText[sev]}`}>{sev}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${sevBadge[sev]}`}>
                {incident.conf}% confidence
              </span>
            </div>
            <h2 className="text-2xl font-display font-bold mt-1">{incident.type}</h2>
            <div className="text-sm text-muted-foreground mt-0.5">
              {incident.id} · {incident.cam}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border/60 p-2 hover:bg-white/5 transition">
            <X className="size-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
          {incident.desc}
        </p>

        {/* People alert */}
        {incident.people !== undefined && incident.people >= 5 && (
          <div className={`rounded-xl p-4 border flex items-center gap-3
            ${incident.people > 30
              ? "bg-destructive/10 border-destructive/40"
              : "bg-[oklch(0.78_0.17_75/0.08)] border-[oklch(0.78_0.17_75/0.4)]"}`}
          >
            <Users className={`size-5 shrink-0 ${incident.people > 30 ? "text-destructive animate-bounce" : "text-[oklch(0.85_0.17_75)]"}`} />
            <div>
              <div className={`text-sm font-bold ${incident.people > 30 ? "text-destructive animate-pulse" : "text-[oklch(0.85_0.17_75)]"}`}>
                {crowdLabel(incident.people)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                {incident.people > 30
                  ? "Crowd density CRITICAL — siren protocol engaged automatically"
                  : "Crowd density elevated — monitoring threshold active"}
              </div>
            </div>
          </div>
        )}

        {/* Assignment Details */}
        {assigned && (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <span>👮 Patrol Unit Dispatched</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Assigned Officer</span>
                <span className="font-semibold text-foreground">{assigned.officer.name}</span>
                <span className="text-[10px] text-muted-foreground block">{assigned.officer.rank}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Badge / UID</span>
                <span className="font-mono font-semibold text-primary">{assigned.officer.uid}</span>
                <span className="text-[10px] text-muted-foreground block">ETA: {assigned.officer.eta} ({assigned.officer.distance})</span>
              </div>
            </div>
            <div className="text-xs pt-1.5 border-t border-white/5">
              <span className="text-muted-foreground block">Mission / Task</span>
              <span className="text-foreground font-medium">{assigned.task}</span>
            </div>
            {assigned.notes && (
              <div className="text-xs pt-1.5 border-t border-white/5">
                <span className="text-muted-foreground block">Dispatch Note</span>
                <span className="text-foreground italic font-mono">"{assigned.notes}"</span>
              </div>
            )}
          </div>
        )}

        {/* Camera preview */}
        <div className="aspect-video rounded-xl overflow-hidden border border-border/60 bg-[oklch(0.08_0.03_270)] relative">
          {camera ? (
            <CctvPlayer camera={camera} enableDetection={false} />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 40% 50%, oklch(0.3 0.1 ${250 + incident.conf}) 0%, oklch(0.07 0.03 270) 70%)` }}
              />
              <div className="absolute inset-0 scanline" />
              <span className="absolute top-2 left-2 text-[10px] font-bold text-destructive flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-destructive pulse-dot" /> LIVE SNAPSHOT · {incident.cam}
              </span>
              <span className="absolute bottom-2 right-2 font-mono text-[10px] bg-black/60 px-2 py-0.5 rounded">
                {incident.elapsed}
              </span>
            </>
          )}
        </div>

        {/* Timeline */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Response Timeline</div>
          <div className="flex items-center gap-0">
            {timeline.map((t, i) => (
              <div key={t.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`size-3 rounded-full border-2 transition
                    ${t.done ? "bg-primary border-primary" : "border-border/60 bg-transparent"}`} />
                  <div className="text-[9px] text-center mt-1 font-medium">{t.label}</div>
                  <div className="text-[8px] text-muted-foreground">{t.time}</div>
                </div>
                {i < timeline.length - 1 && (
                  <div className={`flex-1 h-px mb-5 ${t.done ? "bg-primary/60" : "bg-border/60"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id={`detail-ack-${incident.id}`}
            onClick={onAck}
            disabled={!isOpen}
            className="rounded-xl border border-border/60 px-4 py-2.5 text-sm font-medium hover:bg-white/5 disabled:opacity-40 inline-flex items-center justify-center gap-2 transition"
          >
            <Check className="size-4" /> Acknowledge
          </button>
          <button
            id={`detail-assign-${incident.id}`}
            onClick={onAssign}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium inline-flex items-center justify-center gap-2 transition
              ${assigned
                ? "border-[oklch(0.7_0.18_155/0.6)] bg-[oklch(0.7_0.18_155/0.15)] text-[oklch(0.78_0.18_155)]"
                : "border-border/60 hover:bg-white/5"}`}
          >
            {assigned ? <Check className="size-4" /> : <UserPlus className="size-4" />}
            {assigned ? "✓ Assigned" : "Assign Officer"}
          </button>
          <button
            id={`detail-escalate-${incident.id}`}
            onClick={onEscalate}
            disabled={incident.status === "false_positive"}
            className="rounded-xl bg-destructive/10 border border-destructive/50 text-destructive px-4 py-2.5 text-sm font-medium hover:bg-destructive/20 disabled:opacity-40 inline-flex items-center justify-center gap-2 transition"
          >
            <ArrowUp className="size-4" /> Escalate
          </button>
          <button
            id={`detail-false-${incident.id}`}
            onClick={onFalse}
            disabled={incident.status === "false_positive"}
            className="rounded-xl border border-border/60 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:border-destructive/40 disabled:opacity-40 inline-flex items-center justify-center gap-2 transition"
          >
            <X className="size-4" /> Mark False Positive
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

function Incidents() {
  const { data: dashboard } = useDashboard();
  const { data: cameras = [] } = useCameras();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();

  const [sound, setSound] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sirenIncident, setSirenIncident] = useState<Incident | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [newForm, setNewForm] = useState({
    title: "", desc: "", type: TYPES[0], sev: SEVS[0] as Sev,
  });

  const [assignments, setAssignments] = useState<Record<string, { officer: typeof OFFICERS[0]; task: string; notes: string }>>({})
  const [escalateSnapshot, setEscalateSnapshot] = useState<Incident | null>(null);

  // Auto-assign to the nearest available officer -- no modal, instant dispatch
  const handleAssignClick = (inc: Incident) => {
    if (!inc) return;
    const available = OFFICERS.filter((o) => o.status !== "Offline");
    const officer = available[0] ?? OFFICERS[0];
    const task = `Investigate ${inc.type} at ${inc.cam}`;
    setAssignments((prev) => ({
      ...prev,
      [inc.id]: { officer, task, notes: "" },
    }));
    toast.success("Auto-assigned!", {
      description: `${officer.name} (${officer.uid}) dispatched to ${inc.id} for: ${inc.type}`,
    });
  };

  // Track locally escalated alerts (since backend database uses 'acknowledged' mapping)
  const [escalatedIds, setEscalatedIds] = useState<Set<string>>(new Set());

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);

  // ── Siren audio ─────────────────────────────────────────────────────────

  const playSiren = useCallback((critical: boolean) => {
    if (!sound) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.4, ctx.currentTime);
      master.connect(ctx.destination);

      const createTone = (freq: number, delay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        if (critical) {
          osc.frequency.linearRampToValueAtTime(freq * 1.6, ctx.currentTime + delay + 0.4);
          osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + delay + 0.8);
        } else {
          osc.frequency.linearRampToValueAtTime(freq * 1.3, ctx.currentTime + delay + 0.6);
          osc.frequency.linearRampToValueAtTime(freq, ctx.currentTime + delay + 1.2);
        }
        gain.gain.setValueAtTime(0.7, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.7, ctx.currentTime + delay + 0.9);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 1.2);
        osc.connect(gain);
        gain.connect(master);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 1.2);
        sirenNodesRef.current.push({ osc, gain });
      };

      if (critical) {
        // Three-blast critical siren
        createTone(880, 0);
        createTone(880, 0.4);
        createTone(1200, 0.8);
      } else {
        // Double-tone medium alert
        createTone(660, 0);
        createTone(880, 0.6);
      }
    } catch (e) {
      console.warn("Audio context error:", e);
    }
  }, [sound]);

  const stopSiren = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
    sirenNodesRef.current = [];
  }, []);

  // ── Map DB Alerts to Incidents ──────────────────────────────────────────

  const mappedIncidents: Incident[] = alerts.map((a) => {
    const sevMap: Record<string, Sev> = {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    };

    const statusMap: Record<string, IncidentStatus> = {
      open: "open",
      acknowledged: "acknowledged",
      resolved: "acknowledged",
      closed: "false_positive",
    };

    // Extract crowd headcount if present in description or title
    let people = 0;
    const match = a.description?.match(/detected (\d+) people/) || a.title.match(/(\d+) persons/);
    if (match) {
      people = parseInt(match[1]);
    }

    const id = `A-${a.id}`;
    let status = statusMap[a.status] ?? "open";
    if (escalatedIds.has(id) && status !== "open") {
      status = "escalated";
    }

    return {
      id,
      camera_id: a.camera_id,
      type: a.type,
      cam: a.camera_name ?? "Unknown Camera",
      zone: a.description?.includes("zone") ? "Monitored Zone" : "Live Feed",
      conf: a.confidence ?? 85,
      sev: sevMap[a.severity] ?? "Medium",
      elapsed: a.age || "just now",
      elapsedSec: 0,
      status,
      people: people || undefined,
      desc: a.description ?? "",
    };
  });

  // ── Auto-trigger siren overlay for active open critical alerts ────────────

  const [activeSirenAlertId, setActiveSirenAlertId] = useState<string | null>(null);

  useEffect(() => {
    const criticalOpenAlert = mappedIncidents.find(
      (inc) => inc.sev === "Critical" && inc.status === "open"
    );

    if (criticalOpenAlert) {
      if (activeSirenAlertId !== criticalOpenAlert.id) {
        setActiveSirenAlertId(criticalOpenAlert.id);
        setSirenIncident(criticalOpenAlert);
        playSiren(true);
      }
    } else {
      if (activeSirenAlertId) {
        setActiveSirenAlertId(null);
        setSirenIncident(null);
        stopSiren();
      }
    }
  }, [mappedIncidents, activeSirenAlertId, playSiren, stopSiren]);

  // ── Mutations & Actions ──────────────────────────────────────────────────

  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();
  const createAlert = useCreateAlert();

  const handleAck = (inc: Incident) => {
    const alertId = parseInt(inc.id.replace("A-", ""));
    if (isNaN(alertId)) return;
    updateAlert.mutate({ id: alertId, status: "acknowledged" }, {
      onSuccess: () => {
        toast.success(`✓ Incident ${inc.id} acknowledged`);
        if (selectedIncident?.id === inc.id) {
          setSelectedIncident(prev => prev ? { ...prev, status: "acknowledged" } : null);
        }
      }
    });
  };

  const handleAssign = (inc: Incident) => {
    handleAssignClick(inc);
  };

  const handleEscalate = (inc: Incident) => {
    const alertId = parseInt(inc.id.replace("A-", ""));
    if (isNaN(alertId)) return;
    // Show snapshot immediately on escalate
    setEscalateSnapshot(inc);
    updateAlert.mutate({ id: alertId, status: "acknowledged" }, {
      onSuccess: () => {
        setEscalatedIds(prev => new Set(prev).add(inc.id));
        toast.error(`↑ Incident ${inc.id} escalated`, { description: inc.type });

        if (inc.sev === "Critical") {
          playSiren(true);
          setSirenIncident(inc);
        }

        window.dispatchEvent(new CustomEvent("trigger-critical-alert", {
          detail: { id: inc.id, cam: inc.cam, title: inc.type },
        }));

        if (selectedIncident?.id === inc.id) {
          setSelectedIncident(prev => prev ? { ...prev, status: "escalated" } : null);
        }
      }
    });
  };

  const handleFalse = (inc: Incident) => {
    const alertId = parseInt(inc.id.replace("A-", ""));
    if (isNaN(alertId)) return;
    deleteAlert.mutate(alertId, {
      onSuccess: () => {
        toast.success(`✕ Incident ${inc.id} marked as false positive (deleted from database)`);
        if (selectedIncident?.id === inc.id) {
          setSelectedIncident(null);
        }
      }
    });
  };

  const handleBulkAck = () => {
    const openIncidents = mappedIncidents.filter(a => a.status === "open");
    if (openIncidents.length === 0) {
      toast.info("No open incidents to acknowledge");
      return;
    }
    openIncidents.forEach(inc => {
      const alertId = parseInt(inc.id.replace("A-", ""));
      if (!isNaN(alertId)) {
        updateAlert.mutate({ id: alertId, status: "acknowledged" });
      }
    });
    toast.success("Bulk acknowledgment request sent");
  };

  const handleDismissSiren = () => {
    setSirenIncident(null);
    stopSiren();
    if (sirenIncident) {
      handleAck(sirenIncident);
    }
  };

  const handleCreateIncident = () => {
    if (!newForm.title.trim()) { toast.error("Incident title is required"); return; }
    createAlert.mutate({
      title: newForm.title,
      type: newForm.type,
      severity: newForm.sev.toLowerCase() as any,
      status: "open",
      confidence: 85,
      description: newForm.desc || DESCS[newForm.type],
    }, {
      onSuccess: () => {
        toast.success(`Incident created in database`);
        setCreateOpen(false);
        setNewForm({ title: "", desc: "", type: TYPES[0], sev: "Low" });
      }
    });
  };

  // ── Filtered incidents ───────────────────────────────────────────────────

  const filtered = mappedIncidents.filter((inc) => {
    if (activeFilter === "all") return inc.status !== "false_positive";
    if (activeFilter === "open") return inc.status === "open";
    if (activeFilter === "acknowledged") return inc.status === "acknowledged";
    if (activeFilter === "escalated") return inc.status === "escalated";
    return inc.sev === activeFilter && inc.status !== "false_positive";
  });

  const filterCounts: Record<string, number> = {
    all: mappedIncidents.filter((i) => i.status !== "false_positive").length,
    Critical: mappedIncidents.filter((i) => i.sev === "Critical" && i.status !== "false_positive").length,
    High: mappedIncidents.filter((i) => i.sev === "High" && i.status !== "false_positive").length,
    Medium: mappedIncidents.filter((i) => i.sev === "Medium" && i.status !== "false_positive").length,
    Low: mappedIncidents.filter((i) => i.sev === "Low" && i.status !== "false_positive").length,
    open: mappedIncidents.filter((i) => i.status === "open").length,
    acknowledged: mappedIncidents.filter((i) => i.status === "acknowledged").length,
    escalated: mappedIncidents.filter((i) => i.status === "escalated").length,
  };

  const criticalCount = filterCounts["Critical"];
  const openCount = filterCounts["open"];

  if (alertsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] flex-col gap-2">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-mono">Syncing database incidents...</span>
      </div>
    );
  }

  return (
    <>
      {/* Siren overlay */}
      {sirenIncident && (
        <SirenOverlay incident={sirenIncident} onDismiss={handleDismissSiren} />
      )}

      {/* Incident detail panel */}
      {selectedIncident && (
        <DetailPanel
          incident={selectedIncident}
          camera={cameras.find(c => c.id === selectedIncident.camera_id)}
          assigned={assignments[selectedIncident.id]}
          onClose={() => setSelectedIncident(null)}
          onAck={() => { handleAck(selectedIncident); setSelectedIncident(null); }}
          onEscalate={() => { handleEscalate(selectedIncident); setSelectedIncident(null); }}
          onFalse={() => { handleFalse(selectedIncident); setSelectedIncident(null); }}
          onAssign={() => { handleAssignClick(selectedIncident); setSelectedIncident(null); }}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              <h1 className="text-2xl font-display font-semibold tracking-tight">Crime Prevention &amp; Incidents</h1>
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-destructive/50 bg-destructive/15 text-destructive animate-pulse">
                  <Radio className="size-2.5" /> {criticalCount} Critical
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {openCount} open · {mappedIncidents.length} total ·{" "}
              <span className="text-[oklch(0.78_0.18_155)]">streaming live from database</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="toggle-sound-btn"
              onClick={() => { setSound((s) => !s); toast.info(`Audio alerts ${!sound ? "ON" : "OFF"}`); }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition
                ${sound ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:bg-white/5"}`}
            >
              {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              Sound {sound ? "ON" : "OFF"}
            </button>

            <button
              id="filter-toggle-btn"
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5 transition"
            >
              <Filter className="size-3.5" /> Filter <ChevronDown className={`size-3 transition ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            <button
              id="bulk-ack-btn"
              onClick={handleBulkAck}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-white/5 transition"
            >
              <Check className="size-3.5" /> Bulk Ack
            </button>

            <button
              id="create-incident-btn"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-glow transition"
            >
              <Plus className="size-3.5" /> Create Incident
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open", value: filterCounts.open, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
            { label: "Critical", value: filterCounts.Critical, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
            { label: "Escalated", value: filterCounts.escalated, color: "text-[oklch(0.85_0.17_75)]", bg: "bg-[oklch(0.78_0.17_75/0.1)] border-[oklch(0.78_0.17_75/0.3)]" },
            { label: "Acknowledged", value: filterCounts.acknowledged, color: "text-[oklch(0.78_0.18_155)]", bg: "bg-[oklch(0.7_0.18_155/0.1)] border-[oklch(0.7_0.18_155/0.3)]" },
          ].map((s) => (
            <div key={s.label} className={`glass rounded-xl p-4 border ${s.bg}`}>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className={`text-3xl font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Crowd threshold info bar */}
        <div className="rounded-xl border border-border/40 bg-white/[0.02] p-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4 text-primary" />
            Crowd Threshold Monitoring
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive pulse-dot" />
            <span className="text-muted-foreground">
              <span className="text-destructive font-bold">Critical:</span> &gt;30 persons → Siren engaged
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[oklch(0.78_0.17_75)]" />
            <span className="text-muted-foreground">
              <span className="text-[oklch(0.85_0.17_75)] font-bold">High:</span> 10–30 persons → Monitoring escalated
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">
              <span className="text-primary font-bold">Medium:</span> 5–10 persons → Alert raised
            </span>
          </div>
        </div>

        {/* Filter bar */}
        {filterOpen && (
          <div className="glass rounded-xl p-3 animate-in slide-in-from-top-2">
            <FilterBar activeFilter={activeFilter} setFilter={setActiveFilter} counts={filterCounts} />
          </div>
        )}

        {/* Incident grid */}
        {filtered.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center space-y-2">
            <CheckCircle2 className="size-10 text-[oklch(0.7_0.18_155)] mx-auto" />
            <div className="text-base font-semibold">No incidents — all clear</div>
            <div className="text-sm text-muted-foreground font-mono">Only real-time database-persisted events appear here</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((inc) => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                camera={cameras.find((c) => c.id === inc.camera_id)}
                assigned={assignments[inc.id]}
                onAck={() => handleAck(inc)}
                onAssign={() => handleAssignClick(inc)}
                onEscalate={() => handleEscalate(inc)}
                onFalse={() => handleFalse(inc)}
                onSelect={() => setSelectedIncident(inc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Incident Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border/60 bg-popover/98 backdrop-blur-2xl p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg">Create Incident</h2>
              <button onClick={() => setCreateOpen(false)} className="rounded-lg border border-border/60 p-1.5 hover:bg-white/5">
                <X className="size-4" />
              </button>
            </div>

            <input
              id="new-incident-title"
              className="w-full rounded-xl border border-border/60 bg-input/60 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-mono"
              placeholder="Incident title *"
              value={newForm.title}
              onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
            />
            <textarea
              id="new-incident-desc"
              rows={3}
              className="w-full rounded-xl border border-border/60 bg-input/60 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none font-mono"
              placeholder="Description (optional)"
              value={newForm.desc}
              onChange={(e) => setNewForm({ ...newForm, desc: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
                <select
                  id="new-incident-type"
                  className="w-full rounded-xl border border-border/60 bg-input/60 px-3 py-2.5 text-sm"
                  value={newForm.type}
                  onChange={(e) => setNewForm({ ...newForm, type: e.target.value })}
                >
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Severity</label>
                <select
                  id="new-incident-sev"
                  className="w-full rounded-xl border border-border/60 bg-input/60 px-3 py-2.5 text-sm"
                  value={newForm.sev}
                  onChange={(e) => setNewForm({ ...newForm, sev: e.target.value as Sev })}
                >
                  {SEVS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {newForm.sev === "Critical" && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <Siren className="size-4 shrink-0 animate-bounce" />
                Creating a Critical incident will trigger the siren alert system
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                id="confirm-create-incident"
                onClick={handleCreateIncident}
                className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 font-medium transition shadow-lg"
              >
                Create Incident
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Escalate Snapshot Overlay */}
      {escalateSnapshot && (() => {
        const snapCam = cameras.find(c => c.id === escalateSnapshot.camera_id);
        const snapAssigned = assignments[escalateSnapshot.id];
        return (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setEscalateSnapshot(null)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-destructive/50 bg-[oklch(0.08_0.03_270)]/95 backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl"
              style={{ boxShadow: "0 0 60px oklch(0.62 0.24 25 / 0.35)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-destructive/30 bg-destructive/10">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-bold text-destructive uppercase tracking-widest">↑ ESCALATED — INCIDENT SNAPSHOT</span>
                </div>
                <button
                  onClick={() => setEscalateSnapshot(null)}
                  className="rounded-lg border border-border/60 p-1.5 hover:bg-white/10 transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Incident meta */}
              <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-4">
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${sevText[escalateSnapshot.sev]}`}>
                    {escalateSnapshot.sev} SEVERITY · {escalateSnapshot.id}
                  </div>
                  <div className="text-xl font-display font-bold text-foreground">{escalateSnapshot.type}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {escalateSnapshot.cam} · {escalateSnapshot.zone} · {escalateSnapshot.elapsed}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground uppercase">Confidence</div>
                  <div className="text-2xl font-mono font-bold text-foreground">{escalateSnapshot.conf}%</div>
                </div>
              </div>

              {/* Live camera snapshot */}
              <div className="mx-5 rounded-xl overflow-hidden border border-border/60 relative aspect-video bg-black">
                {snapCam ? (
                  <CctvPlayer camera={snapCam} enableDetection={false} />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(circle at 50% 50%, oklch(0.3 0.1 ${250 + escalateSnapshot.conf}) 0%, oklch(0.07 0.03 270) 70%)` }}
                  />
                )}
                <div className="absolute inset-0 scanline pointer-events-none" />
                {/* Timestamp watermark */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-white/80">
                  <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
                  ESCALATED · {new Date().toLocaleTimeString()}
                </div>
                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-destructive font-bold flex items-center gap-1">
                  ↑ LIVE ESCALATION FEED · {escalateSnapshot.cam}
                </div>
              </div>

              {/* Description + Assignment */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-destructive/40 pl-3">
                  {escalateSnapshot.desc || `${escalateSnapshot.type} detected at ${escalateSnapshot.cam}. Immediate response escalated.`}
                </p>

                {snapAssigned ? (
                  <div className="rounded-xl border border-[oklch(0.7_0.18_155/0.4)] bg-[oklch(0.7_0.18_155/0.08)] p-3 flex items-center gap-3 text-xs">
                    <span className="text-[oklch(0.78_0.18_155)] text-base">👮</span>
                    <div>
                      <div className="font-semibold text-[oklch(0.78_0.18_155)]">Officer Dispatched: {snapAssigned.officer.name} ({snapAssigned.officer.uid})</div>
                      <div className="text-muted-foreground font-mono">{snapAssigned.officer.rank} · ETA {snapAssigned.officer.eta} · {snapAssigned.officer.distance}</div>
                      <div className="text-foreground mt-0.5">Task: {snapAssigned.task}</div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/40 bg-white/[0.02] p-3 text-xs text-muted-foreground font-mono">
                    ⚠ No officer assigned yet. Click "Assign" on the incident card to dispatch.
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setEscalateSnapshot(null)}
                    className="rounded-xl border border-border/60 px-4 py-2 text-sm hover:bg-white/5 transition"
                  >
                    Close Snapshot
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </>
  );
}
