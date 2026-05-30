import { useEffect, useRef, useState } from "react";
import {
  fetchDetection,
  liveVideoFeedUrl,
  type DetectionResult,
} from "@/lib/ai";
import { EarthCamLivePlayer } from "@/components/sentinel/EarthCamLivePlayer";
import { aiStreamSource, isEarthCamCamera } from "@/lib/liveFeeds";
import type { Camera } from "@/lib/api";

type Props = {
  camera: Camera;
  /** Live MJPEG + YOLO boxes (expand / single-camera view) */
  enableDetection?: boolean;
  compact?: boolean;
  fullscreen?: boolean;
  /** Called every second with the exact person count matching the bounding boxes */
  onCountChange?: (count: number) => void;
  onCountsChange?: (people: number, vehicles: number) => void;
};

/**
 * EarthCam: unique HLS per camera (your links). Expand view: AI MJPEG with person boxes.
 */
export function CctvPlayer({
  camera,
  enableDetection = false,
  compact = false,
  fullscreen = false,
  onCountChange,
  onCountsChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [detectionData, setDetectionData] = useState<DetectionResult | null>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);

  const earthcam = isEarthCamCamera(camera);
  const aiSource = aiStreamSource(camera);
  const earthcamPage = camera.url ?? "";

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.status === "ok") {
          setAiOnline(true);
        } else {
          setAiOnline(false);
        }
      })
      .catch(() => {
        setAiOnline(false);
      });
  }, []);

  const useLiveMjpeg = enableDetection && earthcam && !!aiSource && !loadError && aiOnline !== false;

  // Poll /api/stats every 800ms while live MJPEG is active → keep parent counts in sync
  useEffect(() => {
    if (!useLiveMjpeg || !aiSource) return;
    if (!onCountChange && !onCountsChange) return;
    const statsUrl = `http://127.0.0.1:5000/api/stats?source=${encodeURIComponent(aiSource)}`;
    const poll = () => {
      fetch(statsUrl)
        .then((r) => r.json())
        .then((d) => {
          const people = typeof d?.crowd_count === "number" ? d.crowd_count : 0;
          const vehicles = typeof d?.vehicle_count === "number" ? d.vehicle_count : 0;
          if (onCountsChange) {
            onCountsChange(people, vehicles);
          }
          if (onCountChange) {
            onCountChange(people);
          }
        })
        .catch(() => {/* ignore transient failures */});
    };
    poll(); // immediate first call
    const id = setInterval(poll, 800);
    return () => clearInterval(id);
  }, [useLiveMjpeg, onCountChange, onCountsChange, aiSource]);

  useEffect(() => {
    if (!enableDetection || !aiSource || useLiveMjpeg) {
      setDetectionData(null);
      return;
    }
    let cancelled = false;
    fetchDetection(aiSource, { mode: "full" }).then((data) => {
      if (!cancelled && data) setDetectionData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [enableDetection, aiSource, useLiveMjpeg]);

  useEffect(() => {
    if (useLiveMjpeg || earthcam) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const crowd = camera.crowd_count ?? 0;
    let frame = 0;
    const drawEvery = compact ? 4 : 2;

    let raf: number;
    const draw = () => {
      frame++;
      if (frame % drawEvery !== 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (loadError || !camera.embed_url) {
        ctx.fillStyle = "#040a0d";
        ctx.fillRect(0, 0, W, H);
      }

      if (detectionData?.frames && detectionData.frames.length > 0) {
        let frameIdx = Math.floor(frame / 12) % detectionData.frames.length;
        if (videoRef.current?.duration) {
          const progress = videoRef.current.currentTime / videoRef.current.duration;
          frameIdx = Math.floor(progress * detectionData.frames.length) % detectionData.frames.length;
        }
        const currentBoxes = detectionData.frames[frameIdx] ?? [];
        currentBoxes.forEach((box) => {
          const bx = box.x * W;
          const by = box.y * H;
          const bw = box.w * W;
          const bh = box.h * H;
          ctx.strokeStyle =
            box.label === "Person"
              ? "rgba(59, 130, 246, 0.85)"
              : "rgba(239, 68, 68, 0.85)"; // Red outline for vehicles
          ctx.lineWidth = compact ? 1 : 1.5;
          ctx.strokeRect(bx, by, bw, bh);
        });
      }

      const displayPeople = detectionData?.people_count ?? crowd;
      const displayVehicles =
        detectionData?.vehicle_count ?? Math.max(0, Math.ceil(crowd / 300));

      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.fillRect(12, 12, W * 0.48, compact ? 22 : 30);
      ctx.fillStyle = "#10b981";
      ctx.font = `bold ${compact ? 8 : Math.max(9, W * 0.015)}px monospace`;
      ctx.fillText(
        `PEOPLE: ${displayPeople} | VEH: ${displayVehicles}`,
        18,
        compact ? 26 : 31
      );

      const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
      ctx.font = `${compact ? 8 : Math.max(10, W * 0.016)}px monospace`;
      const tsW = ctx.measureText(ts).width;
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.fillRect(W - tsW - 20, 12, tsW + 12, compact ? 20 : 26);
      ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
      ctx.fillText(ts, W - tsW - 14, compact ? 25 : 29);

      if (!compact && frame % 60 < 30) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.beginPath();
        ctx.arc(W - 18, H - 18, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = `bold ${Math.max(8, W * 0.013)}px monospace`;
        ctx.fillText("REC", W - 46, H - 14);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [camera.crowd_count, loadError, camera.embed_url, detectionData, compact, useLiveMjpeg, earthcam]);

  const minH = fullscreen ? "calc(100vh - 80px)" : compact ? "140px" : "220px";
  const isMp4 =
    !earthcam &&
    (camera.embed_url?.endsWith(".mp4") || camera.embed_url?.includes(".mp4?"));
  const canvasW = compact ? 400 : fullscreen ? 900 : 800;
  const canvasH = compact ? 225 : fullscreen ? 506 : 450;

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center"
      style={{ minHeight: minH }}
    >
      {useLiveMjpeg ? (
        <img
          src={liveVideoFeedUrl(camera)}
          alt={`${camera.name} live AI feed`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            if (aiOnline === (false as any)) {
              setLoadError(true);
            }
          }}
        />
      ) : earthcam && earthcamPage ? (
        <EarthCamLivePlayer
          pageUrl={earthcamPage}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : camera.embed_url && !loadError ? (
        isMp4 ? (
          <video
            ref={videoRef}
            src={camera.embed_url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setLoadError(true)}
          />
        ) : (
          <video
            ref={videoRef}
            src={camera.embed_url}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setLoadError(true)}
          />
        )
      ) : (
        <div className="text-center text-xs text-muted-foreground z-10 p-4 space-y-2">
          <p>No live stream available</p>
          {earthcam && (
            <p className="text-[10px]">
              Start AI service: <code className="font-mono">cd ai-service &amp;&amp; python app.py</code>
            </p>
          )}
        </div>
      )}

      {!useLiveMjpeg && !earthcam && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
          width={canvasW}
          height={canvasH}
        />
      )}

      {earthcam && !loadError && (
        <>
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <span className="text-[9px] font-bold uppercase tracking-wide bg-destructive/90 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="absolute bottom-2 left-2 z-20 pointer-events-none max-w-[85%]">
            <span className="text-[9px] font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded truncate block">
              {camera.name}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
