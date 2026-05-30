import type { Camera } from "@/lib/api";
import { aiStreamSource, isEarthCamCamera } from "@/lib/liveFeeds";

/** Same host as Laravel API — proxies to Flask (see AiStreamController). */
const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";
export const AI_SERVICE_URL = `${API_BASE}/ai`;

/** Flask direct URL for detect/resolve JSON (Laravel does not proxy these yet). */
export const AI_FLASK_URL =
  import.meta.env.VITE_AI_SERVICE_URL ?? "http://127.0.0.1:5000";

/** Live MJPEG with YOLO (EarthCam expand view). */
export function liveVideoFeedUrl(camera: Camera): string {
  const src = aiStreamSource(camera);
  return liveMjpegUrl(src, false);
}

/** MJPEG via Flask directly (bypassing Laravel to prevent single-threaded PHP blocking). */
export function liveMjpegUrl(pageUrl: string, lite = false): string {
  const path = lite ? "video_feed_lite" : "video_feed";
  return `${AI_FLASK_URL}/${path}?source=${encodeURIComponent(pageUrl)}`;
}

export function livePreviewUrl(pageUrl: string, cacheBust = 0): string {
  const q = new URLSearchParams({ source: pageUrl, _: String(cacheBust) });
  return `${AI_FLASK_URL}/api/live_preview?${q}`;
}

export { aiStreamSource, isEarthCamCamera };

export type DetectionBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  conf: number;
};

export type DetectionResult = {
  status: string;
  people_count: number;
  vehicle_count: number;
  frames?: DetectionBox[][];
  representative_frame?: DetectionBox[];
};

export async function resolveEarthCamHls(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${AI_FLASK_URL}/api/resolve_source?source=${encodeURIComponent(pageUrl)}`
    );
    const data = await res.json();
    return data.hls_url ?? data.earthcam_hls_url ?? null;
  } catch {
    return null;
  }
}

export async function fetchDetection(
  source: string,
  options?: { mode?: "counts" | "full" }
): Promise<DetectionResult | null> {
  const params = new URLSearchParams({ source });
  if (options?.mode) params.set("mode", options.mode);

  try {
    const res = await fetch(`${AI_FLASK_URL}/api/detect?${params}`);
    const data = await res.json();
    if (data.status === "success") return data as DetectionResult;
  } catch {
    /* AI service offline */
  }
  return null;
}
