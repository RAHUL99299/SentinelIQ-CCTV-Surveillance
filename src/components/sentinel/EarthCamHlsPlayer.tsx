import { useEffect, useRef, useState } from "react";
import { resolveEarthCamHls } from "@/lib/ai";

type Props = {
  pageUrl: string;
  className?: string;
  onError?: () => void;
  onReady?: () => void;
};

/**
 * Plays the real EarthCam live HLS for one location (not the generic embed widget).
 * Requires ai-service running to resolve the page URL → HLS playlist.
 */
export function EarthCamHlsPlayer({ pageUrl, className, onError, onReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    async function start() {
      const hlsUrl = await resolveEarthCamHls(pageUrl);
      if (cancelled) return;

      if (!hlsUrl) {
        setStatus("error");
        onError?.();
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const cleanup = () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      };

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.addEventListener("loadeddata", () => {
          if (!cancelled) {
            setStatus("playing");
            onReady?.();
          }
        }, { once: true });
        video.play().catch(() => {
          if (!cancelled) {
            setStatus("error");
            onError?.();
          }
        });
        return cleanup;
      }

      const { default: Hls } = await import("hls.js");
      if (cancelled) return;

      if (!Hls.isSupported()) {
        setStatus("error");
        onError?.();
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 12,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        video.play().catch(() => {});
        setStatus("playing");
        onReady?.();
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && !cancelled) {
          setStatus("error");
          onError?.();
        }
      });

      return cleanup;
    }

    const cleanupPromise = start();

    return () => {
      cancelled = true;
      cleanupPromise?.then((fn) => fn?.());
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [pageUrl, onError, onReady]);

  return (
    <>
      {status === "loading" && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/80 text-xs text-muted-foreground">
          Connecting to live camera…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/90 text-center p-3 text-xs text-muted-foreground gap-1">
          <span>Could not load live stream</span>
          <span className="text-[10px]">Run: cd ai-service &amp;&amp; python app.py</span>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={className}
      />
    </>
  );
}
