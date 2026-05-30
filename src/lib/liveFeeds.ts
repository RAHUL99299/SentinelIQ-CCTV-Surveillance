/**
 * Four real-time EarthCam CCTV feeds (live HLS).
 * `url` = EarthCam page for AI + HLS resolve. `embed_url` = open in browser link.
 */
import type { Camera } from "@/lib/api";

export const LIVE_FEED_COUNT = 4;

export const LIVE_SURVEILLANCE_FEEDS: Array<{
  name: string;
  location: string;
  zone: string;
  embed_url: string;
  url: string;
  stream_type: Camera["stream_type"];
  ptz: boolean;
  purpose: string;
}> = [
  {
    name: "Idyllwild — Live",
    location: "Idyllwild, California, USA",
    zone: "Crowd Management",
    embed_url: "https://www.earthcam.com/usa/california/idyllwild/?cam=idyllwild",
    url: "https://www.earthcam.com/usa/california/idyllwild/?cam=idyllwild",
    stream_type: "earthcam",
    ptz: false,
    purpose: "Downtown and events · crowd monitoring",
  },
  {
    name: "Downtown Mystic — Live",
    location: "Mystic, Connecticut, USA",
    zone: "Crime Prevention",
    embed_url: "https://www.earthcam.com/usa/connecticut/mystic/?cam=mystic_ct",
    url: "https://www.earthcam.com/usa/connecticut/mystic/?cam=mystic_ct",
    stream_type: "earthcam",
    ptz: false,
    purpose: "Coastal downtown surveillance · incident detection",
  },
  {
    name: "Anglin's Square — Live",
    location: "Lauderdale-by-the-Sea, Florida, USA",
    zone: "Crowd Management",
    embed_url: "https://www.earthcam.com/usa/florida/lauderdalebythesea/town/?cam=lbts_town",
    url: "https://www.earthcam.com/usa/florida/lauderdalebythesea/town/?cam=lbts_town",
    stream_type: "earthcam",
    ptz: false,
    purpose: "Beach and pier · high foot-traffic monitoring",
  },
  {
    name: "Hyden Main Street — Live",
    location: "Hyden, Kentucky, USA",
    zone: "Crime Prevention",
    embed_url: "https://www.earthcam.com/usa/kentucky/hyden/?cam=hyden",
    url: "https://www.earthcam.com/usa/kentucky/hyden/?cam=hyden",
    stream_type: "earthcam",
    ptz: true,
    purpose: "Downtown main street · crime prevention and safety",
  },
];

export function aiStreamSource(camera: Camera): string {
  if (camera.stream_type === "earthcam") {
    return camera.url || camera.embed_url || "";
  }
  return camera.embed_url || camera.url || "";
}

export function isEarthCamCamera(camera: Camera): boolean {
  return camera.stream_type === "earthcam";
}
