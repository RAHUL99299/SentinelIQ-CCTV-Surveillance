import { useEffect, useState } from "react";
import { AI_FLASK_URL, liveMjpegUrl } from "@/lib/ai";

type Props = {
  pageUrl: string;
  className?: string;
};

/**
 * Live EarthCam via Laravel → Flask MJPEG (/api/ai/video-feed).
 * Direct Flask URL as backup if Laravel proxy is unavailable.
 */
export function EarthCamLivePlayer({ pageUrl, className }: Props) {
  const [src, setSrc] = useState(() => liveMjpegUrl(pageUrl, true));
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    setSrc(liveMjpegUrl(pageUrl, true));
    setStatus("loading");
  }, [pageUrl]);

  const onError = () => {
    const direct = `${AI_FLASK_URL}/video_feed_lite?source=${encodeURIComponent(pageUrl)}`;
    if (src.includes("/api/ai/")) {
      setSrc(direct);
      setStatus("loading");
      return;
    }
    setStatus("error");
  };

  return (
    <>
      {status === "loading" && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/80 text-xs text-muted-foreground gap-1 px-3 text-center">
          <span>Connecting to live camera…</span>
          <span className="text-[10px] opacity-80">First frame can take up to 60 seconds.</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black/90 text-center p-3 text-xs text-muted-foreground gap-1">
          <span>Could not load live stream</span>
          <span className="text-[10px]">
            Run in a terminal:{" "}
            <code className="font-mono">cd ai-service &amp;&amp; python app.py</code>
            <br />
            And: <code className="font-mono">cd api &amp;&amp; php artisan serve</code>
          </span>
        </div>
      )}
      {status !== "error" && (
        <img
          src={src}
          alt="Live EarthCam feed"
          className={className}
          onLoad={() => setStatus("playing")}
          onError={onError}
        />
      )}
    </>
  );
}
